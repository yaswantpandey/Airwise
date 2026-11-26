import { NextRequest } from 'next/server';
import {
  aggregateHourlyToDailyRange,
  sanitizeUserText,
  validateDateRange,
} from '@/lib/air-quality';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { buildSeedHistoryRange, PRESET_CITIES } from '@/lib/seed-data';
import { LruCache } from '@/lib/server/cache';
import { serverConfig } from '@/lib/server/config';
import {
  createRequestId,
  fetchWithTimeout,
  handleCorsPreflight,
  isOriginAllowed,
  jsonError,
  jsonOk,
} from '@/lib/server/http';
import { historyQuerySchema } from '@/lib/server/schemas';
import type { DailyHistoryPoint } from '@/lib/types';

interface HistoryResponsePayload {
  startDate: string;
  endDate: string;
  source: 'open-meteo-live' | 'demo-seed';
  days: DailyHistoryPoint[];
}

const historyCache = new LruCache<HistoryResponsePayload>(
  serverConfig.cache.historyMaxEntries,
  serverConfig.cache.historyTtlMs
);

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export async function GET(request: NextRequest) {
  const requestId = createRequestId();

  if (!isOriginAllowed(request)) {
    return jsonError(request, 403, 'Origin not allowed.', requestId);
  }

  const ip = getClientIp(request);
  const { limit, windowMs } = serverConfig.rateLimits.history;
  const rl = checkRateLimit(`aqi-history:${ip}`, limit, windowMs);
  if (!rl.allowed) {
    return jsonError(
      request,
      429,
      'Too many history requests. Please wait a minute.',
      requestId,
      {
        'X-RateLimit-Remaining': '0',
        'Retry-After': '60',
      }
    );
  }

  const sp = request.nextUrl.searchParams;
  const parsed = historyQuerySchema.safeParse({
    lat: sp.get('lat'),
    lon: sp.get('lon'),
    startDate: sp.get('startDate'),
    endDate: sp.get('endDate'),
    city: sp.get('city') ?? undefined,
    baseAqi: sp.get('baseAqi') ?? undefined,
    basePm25: sp.get('basePm25') ?? undefined,
  });

  if (!parsed.success) {
    return jsonError(
      request,
      400,
      'Invalid history query parameters. Provide valid lat, lon, startDate, and endDate.',
      requestId
    );
  }

  const { lat, lon, startDate, endDate, baseAqi, basePm25 } = parsed.data;
  const cleanCity = parsed.data.city ? sanitizeUserText(parsed.data.city, 80) : '';

  const rangeCheck = validateDateRange(startDate, endDate, 90);
  if (!rangeCheck.valid) {
    return jsonError(request, 400, rangeCheck.errorEn || 'Invalid date range.', requestId);
  }

  const cacheKey = `${lat.toFixed(2)},${lon.toFixed(2)}:${startDate}:${endDate}`;
  const cached = historyCache.get(cacheKey);
  if (cached) {
    return jsonOk(request, cached, requestId, {
      'Cache-Control': 'public, max-age=600',
      'X-AirWise-Cache': 'HIT',
      'X-RateLimit-Remaining': String(rl.remaining),
    });
  }

  try {
    const aqUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&hourly=us_aqi,pm2_5&start_date=${encodeURIComponent(
      startDate
    )}&end_date=${encodeURIComponent(endDate)}&timezone=auto`;

    const res = await fetchWithTimeout(aqUrl, serverConfig.upstreamTimeoutMs);
    if (!res.ok) {
      throw new Error(`Open-Meteo history HTTP error (${res.status})`);
    }

    const json = (await res.json()) as {
      hourly?: {
        time?: string[];
        us_aqi?: Array<number | null>;
        pm2_5?: Array<number | null>;
      };
    };
    const times: string[] = Array.isArray(json?.hourly?.time) ? json.hourly.time : [];
    const hAqi: Array<number | null> = Array.isArray(json?.hourly?.us_aqi)
      ? json.hourly.us_aqi
      : [];
    const hPm25: Array<number | null> = Array.isArray(json?.hourly?.pm2_5)
      ? json.hourly.pm2_5
      : [];

    const days = aggregateHourlyToDailyRange(times, hAqi, hPm25, startDate, endDate);
    if (days.length === 0) {
      throw new Error('Open-Meteo returned no historical readings for selected range');
    }

    const payload: HistoryResponsePayload = {
      startDate,
      endDate,
      source: 'open-meteo-live',
      days,
    };

    historyCache.set(cacheKey, payload);

    return jsonOk(request, payload, requestId, {
      'Cache-Control': 'public, max-age=600',
      'X-AirWise-Cache': 'MISS',
      'X-RateLimit-Remaining': String(rl.remaining),
    });
  } catch (err) {
    console.warn(`[AirWise][${requestId}] Open-Meteo history unavailable, using fallback:`, err);
    const matchedPreset = PRESET_CITIES.find(
      (c) => cleanCity && c.name.toLowerCase() === cleanCity.toLowerCase()
    );
    const fallbackAqi = baseAqi ?? matchedPreset?.baseAqi ?? 180;
    const fallbackPm25 = basePm25 ?? matchedPreset?.basePm25 ?? 95;
    const days = buildSeedHistoryRange(fallbackAqi, fallbackPm25, startDate, endDate);

    return jsonOk(
      request,
      {
        startDate,
        endDate,
        source: 'demo-seed' as const,
        days,
      },
      requestId,
      {
        'X-AirWise-Source': 'demo-seed',
        'X-RateLimit-Remaining': String(rl.remaining),
      }
    );
  }
}
