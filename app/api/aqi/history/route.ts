import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  aggregateHourlyToDailyRange,
  sanitizeUserText,
  validateDateRange,
} from '@/lib/air-quality';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { buildSeedHistoryRange, PRESET_CITIES } from '@/lib/seed-data';
import type { DailyHistoryPoint } from '@/lib/types';

interface HistoryCacheEntry {
  data: {
    startDate: string;
    endDate: string;
    source: 'open-meteo-live' | 'demo-seed';
    days: DailyHistoryPoint[];
  };
  expiresAt: number;
}

const historyCache = new Map<string, HistoryCacheEntry>();
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

const querySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lon: z.coerce.number().min(-180).max(180),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  city: z.string().max(80).optional(),
  baseAqi: z.coerce.number().min(0).max(999).optional(),
  basePm25: z.coerce.number().min(0).max(1500).optional(),
});

async function fetchWithTimeout(url: string, timeoutMs = 5500): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });
  } finally {
    clearTimeout(timer);
  }
}

export async function GET(request: NextRequest) {
  const ip = getClientIp(request);
  const rl = checkRateLimit(`aqi-history:${ip}`, 40, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many history requests. Please wait a minute.' },
      { status: 429, headers: { 'Retry-After': '60' } }
    );
  }

  const sp = request.nextUrl.searchParams;
  const parsed = querySchema.safeParse({
    lat: sp.get('lat'),
    lon: sp.get('lon'),
    startDate: sp.get('startDate'),
    endDate: sp.get('endDate'),
    city: sp.get('city') ?? undefined,
    baseAqi: sp.get('baseAqi') ?? undefined,
    basePm25: sp.get('basePm25') ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid history query parameters. Provide valid lat, lon, startDate, and endDate.' },
      { status: 400 }
    );
  }

  const { lat, lon, startDate, endDate, baseAqi, basePm25 } = parsed.data;
  const cleanCity = parsed.data.city ? sanitizeUserText(parsed.data.city, 80) : '';

  const rangeCheck = validateDateRange(startDate, endDate, 90);
  if (!rangeCheck.valid) {
    return NextResponse.json(
      { error: rangeCheck.errorEn || 'Invalid date range.' },
      { status: 400 }
    );
  }

  const cacheKey = `${lat.toFixed(2)},${lon.toFixed(2)}:${startDate}:${endDate}`;
  const cached = historyCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.json(cached.data, {
      headers: {
        'Cache-Control': 'public, max-age=600',
        'X-AirWise-Cache': 'HIT',
      },
    });
  }

  try {
    const aqUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&hourly=us_aqi,pm2_5&start_date=${encodeURIComponent(
      startDate
    )}&end_date=${encodeURIComponent(endDate)}&timezone=auto`;

    const res = await fetchWithTimeout(aqUrl, 5500);
    if (!res.ok) {
      throw new Error(`Open-Meteo history HTTP error (${res.status})`);
    }

    const json = await res.json();
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

    const payload = {
      startDate,
      endDate,
      source: 'open-meteo-live' as const,
      days,
    };

    historyCache.set(cacheKey, { data: payload, expiresAt: Date.now() + CACHE_TTL_MS });

    return NextResponse.json(payload, {
      headers: {
        'Cache-Control': 'public, max-age=600',
        'X-AirWise-Cache': 'MISS',
      },
    });
  } catch (err) {
    console.warn('Open-Meteo history range unavailable, using deterministic fallback:', err);
    const matchedPreset = PRESET_CITIES.find(
      (c) => cleanCity && c.name.toLowerCase() === cleanCity.toLowerCase()
    );
    const fallbackAqi = baseAqi ?? matchedPreset?.baseAqi ?? 180;
    const fallbackPm25 = basePm25 ?? matchedPreset?.basePm25 ?? 95;
    const days = buildSeedHistoryRange(fallbackAqi, fallbackPm25, startDate, endDate);

    return NextResponse.json(
      {
        startDate,
        endDate,
        source: 'demo-seed' as const,
        days,
      },
      { headers: { 'X-AirWise-Source': 'demo-seed' } }
    );
  }
}
