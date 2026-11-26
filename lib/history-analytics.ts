import type { DailyHistoryPoint } from './types';

const SHORT_MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];
const SHORT_WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function formatCalendarDateLabels(dateIso: string): {
  dayLabel: string;
  weekdayLabel: string;
} {
  const parts = dateIso.split('-').map((p) => Number(p));
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) {
    return { dayLabel: dateIso, weekdayLabel: '' };
  }
  const [year, month, day] = parts;
  const dt = new Date(Date.UTC(year, month - 1, day));
  return {
    dayLabel: `${SHORT_MONTHS[dt.getUTCMonth()]} ${day}`,
    weekdayLabel: SHORT_WEEKDAYS[dt.getUTCDay()],
  };
}

function parseUtcDateIso(dateIso: string): Date | null {
  if (!ISO_DATE_RE.test(dateIso)) return null;
  const [y, m, d] = dateIso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) {
    return null;
  }
  return dt;
}

export function shiftDateIso(dateIso: string, deltaDays: number): string {
  const dt = parseUtcDateIso(dateIso) ?? new Date();
  dt.setUTCDate(dt.getUTCDate() + deltaDays);
  return dt.toISOString().slice(0, 10);
}

/**
 * Computes an inclusive YYYY-MM-DD date range ending on `endDateIso` (default: today UTC).
 */
export function computePresetDateRange(
  days: number,
  endDateIso?: string
): { startDate: string; endDate: string } {
  const clampedDays = Math.max(1, Math.min(90, Math.round(days)));
  const endDate =
    endDateIso && parseUtcDateIso(endDateIso)
      ? endDateIso
      : new Date().toISOString().slice(0, 10);
  const startDate = shiftDateIso(endDate, -(clampedDays - 1));
  return { startDate, endDate };
}

export interface DateRangeValidationResult {
  valid: boolean;
  dayCount: number;
  errorEn?: string;
  errorHi?: string;
}

/**
 * Validates a custom [startDate, endDate] range against maxDays and today's cutoff.
 */
export function validateDateRange(
  startDate: string,
  endDate: string,
  maxDays = 90,
  todayIso?: string
): DateRangeValidationResult {
  const startDt = parseUtcDateIso(startDate);
  const endDt = parseUtcDateIso(endDate);
  if (!startDt || !endDt) {
    return {
      valid: false,
      dayCount: 0,
      errorEn: 'Please select valid start and end dates.',
      errorHi: 'कृपया मान्य प्रारंभ और समाप्ति तिथियाँ चुनें।',
    };
  }

  const cutoffIso =
    todayIso && parseUtcDateIso(todayIso) ? todayIso : new Date().toISOString().slice(0, 10);
  const cutoffDt = parseUtcDateIso(cutoffIso)!;

  if (startDt.getTime() > endDt.getTime()) {
    return {
      valid: false,
      dayCount: 0,
      errorEn: 'Start date must be on or before end date.',
      errorHi: 'प्रारंभ तिथि समाप्ति तिथि से पहले या बराबर होनी चाहिए।',
    };
  }

  if (endDt.getTime() > cutoffDt.getTime()) {
    return {
      valid: false,
      dayCount: 0,
      errorEn: 'End date cannot be in the future.',
      errorHi: 'समाप्ति तिथि भविष्य की नहीं हो सकती।',
    };
  }

  const dayCount = Math.round((endDt.getTime() - startDt.getTime()) / 86_400_000) + 1;
  if (dayCount > maxDays) {
    return {
      valid: false,
      dayCount,
      errorEn: `Please choose a range of up to ${maxDays} days.`,
      errorHi: `कृपया अधिकतम ${maxDays} दिनों की अवधि चुनें।`,
    };
  }

  return { valid: true, dayCount };
}

/**
 * Aggregates hourly AQI & PM2.5 arrays strictly within [startDateIso, endDateIso] (inclusive).
 */
export function aggregateHourlyToDailyRange(
  times: string[],
  hAqi: Array<number | null | undefined>,
  hPm25: Array<number | null | undefined>,
  startDateIso: string,
  endDateIso: string
): DailyHistoryPoint[] {
  const buckets = new Map<string, { aqis: number[]; pm25s: number[] }>();

  for (let i = 0; i < times.length; i++) {
    const rawTime = times[i];
    if (typeof rawTime !== 'string' || rawTime.length < 10) continue;
    const dateIso = rawTime.slice(0, 10);
    if (dateIso < startDateIso || dateIso > endDateIso) continue;

    const aqiVal = Number(hAqi[i]);
    const pm25Val = Number(hPm25[i]);
    const hasAqi = hAqi[i] !== null && hAqi[i] !== undefined && Number.isFinite(aqiVal);
    const hasPm25 = hPm25[i] !== null && hPm25[i] !== undefined && Number.isFinite(pm25Val);
    if (!hasAqi && !hasPm25) continue;

    let bucket = buckets.get(dateIso);
    if (!bucket) {
      bucket = { aqis: [], pm25s: [] };
      buckets.set(dateIso, bucket);
    }
    if (hasAqi) bucket.aqis.push(Math.max(0, aqiVal));
    if (hasPm25) bucket.pm25s.push(Math.max(0, pm25Val));
  }

  const sortedDates = Array.from(buckets.keys()).sort();
  return sortedDates.map((dateIso) => {
    const bucket = buckets.get(dateIso)!;
    const avgAqi =
      bucket.aqis.length > 0
        ? Math.round(bucket.aqis.reduce((s, v) => s + v, 0) / bucket.aqis.length)
        : 0;
    const maxAqi = bucket.aqis.length > 0 ? Math.round(Math.max(...bucket.aqis)) : avgAqi;
    const minAqi = bucket.aqis.length > 0 ? Math.round(Math.min(...bucket.aqis)) : avgAqi;
    const avgPm25 =
      bucket.pm25s.length > 0
        ? Math.round((bucket.pm25s.reduce((s, v) => s + v, 0) / bucket.pm25s.length) * 10) / 10
        : 0;
    const maxPm25 =
      bucket.pm25s.length > 0 ? Math.round(Math.max(...bucket.pm25s) * 10) / 10 : avgPm25;
    const { dayLabel, weekdayLabel } = formatCalendarDateLabels(dateIso);

    return {
      dateIso,
      dayLabel,
      weekdayLabel,
      avgAqi,
      maxAqi,
      minAqi,
      avgPm25,
      maxPm25,
      whoExceedanceRatio: Math.round((avgPm25 / 15) * 10) / 10,
    };
  });
}

export function aggregateHourlyToDailyHistory(
  times: string[],
  hAqi: Array<number | null | undefined>,
  hPm25: Array<number | null | undefined>,
  todayDateIso?: string
): DailyHistoryPoint[] {
  const cutoffDate = todayDateIso || new Date().toISOString().slice(0, 10);
  const allUntilCutoff = aggregateHourlyToDailyRange(
    times,
    hAqi,
    hPm25,
    '1970-01-01',
    cutoffDate
  );
  return allUntilCutoff.slice(-7);
}

export interface HistoryTrendSummary {
  avgAqi7d: number;
  avgPm257d: number;
  aqiDeltaPct: number;
  pm25DeltaPct: number;
  trendDirection: 'improving' | 'worsening' | 'stable';
  cleanestDay: DailyHistoryPoint | null;
  worstDay: DailyHistoryPoint | null;
  daysBelowThreshold: number;
  daysMeetingWhoPm25: number;
}

export function analyzeHistoryTrend(
  history: DailyHistoryPoint[],
  alertThreshold: number
): HistoryTrendSummary {
  if (!history || history.length === 0) {
    return {
      avgAqi7d: 0,
      avgPm257d: 0,
      aqiDeltaPct: 0,
      pm25DeltaPct: 0,
      trendDirection: 'stable',
      cleanestDay: null,
      worstDay: null,
      daysBelowThreshold: 0,
      daysMeetingWhoPm25: 0,
    };
  }

  const avgAqi7d = Math.round(history.reduce((sum, d) => sum + d.avgAqi, 0) / history.length);
  const avgPm257d =
    Math.round((history.reduce((sum, d) => sum + d.avgPm25, 0) / history.length) * 10) / 10;

  let cleanestDay = history[0];
  let worstDay = history[0];
  let daysBelowThreshold = 0;
  let daysMeetingWhoPm25 = 0;

  for (const day of history) {
    if (day.avgAqi < cleanestDay.avgAqi) cleanestDay = day;
    if (day.avgAqi > worstDay.avgAqi) worstDay = day;
    if (day.avgAqi <= alertThreshold) daysBelowThreshold++;
    if (day.avgPm25 <= 15) daysMeetingWhoPm25++;
  }

  const splitIdx = Math.max(1, Math.floor(history.length / 2));
  const earlier = history.slice(0, splitIdx);
  const recent = history.slice(splitIdx);

  const earlierAqi = earlier.reduce((s, d) => s + d.avgAqi, 0) / earlier.length;
  const recentAqi = recent.reduce((s, d) => s + d.avgAqi, 0) / recent.length;
  const earlierPm = earlier.reduce((s, d) => s + d.avgPm25, 0) / earlier.length;
  const recentPm = recent.reduce((s, d) => s + d.avgPm25, 0) / recent.length;

  const aqiDeltaPct =
    earlierAqi > 0 ? Math.round(((recentAqi - earlierAqi) / earlierAqi) * 100) : 0;
  const pm25DeltaPct =
    earlierPm > 0 ? Math.round(((recentPm - earlierPm) / earlierPm) * 100) : 0;

  let trendDirection: 'improving' | 'worsening' | 'stable' = 'stable';
  if (aqiDeltaPct <= -5) trendDirection = 'improving';
  else if (aqiDeltaPct >= 5) trendDirection = 'worsening';

  return {
    avgAqi7d,
    avgPm257d,
    aqiDeltaPct,
    pm25DeltaPct,
    trendDirection,
    cleanestDay,
    worstDay,
    daysBelowThreshold,
    daysMeetingWhoPm25,
  };
}

export interface HistoryTooltipMetrics {
  aqiDeltaFromPrev: number | null;
  pm25DeltaFromPrev: number | null;
  exceedsThreshold: boolean;
  thresholdDelta: number;
  whoMultiple: number;
}

export function buildHistoryTooltipMetrics(
  point: DailyHistoryPoint,
  prevPoint: DailyHistoryPoint | null,
  threshold: number
): HistoryTooltipMetrics {
  const aqiDeltaFromPrev = prevPoint ? Math.round(point.avgAqi - prevPoint.avgAqi) : null;
  const pm25DeltaFromPrev = prevPoint
    ? Math.round((point.avgPm25 - prevPoint.avgPm25) * 10) / 10
    : null;
  const thresholdDelta = Math.round(point.avgAqi - threshold);
  const whoMultiple = Math.round((point.avgPm25 / 15) * 10) / 10;

  return {
    aqiDeltaFromPrev,
    pm25DeltaFromPrev,
    exceedsThreshold: point.avgAqi > threshold,
    thresholdDelta,
    whoMultiple,
  };
}
