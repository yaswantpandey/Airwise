import { NextRequest } from 'next/server';
import {
  aggregateHourlyToDailyHistory,
  computeInversionRisk,
  sanitizeUserText,
} from '@/lib/air-quality';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { buildSeedHistory7d, buildSeedSnapshot, PRESET_CITIES } from '@/lib/seed-data';
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
import { aqiQuerySchema } from '@/lib/server/schemas';
import type { AirQualitySnapshot, HourlyForecastPoint } from '@/lib/types';

const aqiCache = new LruCache<AirQualitySnapshot>(
  serverConfig.cache.aqiMaxEntries,
  serverConfig.cache.aqiTtlMs
);

function matchPresetCity(cityName?: string) {
  if (!cityName) return PRESET_CITIES[0];
  const needle = cityName.toLowerCase().trim();
  return (
    PRESET_CITIES.find(
      (c) =>
        c.name.toLowerCase() === needle ||
        c.name.toLowerCase().includes(needle) ||
        needle.includes(c.name.toLowerCase()) ||
        c.region.toLowerCase().includes(needle)
    ) || PRESET_CITIES[0]
  );
}

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export async function GET(request: NextRequest) {
  const requestId = createRequestId();

  if (!isOriginAllowed(request)) {
    return jsonError(request, 403, 'Origin not allowed.', requestId);
  }

  const ip = getClientIp(request);
  const { limit, windowMs } = serverConfig.rateLimits.aqi;
  const rl = checkRateLimit(`aqi:${ip}`, limit, windowMs);
  if (!rl.allowed) {
    return jsonError(
      request,
      429,
      'Too many air quality requests. Please wait a minute.',
      requestId,
      {
        'X-RateLimit-Remaining': '0',
        'Retry-After': '60',
      }
    );
  }

  const sp = request.nextUrl.searchParams;
  const parsed = aqiQuerySchema.safeParse({
    city: sp.get('city') ?? undefined,
    lat: sp.get('lat') ?? undefined,
    lon: sp.get('lon') ?? undefined,
  });

  if (!parsed.success) {
    return jsonError(request, 400, 'Invalid location query parameters.', requestId);
  }

  const cleanCity = parsed.data.city ? sanitizeUserText(parsed.data.city, 80) : undefined;
  let lat = parsed.data.lat;
  let lon = parsed.data.lon;
  let locationName = cleanCity || 'New Delhi';
  let region = '';
  let country = '';

  const cacheKey =
    lat !== undefined && lon !== undefined
      ? `coord:${lat.toFixed(2)},${lon.toFixed(2)}`
      : `city:${locationName.toLowerCase()}`;

  const cached = aqiCache.get(cacheKey);
  if (cached) {
    return jsonOk(request, cached, requestId, {
      'Cache-Control': 'public, max-age=300',
      'X-AirWise-Cache': 'HIT',
      'X-RateLimit-Remaining': String(rl.remaining),
    });
  }

  try {
    if (lat === undefined || lon === undefined) {
      const preset = PRESET_CITIES.find(
        (c) => c.name.toLowerCase() === locationName.toLowerCase()
      );
      if (preset) {
        lat = preset.latitude;
        lon = preset.longitude;
        locationName = preset.name;
        region = preset.region;
        country = preset.country;
      } else {
        const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
          locationName
        )}&count=1&language=en&format=json`;
        const geoRes = await fetchWithTimeout(geoUrl, serverConfig.upstreamTimeoutMs);
        if (geoRes.ok) {
          const geoJson = (await geoRes.json()) as {
            results?: Array<{
              latitude?: number;
              longitude?: number;
              name?: string;
              admin1?: string;
              country?: string;
            }>;
          };
          const first = geoJson?.results?.[0];
          if (first && Number.isFinite(Number(first.latitude)) && Number.isFinite(Number(first.longitude))) {
            lat = Number(first.latitude);
            lon = Number(first.longitude);
            locationName = sanitizeUserText(String(first.name ?? locationName), 80) || locationName;
            region = sanitizeUserText(String(first.admin1 || ''), 80);
            country = sanitizeUserText(String(first.country || ''), 80);
          }
        }
      }
    } else if (!cleanCity) {
      locationName = `My Location (${lat.toFixed(2)}°, ${lon.toFixed(2)}°)`;
      region = 'Detected via GPS';
      country = '';
    }

    if (lat === undefined || lon === undefined) {
      const fallback = buildSeedSnapshot(matchPresetCity(cleanCity));
      return jsonOk(request, fallback, requestId, {
        'X-AirWise-Source': 'demo-seed',
        'X-RateLimit-Remaining': String(rl.remaining),
      });
    }

    const aqUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=us_aqi,pm2_5,pm10,nitrogen_dioxide,ozone,carbon_monoxide&hourly=us_aqi,pm2_5,pm10&past_days=7&forecast_days=2&timezone=auto`;
    const wxUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m&hourly=temperature_2m,relative_humidity_2m,wind_speed_10m&forecast_days=2&timezone=auto`;

    const [aqRes, wxRes] = await Promise.all([
      fetchWithTimeout(aqUrl, serverConfig.upstreamTimeoutMs),
      fetchWithTimeout(wxUrl, serverConfig.upstreamTimeoutMs),
    ]);

    if (!aqRes.ok || !wxRes.ok) {
      throw new Error(`Open-Meteo HTTP error (${aqRes.status}/${wxRes.status})`);
    }

    const aqJson = (await aqRes.json()) as {
      current?: Record<string, unknown>;
      hourly?: Record<string, unknown>;
    };
    const wxJson = (await wxRes.json()) as {
      current?: Record<string, unknown>;
      hourly?: Record<string, unknown>;
    };

    const curAq = aqJson?.current ?? {};
    const curWx = wxJson?.current ?? {};

    const aqi = Math.max(0, Math.round(Number(curAq.us_aqi ?? 0)));
    const pm25 = Math.round(Number(curAq.pm2_5 ?? 0) * 10) / 10;
    const pm10 = Math.round(Number(curAq.pm10 ?? 0) * 10) / 10;
    const no2 = Math.round(Number(curAq.nitrogen_dioxide ?? 0) * 10) / 10;
    const o3 = Math.round(Number(curAq.ozone ?? 0) * 10) / 10;
    const coMg = Math.round((Number(curAq.carbon_monoxide ?? 0) / 1000) * 100) / 100;

    const temperatureC = Math.round(Number(curWx.temperature_2m ?? 20) * 10) / 10;
    const humidityPct = Math.round(Number(curWx.relative_humidity_2m ?? 50));
    const windKmh = Math.round(Number(curWx.wind_speed_10m ?? 8) * 10) / 10;

    const times: string[] = Array.isArray(aqJson?.hourly?.time)
      ? (aqJson.hourly.time as string[])
      : [];
    const hAqi: number[] = Array.isArray(aqJson?.hourly?.us_aqi)
      ? (aqJson.hourly.us_aqi as number[])
      : [];
    const hPm25: number[] = Array.isArray(aqJson?.hourly?.pm2_5)
      ? (aqJson.hourly.pm2_5 as number[])
      : [];
    const hPm10: number[] = Array.isArray(aqJson?.hourly?.pm10)
      ? (aqJson.hourly.pm10 as number[])
      : [];
    const hTemp: number[] = Array.isArray(wxJson?.hourly?.temperature_2m)
      ? (wxJson.hourly.temperature_2m as number[])
      : [];
    const hHum: number[] = Array.isArray(wxJson?.hourly?.relative_humidity_2m)
      ? (wxJson.hourly.relative_humidity_2m as number[])
      : [];
    const hWind: number[] = Array.isArray(wxJson?.hourly?.wind_speed_10m)
      ? (wxJson.hourly.wind_speed_10m as number[])
      : [];

    const wxTimes: string[] = Array.isArray(wxJson?.hourly?.time)
      ? (wxJson.hourly.time as string[])
      : [];
    const wxIndexByTime = new Map<string, number>();
    for (let i = 0; i < wxTimes.length; i++) {
      wxIndexByTime.set(wxTimes[i], i);
    }

    const nowMs = Date.now();
    let startIdx = times.findIndex((t) => new Date(t).getTime() >= nowMs - 3600_000);
    if (startIdx < 0) startIdx = Math.max(0, times.length - 48);

    const hourly: HourlyForecastPoint[] = [];
    for (let i = startIdx; i < Math.min(times.length, startIdx + 48); i++) {
      const tStr = times[i];
      const label = tStr.includes('T') ? tStr.split('T')[1].slice(0, 5) : tStr;
      const wxIdx = wxIndexByTime.get(tStr);
      hourly.push({
        timeIso: tStr,
        hourLabel: label,
        aqi: Math.max(0, Math.round(Number(hAqi[i] ?? aqi))),
        pm25: Math.round(Number(hPm25[i] ?? pm25) * 10) / 10,
        pm10: Math.round(Number(hPm10[i] ?? pm10) * 10) / 10,
        temperatureC:
          wxIdx !== undefined
            ? Math.round(Number(hTemp[wxIdx] ?? temperatureC) * 10) / 10
            : temperatureC,
        humidityPct:
          wxIdx !== undefined ? Math.round(Number(hHum[wxIdx] ?? humidityPct)) : humidityPct,
        windKmh:
          wxIdx !== undefined ? Math.round(Number(hWind[wxIdx] ?? windKmh) * 10) / 10 : windKmh,
      });
    }

    const currentDateIso =
      typeof curAq.time === 'string' && curAq.time.length >= 10
        ? curAq.time.slice(0, 10)
        : new Date().toISOString().slice(0, 10);
    const parsedHistory = aggregateHourlyToDailyHistory(times, hAqi, hPm25, currentDateIso);
    const history7d =
      parsedHistory.length >= 2 ? parsedHistory : buildSeedHistory7d(aqi || 120, pm25 || 45);

    const snapshot: AirQualitySnapshot = {
      locationName,
      region: region || 'Live Monitoring Grid',
      country,
      latitude: lat,
      longitude: lon,
      observedAtIso: new Date().toISOString(),
      source: 'open-meteo-live',
      aqi,
      pm25,
      pm10,
      no2,
      o3,
      co: coMg,
      temperatureC,
      humidityPct,
      windKmh,
      inversionRisk: computeInversionRisk(pm25, windKmh, humidityPct),
      hourly,
      history7d,
    };

    aqiCache.set(cacheKey, snapshot);

    return jsonOk(request, snapshot, requestId, {
      'Cache-Control': 'public, max-age=300',
      'X-AirWise-Cache': 'MISS',
      'X-RateLimit-Remaining': String(rl.remaining),
    });
  } catch (err) {
    console.warn(`[AirWise][${requestId}] Open-Meteo unavailable, using deterministic seed:`, err);
    const seed = buildSeedSnapshot(matchPresetCity(cleanCity));
    return jsonOk(request, seed, requestId, {
      'X-AirWise-Source': 'demo-seed',
      'X-RateLimit-Remaining': String(rl.remaining),
    });
  }
}
