import { NextRequest } from 'next/server';
import {
  detectPromptInjection,
  findBestOutdoorWindows,
  sanitizeUserText,
} from '@/lib/air-quality';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { serverConfig } from '@/lib/server/config';
import { buildChatFallbackAnswer } from '@/lib/server/fallbacks';
import { callGeminiTextWithFallback } from '@/lib/server/gemini';
import {
  createRequestId,
  handleCorsPreflight,
  isOriginAllowed,
  jsonError,
  jsonOk,
  readJsonBodyWithLimit,
} from '@/lib/server/http';
import { buildChatPrompt, CHAT_ASSISTANT_SYSTEM_PROMPT } from '@/lib/server/prompts';
import { chatRequestSchema, type ChatResponsePayload } from '@/lib/server/schemas';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export async function POST(request: NextRequest) {
  const requestId = createRequestId();

  if (!isOriginAllowed(request)) {
    return jsonError(request, 403, 'Origin not allowed.', requestId);
  }

  const ip = getClientIp(request);
  const { limit, windowMs } = serverConfig.rateLimits.chat;
  const rl = checkRateLimit(`chat:${ip}`, limit, windowMs);
  if (!rl.allowed) {
    return jsonError(
      request,
      429,
      'Too many chat messages. Please pause for a minute.',
      requestId,
      {
        'X-RateLimit-Remaining': '0',
        'Retry-After': '60',
      }
    );
  }

  const bodyResult = await readJsonBodyWithLimit(request);
  if (!bodyResult.ok) {
    return jsonError(request, bodyResult.status, bodyResult.message, requestId);
  }

  const parsed = chatRequestSchema.safeParse(bodyResult.data);
  if (!parsed.success) {
    return jsonError(
      request,
      400,
      'Please enter a valid question (1–600 characters) with valid context.',
      requestId
    );
  }

  const { message, history, snapshot, profile, language } = parsed.data;
  const cleanQuestion = sanitizeUserText(message, 500);
  const cleanLocation = sanitizeUserText(snapshot.locationName, 80) || 'Your City';

  if (!cleanQuestion) {
    return jsonError(request, 400, 'Question cannot be empty.', requestId);
  }

  const sanitizedSnapshot = {
    ...snapshot,
    locationName: cleanLocation,
  };

  // Screen both the current message AND recent conversation history for prompt injection
  const historyHasInjection = history.some((entry) =>
    detectPromptInjection(sanitizeUserText(entry.content, 500))
  );
  if (detectPromptInjection(cleanQuestion) || historyHasInjection) {
    const safeRefusal =
      language === 'hi'
        ? `मैं केवल ${cleanLocation} (AQI ${snapshot.aqi}) के लाइव वायु गुणवत्ता डेटा और आपके परिवार की सुरक्षा से जुड़े प्रश्नोत्तर दे सकता हूँ। कृपया बाहरी खेल, खिड़कियाँ खोलने, मास्क या यात्रा के बारे में पूछें।`
        : `I can only answer questions grounded in live air quality data for ${cleanLocation} (AQI ${snapshot.aqi}) and your household safety profile. Feel free to ask about outdoor play timing, opening windows, masks, or low-emission commuting.`;

    const payload: ChatResponsePayload = {
      reply: safeRefusal,
      source: 'rule-fallback',
      groundedAqi: snapshot.aqi,
    };
    return jsonOk(request, payload, requestId, {
      'X-AirWise-Chat-Source': 'injection-guard',
      'X-RateLimit-Remaining': String(rl.remaining),
    });
  }

  const windows = findBestOutdoorWindows(sanitizedSnapshot.hourly);
  const contextJson = {
    requestedLanguage: language,
    location: cleanLocation,
    liveAqi: sanitizedSnapshot.aqi,
    pm25UgM3: sanitizedSnapshot.pm25,
    pm10UgM3: sanitizedSnapshot.pm10,
    no2UgM3: sanitizedSnapshot.no2,
    o3UgM3: sanitizedSnapshot.o3,
    coMgM3: sanitizedSnapshot.co,
    temperatureC: sanitizedSnapshot.temperatureC,
    humidityPct: sanitizedSnapshot.humidityPct,
    windKmh: sanitizedSnapshot.windKmh,
    inversionRisk: sanitizedSnapshot.inversionRisk,
    bestOutdoorWindow: windows.bestWindowText,
    worstSmogWindow: windows.worstWindowText,
    next12HoursAqi: sanitizedSnapshot.hourly.slice(0, 12).map((h) => ({
      hour: h.hourLabel,
      aqi: h.aqi,
      pm25: h.pm25,
    })),
    householdProfile: profile,
  };

  const prompt = buildChatPrompt(contextJson, history, cleanQuestion);
  const aiResult = await callGeminiTextWithFallback({
    prompt,
    systemInstruction: CHAT_ASSISTANT_SYSTEM_PROMPT,
    requestId,
    fallback: () => buildChatFallbackAnswer(cleanQuestion, sanitizedSnapshot, profile, language),
  });

  const payload: ChatResponsePayload = {
    reply: aiResult.text,
    source: aiResult.source,
    groundedAqi: sanitizedSnapshot.aqi,
    ...(aiResult.source === 'rule-fallback'
      ? {
          fallbackNotice:
            aiResult.fallbackReason === 'missing-key'
              ? language === 'hi'
                ? 'लाइव Gemini AI उपलब्ध नहीं — नियम-आधारित उत्तर दिखाया जा रहा है।'
                : 'Live Gemini AI unavailable — showing transparent rule-based answer grounded in live AQI.'
              : language === 'hi'
                ? 'लाइव Gemini AI अस्थायी रूप से अनुपलब्ध — लाइव AQI पर आधारित उत्तर।'
                : 'Live Gemini AI temporarily unreachable — showing grounded rule-based answer.',
        }
      : {}),
  };

  return jsonOk(request, payload, requestId, {
    'X-AirWise-Chat-Source': aiResult.source,
    'X-RateLimit-Remaining': String(rl.remaining),
  });
}
