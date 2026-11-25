import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { buildRuleBasedDailyPlan, findBestOutdoorWindows } from '@/lib/air-quality';
import {
  AIRWISE_GEMINI_MODEL,
  DAILY_PLAN_RESPONSE_SCHEMA,
  DAILY_PLAN_SYSTEM_PROMPT,
  DailyPlanOutputZod,
  getGeminiClient,
} from '@/lib/genai-prompts';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import type { AirQualitySnapshot, DailyPlanResponse, HouseholdProfile } from '@/lib/types';

const planRequestSchema = z.object({
  language: z.enum(['en', 'hi']).default('en'),
  snapshot: z.object({
    locationName: z.string().min(1).max(100),
    region: z.string().max(100).default(''),
    country: z.string().max(100).default(''),
    latitude: z.number(),
    longitude: z.number(),
    observedAtIso: z.string(),
    source: z.enum(['open-meteo-live', 'demo-seed']),
    aqi: z.number().min(0).max(999),
    pm25: z.number().min(0).max(2000),
    pm10: z.number().min(0).max(3000),
    no2: z.number().min(0).max(1000),
    o3: z.number().min(0).max(1000),
    co: z.number().min(0).max(100),
    temperatureC: z.number().min(-50).max(60),
    humidityPct: z.number().min(0).max(100),
    windKmh: z.number().min(0).max(200),
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
    displayLabel: z.string().max(60),
    city: z.string().max(80),
    language: z.enum(['en', 'hi']),
    hasChildren: z.boolean(),
    hasElderly: z.boolean(),
    hasPregnant: z.boolean(),
    hasAsthmaOrRespiratory: z.boolean(),
    hasHeartCondition: z.boolean(),
    commuteMode: z.enum(['walk', 'bike', 'two_wheeler', 'car', 'public_transport', 'wfh']),
    workFromHome: z.boolean(),
    schoolGoingKids: z.boolean(),
    outdoorExercise: z.enum(['none', 'morning', 'evening', 'flexible']),
    hasAirPurifier: z.boolean(),
    maskTypes: z.array(z.enum(['none', 'cloth', 'surgical', 'n95', 'n99', 'kn95'])).max(6),
    ventilationType: z.enum(['sealed_ac', 'standard_windows', 'cross_ventilated', 'balcony_open']),
    cookingFuel: z.enum(['lpg', 'png_piped', 'induction_electric', 'biomass_solid']),
    hasIndoorPlants: z.boolean(),
    budgetLevel: z.enum(['low', 'medium', 'flexible']),
    alertAqiThreshold: z.number().min(50).max(400),
    healthConsentAccepted: z.boolean(),
    communityGroupId: z.string().max(64),
  }),
});

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rl = checkRateLimit(`plan:${ip}`, 15, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Rate limit reached for AI plan generation. Please retry in a minute.' },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON request body.' }, { status: 400 });
  }

  const parsed = planRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Request failed schema validation.', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { snapshot, profile, language } = parsed.data;
  const typedSnapshot = snapshot as AirQualitySnapshot;
  const typedProfile = profile as HouseholdProfile;
  const windows = findBestOutdoorWindows(typedSnapshot.hourly);

  const ai = getGeminiClient();
  if (!ai) {
    const fallback = buildRuleBasedDailyPlan(
      typedSnapshot,
      typedProfile,
      language,
      language === 'hi'
        ? 'लाइव Gemini AI कुंजी उपलब्ध नहीं है — वर्तमान AQI बैंड और परिवार प्रोफ़ाइल पर आधारित पारदर्शी नियम-आधारित योजना दिखाई जा रही है।'
        : 'Live Gemini AI key is not configured — displaying transparent rule-based guidance grounded in your current AQI band and household profile.'
    );
    return NextResponse.json(fallback, {
      headers: { 'X-AirWise-Plan-Source': 'rule-fallback' },
    });
  }

  const contextPayload = {
    requestedLanguage: language,
    currentLocalTimeIso: new Date().toISOString(),
    airQuality: {
      location: typedSnapshot.locationName,
      aqi: typedSnapshot.aqi,
      pm25UgM3: typedSnapshot.pm25,
      pm10UgM3: typedSnapshot.pm10,
      no2UgM3: typedSnapshot.no2,
      o3UgM3: typedSnapshot.o3,
      coMgM3: typedSnapshot.co,
      temperatureC: typedSnapshot.temperatureC,
      humidityPct: typedSnapshot.humidityPct,
      windKmh: typedSnapshot.windKmh,
      inversionRisk: typedSnapshot.inversionRisk,
      bestOutdoorWindow: windows.bestWindowText,
      worstSmogWindow: windows.worstWindowText,
    },
    householdProfile: {
      hasChildren: typedProfile.hasChildren,
      hasElderly: typedProfile.hasElderly,
      hasPregnant: typedProfile.hasPregnant,
      hasAsthmaOrRespiratory: typedProfile.hasAsthmaOrRespiratory,
      hasHeartCondition: typedProfile.hasHeartCondition,
      commuteMode: typedProfile.commuteMode,
      workFromHome: typedProfile.workFromHome,
      schoolGoingKids: typedProfile.schoolGoingKids,
      outdoorExercise: typedProfile.outdoorExercise,
      hasAirPurifier: typedProfile.hasAirPurifier,
      maskTypesOwned: typedProfile.maskTypes,
      ventilationType: typedProfile.ventilationType,
      cookingFuel: typedProfile.cookingFuel,
      hasIndoorPlants: typedProfile.hasIndoorPlants,
      budgetLevel: typedProfile.budgetLevel,
    },
  };

  try {
    const response = await ai.models.generateContent({
      model: AIRWISE_GEMINI_MODEL,
      contents: `Generate a structured, personalized AirWise daily plan strictly grounded in this JSON context:\n${JSON.stringify(
        contextPayload
      )}`,
      config: {
        systemInstruction: DAILY_PLAN_SYSTEM_PROMPT,
        responseMimeType: 'application/json',
        responseSchema: DAILY_PLAN_RESPONSE_SCHEMA,
      },
    });

    const rawText = (response.text ?? '').trim();
    const jsonData = JSON.parse(rawText);
    const validated = DailyPlanOutputZod.parse(jsonData);

    const result: DailyPlanResponse = {
      ...validated,
      generatedAtIso: new Date().toISOString(),
      source: 'gemini-ai',
    };

    return NextResponse.json(result, {
      headers: {
        'X-AirWise-Plan-Source': 'gemini-ai',
        'X-RateLimit-Remaining': String(rl.remaining),
      },
    });
  } catch (err) {
    console.error('Gemini daily plan failed, serving transparent rule-based fallback:', err);
    const fallback = buildRuleBasedDailyPlan(
      typedSnapshot,
      typedProfile,
      language,
      language === 'hi'
        ? 'लाइव Gemini AI सेवा अस्थायी रूप से अनुपलब्ध है — वर्तमान AQI बैंड पर आधारित पारदर्शी नियम-आधारित योजना दिखाई जा रही है।'
        : 'Live Gemini AI service was temporarily unreachable — showing transparent rule-based guidance grounded in your current AQI data.'
    );
    return NextResponse.json(fallback, {
      headers: { 'X-AirWise-Plan-Source': 'rule-fallback' },
    });
  }
}
