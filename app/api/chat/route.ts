import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  detectPromptInjection,
  findBestOutdoorWindows,
  getAqiBand,
  sanitizeUserText,
} from '@/lib/air-quality';
import {
  AIRWISE_GEMINI_MODEL,
  CHAT_ASSISTANT_SYSTEM_PROMPT,
  getGeminiClient,
} from '@/lib/genai-prompts';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import type { AirQualitySnapshot, HouseholdProfile, LanguageCode } from '@/lib/types';

const chatRequestSchema = z.object({
  message: z.string().min(1).max(600),
  language: z.enum(['en', 'hi']).default('en'),
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().max(1000),
      })
    )
    .max(8)
    .default([]),
  snapshot: z.object({
    locationName: z.string().max(100),
    aqi: z.number().min(0).max(999),
    pm25: z.number().min(0).max(2000),
    pm10: z.number().min(0).max(3000),
    no2: z.number().min(0).max(1000),
    o3: z.number().min(0).max(1000),
    co: z.number().min(0).max(100),
    temperatureC: z.number(),
    humidityPct: z.number(),
    windKmh: z.number(),
    inversionRisk: z.enum(['low', 'moderate', 'high']),
    hourly: z
      .array(
        z.object({
          timeIso: z.string(),
          hourLabel: z.string(),
          aqi: z.number(),
          pm25: z.number(),
          pm10: z.number(),
          temperatureC: z.number(),
          humidityPct: z.number(),
          windKmh: z.number(),
        })
      )
      .max(48),
  }),
  profile: z.object({
    hasChildren: z.boolean(),
    hasElderly: z.boolean(),
    hasPregnant: z.boolean(),
    hasAsthmaOrRespiratory: z.boolean(),
    hasHeartCondition: z.boolean(),
    commuteMode: z.string(),
    hasAirPurifier: z.boolean(),
    maskTypes: z.array(z.string()).max(6),
    ventilationType: z.string(),
    cookingFuel: z.string(),
    budgetLevel: z.string(),
  }),
});

function buildRuleFallbackAnswer(
  question: string,
  snapshot: Pick<AirQualitySnapshot, 'locationName' | 'aqi' | 'pm25' | 'windKmh' | 'humidityPct' | 'hourly'>,
  profile: Pick<HouseholdProfile, 'hasChildren' | 'hasElderly' | 'hasAsthmaOrRespiratory' | 'hasAirPurifier'>,
  language: LanguageCode
): string {
  const q = question.toLowerCase();
  const band = getAqiBand(snapshot.aqi);
  const windows = findBestOutdoorWindows(snapshot.hourly);
  const isHi = language === 'hi';

  if (q.includes('window') || q.includes('ventilat') || q.includes('खिड़क')) {
    if (snapshot.aqi > 150) {
      return isHi
        ? `${snapshot.locationName} में अभी AQI ${snapshot.aqi} (${band.labelHi}) और PM2.5 ${snapshot.pm25} µg/m³ है। अभी खिड़कियाँ बंद रखना बेहतर है। ${windows.bestWindowText} के बीच केवल 10 मिनट के लिए हल्का वेंटिलेशन करें। यह सामान्य मार्गदर्शन है, चिकित्सा सलाह नहीं—लक्षण होने पर डॉक्टर से मिलें।`
        : `Right now in ${snapshot.locationName}, AQI is ${snapshot.aqi} (${band.labelEn}, PM2.5 ${snapshot.pm25} µg/m³). Keep windows closed for now so winter smog does not build up indoors. Your cleanest brief 10-minute ventilation window is ${windows.bestWindowText}. Why this matters: sealing gaps during peaks cuts indoor PM2.5 infiltration by ~25–40% (approximate, assuming closed doors). General guidance only—consult a doctor for respiratory symptoms.`;
    }
    return isHi
      ? `अभी AQI ${snapshot.aqi} (${band.labelHi}) है, इसलिए 15–20 मिनट क्रॉस-वेंटिलेशन सुरक्षित है। यह सामान्य मार्गदर्शन है, चिकित्सा सलाह नहीं।`
      : `Current AQI in ${snapshot.locationName} is ${snapshot.aqi} (${band.labelEn}), so a 15–20 minute cross-ventilation window is safe right now, especially away from busy roads. General guidance only—consult a doctor if anyone feels breathless.`;
  }

  if (q.includes('play') || q.includes('child') || q.includes('kid') || q.includes('बच्च') || q.includes('खेल')) {
    return isHi
      ? `${snapshot.locationName} में अभी AQI ${snapshot.aqi} (${band.labelHi}, PM2.5 ${snapshot.pm25} µg/m³) है। ${
          snapshot.aqi >= 151
            ? `बच्चों के लिए बाहर दौड़भाग टालें और खेल घर के अंदर रखें। यदि बाहर निकलना ज़रूरी हो तो कम प्रदूषण वाले समय (${windows.bestWindowText}) में बच्चों का फिट N95/KF94 मास्क पहनाएँ।`
            : `कम प्रदूषण वाले समय (${windows.bestWindowText}) में हल्का बाहरी खेल सुरक्षित है, व्यस्त सड़क से दूर रहें।`
        } यह सामान्य मार्गदर्शन है, चिकित्सा सलाह नहीं—खाँसी या साँस फूलने पर डॉक्टर से परामर्श लें।`
      : `In ${snapshot.locationName}, live AQI is ${snapshot.aqi} (${band.labelEn}, PM2.5 ${snapshot.pm25} µg/m³). ${
          snapshot.aqi >= 151
            ? `Because children breathe faster per kg of body weight and your household flags children${
                profile.hasAsthmaOrRespiratory ? '/respiratory sensitivity' : ''
              }, move active play indoors today. If stepping out briefly, aim for ${windows.bestWindowText} with a child-sized fitted N95/KF94 mask.`
            : `Short outdoor play is reasonable during ${windows.bestWindowText} away from main traffic.`
        } Why this matters: shifting active play indoors on AQI 150+ days avoids roughly 60–80% of inhaled PM2.5 dose (approximate, assuming active play increases breathing rate 3–4x). Note: AirWise provides general environmental guidance, not medical advice—please consult a doctor for wheezing or cough.`;
  }

  return isHi
    ? `${snapshot.locationName} में वर्तमान AQI ${snapshot.aqi} (${band.labelHi}), PM2.5 ${snapshot.pm25} µg/m³ और हवा की गति ${snapshot.windKmh} km/h है। सबसे बेहतर बाहरी समय ${windows.bestWindowText} है। ${
        snapshot.aqi >= 151
          ? 'बाहर जाने पर फिट N95 मास्क पहनें और घर के अंदर HEPA/गीले पोछे से हवा साफ़ रखें।'
          : 'सामान्य सावधानी के साथ बाहर गतिविधियाँ कर सकते हैं।'
      } यह सामान्य मार्गदर्शन है, चिकित्सा सलाह नहीं—किसी भी लक्षण पर डॉक्टर से मिलें।`
    : `Based on live conditions in ${snapshot.locationName} (AQI ${snapshot.aqi} — ${band.labelEn}, PM2.5 ${snapshot.pm25} µg/m³, wind ${snapshot.windKmh} km/h): your lowest-exposure window is ${windows.bestWindowText}, while peak smog occurs around ${windows.worstWindowText}. ${
        snapshot.aqi >= 151
          ? `Wear a fitted N95/KN95 mask outdoors${
              profile.hasAirPurifier ? ' and run your bedroom HEPA purifier with doors closed' : ' and create one closed, wet-mopped clean-air room indoors'
            }.`
          : 'Light outdoor routines are manageable; sensitive members should still avoid heavy traffic corridors.'
      } Why this matters: timing trips to cleaner hours and using N95/HEPA protection reduces daily PM2.5 exposure by ~50–80% (approximate). General environmental guidance only, not medical advice—consult a doctor for any symptoms.`;
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rl = checkRateLimit(`chat:${ip}`, 20, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many chat messages. Please pause for a minute.' },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 });
  }

  const parsed = chatRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Please enter a valid question (1–600 characters).' },
      { status: 400 }
    );
  }

  const { message, history, snapshot, profile, language } = parsed.data;
  const cleanQuestion = sanitizeUserText(message, 500);

  if (!cleanQuestion) {
    return NextResponse.json({ error: 'Question cannot be empty.' }, { status: 400 });
  }

  // Prompt-injection protection gate
  if (detectPromptInjection(cleanQuestion)) {
    const safeRefusal =
      language === 'hi'
        ? `मैं केवल ${snapshot.locationName} (AQI ${snapshot.aqi}) के लाइव वायु गुणवत्ता डेटा और आपके परिवार की सुरक्षा से जुड़े प्रश्नोत्तर दे सकता हूँ। कृपया बाहरी खेल, खिड़कियाँ खोलने, मास्क या यात्रा के बारे में पूछें।`
        : `I can only answer questions grounded in live air quality data for ${snapshot.locationName} (AQI ${snapshot.aqi}) and your household safety profile. Feel free to ask about outdoor play timing, opening windows, masks, or low-emission commuting.`;
    return NextResponse.json({
      reply: safeRefusal,
      source: 'rule-fallback',
      groundedAqi: snapshot.aqi,
    });
  }

  const windows = findBestOutdoorWindows(snapshot.hourly);
  const ai = getGeminiClient();

  if (!ai) {
    return NextResponse.json({
      reply: buildRuleFallbackAnswer(cleanQuestion, snapshot, profile, language),
      source: 'rule-fallback',
      groundedAqi: snapshot.aqi,
      fallbackNotice:
        language === 'hi'
          ? 'लाइव Gemini AI उपलब्ध नहीं — नियम-आधारित उत्तर दिखाया जा रहा है।'
          : 'Live Gemini AI unavailable — showing transparent rule-based answer grounded in live AQI.',
    });
  }

  const contextJson = {
    requestedLanguage: language,
    location: snapshot.locationName,
    liveAqi: snapshot.aqi,
    pm25UgM3: snapshot.pm25,
    pm10UgM3: snapshot.pm10,
    no2UgM3: snapshot.no2,
    o3UgM3: snapshot.o3,
    coMgM3: snapshot.co,
    temperatureC: snapshot.temperatureC,
    humidityPct: snapshot.humidityPct,
    windKmh: snapshot.windKmh,
    inversionRisk: snapshot.inversionRisk,
    bestOutdoorWindow: windows.bestWindowText,
    worstSmogWindow: windows.worstWindowText,
    next12HoursAqi: snapshot.hourly.slice(0, 12).map((h) => ({
      hour: h.hourLabel,
      aqi: h.aqi,
      pm25: h.pm25,
    })),
    householdProfile: profile,
  };

  const recentTranscript = history
    .slice(-4)
    .map((m) => `${m.role === 'user' ? 'User' : 'AirWise'}: ${sanitizeUserText(m.content, 300)}`)
    .join('\n');

  const prompt = `<context_json>
${JSON.stringify(contextJson)}
</context_json>
${recentTranscript ? `\n<recent_conversation>\n${recentTranscript}\n</recent_conversation>\n` : ''}
<user_question>
${cleanQuestion}
</user_question>`;

  try {
    const response = await ai.models.generateContent({
      model: AIRWISE_GEMINI_MODEL,
      contents: prompt,
      config: {
        systemInstruction: CHAT_ASSISTANT_SYSTEM_PROMPT,
      },
    });

    const replyText = (response.text ?? '').trim();
    if (!replyText) {
      throw new Error('Empty Gemini reply');
    }

    return NextResponse.json({
      reply: replyText,
      source: 'gemini-ai',
      groundedAqi: snapshot.aqi,
    });
  } catch (err) {
    console.error('Gemini chat failed, using grounded rule fallback:', err);
    return NextResponse.json({
      reply: buildRuleFallbackAnswer(cleanQuestion, snapshot, profile, language),
      source: 'rule-fallback',
      groundedAqi: snapshot.aqi,
      fallbackNotice:
        language === 'hi'
          ? 'लाइव Gemini AI अस्थायी रूप से अनुपलब्ध — लाइव AQI पर आधारित उत्तर।'
          : 'Live Gemini AI temporarily unreachable — showing grounded rule-based answer.',
    });
  }
}
