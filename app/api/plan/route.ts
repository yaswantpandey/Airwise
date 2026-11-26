import { NextRequest } from 'next/server';
import { findBestOutdoorWindows, sanitizeUserText } from '@/lib/air-quality';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { hashCachePayload, LruCache } from '@/lib/server/cache';
import { serverConfig } from '@/lib/server/config';
import { buildRuleBasedDailyPlan } from '@/lib/server/fallbacks';
import { callGeminiJsonWithFallback } from '@/lib/server/gemini';
import {
  createRequestId,
  handleCorsPreflight,
  isOriginAllowed,
  jsonError,
  jsonOk,
  readJsonBodyWithLimit,
} from '@/lib/server/http';
import {
  buildDailyPlanPrompt,
  DAILY_PLAN_RESPONSE_SCHEMA,
  DAILY_PLAN_SYSTEM_PROMPT,
  DailyPlanOutputZod,
} from '@/lib/server/prompts';
import { planRequestSchema } from '@/lib/server/schemas';
import type { AirQualitySnapshot, DailyPlanResponse, HouseholdProfile } from '@/lib/types';

const planCache = new LruCache<DailyPlanResponse>(
  serverConfig.cache.planMaxEntries,
  serverConfig.cache.planTtlMs
);

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export async function POST(request: NextRequest) {
  const requestId = createRequestId();

  if (!isOriginAllowed(request)) {
    return jsonError(request, 403, 'Origin not allowed.', requestId);
  }

  const ip = getClientIp(request);
  const { limit, windowMs } = serverConfig.rateLimits.plan;
  const rl = checkRateLimit(`plan:${ip}`, limit, windowMs);
  if (!rl.allowed) {
    return jsonError(
      request,
      429,
      'Rate limit reached for AI plan generation. Please retry in a minute.',
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

  const parsed = planRequestSchema.safeParse(bodyResult.data);
  if (!parsed.success) {
    return jsonError(request, 400, 'Invalid daily plan request payload.', requestId);
  }

  const { snapshot, profile, language } = parsed.data;
  const sanitizedLocation = sanitizeUserText(snapshot.locationName, 80) || 'Your City';
  const typedSnapshot: AirQualitySnapshot = {
    ...snapshot,
    locationName: sanitizedLocation,
    region: sanitizeUserText(snapshot.region, 80),
    country: sanitizeUserText(snapshot.country, 80),
  };
  const typedProfile: HouseholdProfile = {
    ...profile,
    displayLabel: sanitizeUserText(profile.displayLabel, 60),
    city: sanitizeUserText(profile.city, 80),
  };

  const windows = findBestOutdoorWindows(typedSnapshot.hourly);

  const normalizedContext = {
    requestedLanguage: language,
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
      maskTypesOwned: [...typedProfile.maskTypes].sort(),
      ventilationType: typedProfile.ventilationType,
      cookingFuel: typedProfile.cookingFuel,
      hasIndoorPlants: typedProfile.hasIndoorPlants,
      budgetLevel: typedProfile.budgetLevel,
    },
  };

  const cacheKey = hashCachePayload(normalizedContext);
  const cached = planCache.get(cacheKey);
  if (cached) {
    return jsonOk(request, cached, requestId, {
      'X-AirWise-Plan-Source': cached.source,
      'X-AirWise-Cache': 'HIT',
      'X-RateLimit-Remaining': String(rl.remaining),
    });
  }

  const promptPayload = {
    ...normalizedContext,
    currentLocalTimeIso: new Date().toISOString(),
  };

  const aiResult = await callGeminiJsonWithFallback({
    prompt: buildDailyPlanPrompt(promptPayload),
    systemInstruction: DAILY_PLAN_SYSTEM_PROMPT,
    responseSchema: DAILY_PLAN_RESPONSE_SCHEMA,
    zodSchema: DailyPlanOutputZod,
    requestId,
    fallback: (reason) => {
      const notice =
        reason === 'missing-key'
          ? language === 'hi'
            ? 'लाइव Gemini AI कुंजी उपलब्ध नहीं है — वर्तमान AQI बैंड और परिवार प्रोफ़ाइल पर आधारित पारदर्शी नियम-आधारित योजना दिखाई जा रही है।'
            : 'Live Gemini AI key is not configured — displaying transparent rule-based guidance grounded in your current AQI band and household profile.'
          : language === 'hi'
            ? 'लाइव Gemini AI सेवा अस्थायी रूप से अनुपलब्ध है — वर्तमान AQI बैंड पर आधारित पारदर्शी नियम-आधारित योजना दिखाई जा रही है।'
            : 'Live Gemini AI service was temporarily unreachable — showing transparent rule-based guidance grounded in your current AQI data.';
      return buildRuleBasedDailyPlan(typedSnapshot, typedProfile, language, notice);
    },
  });

  const responsePayload: DailyPlanResponse =
    aiResult.source === 'gemini-ai'
      ? {
          ...aiResult.data,
          generatedAtIso: new Date().toISOString(),
          source: 'gemini-ai',
        }
      : (aiResult.data as DailyPlanResponse);

  if (aiResult.source === 'gemini-ai') {
    planCache.set(cacheKey, responsePayload);
  }

  return jsonOk(request, responsePayload, requestId, {
    'X-AirWise-Plan-Source': responsePayload.source,
    'X-AirWise-Cache': 'MISS',
    'X-RateLimit-Remaining': String(rl.remaining),
  });
}
