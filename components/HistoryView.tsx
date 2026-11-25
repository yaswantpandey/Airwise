'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Calendar, Minus, RefreshCw, TrendingDown, TrendingUp } from 'lucide-react';
import {
  analyzeHistoryTrend,
  computePresetDateRange,
  formatCalendarDateLabels,
  getAqiBand,
  getEffectiveAlertThreshold,
  shiftDateIso,
  validateDateRange,
} from '@/lib/air-quality';
import type { Translations } from '@/lib/i18n';
import { buildSeedHistory7d, buildSeedHistoryRange } from '@/lib/seed-data';
import type {
  AirQualitySnapshot,
  DailyHistoryPoint,
  HouseholdProfile,
  LanguageCode,
} from '@/lib/types';
import { AqiCategoryIcon } from './AqiCategoryIcon';
import type { HistoryChartMode } from './HistoryTrendChart';

const HistoryTrendChart = dynamic(
  () => import('./HistoryTrendChart').then((mod) => mod.HistoryTrendChart),
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full rounded-lg bg-slate-50 dark:bg-slate-900/40" />
    ),
  }
);

type RangePreset = '7d' | '14d' | '30d' | 'custom';

interface HistoryRangePayload {
  startDate: string;
  endDate: string;
  source: 'open-meteo-live' | 'demo-seed';
  days: DailyHistoryPoint[];
}

interface HistoryViewProps {
  snapshot: AirQualitySnapshot;
  loading: boolean;
  profile: HouseholdProfile;
  language: LanguageCode;
  t: Translations;
  onRefresh: () => void;
}

export function HistoryView({
  snapshot,
  loading,
  profile,
  language,
  t,
  onRefresh,
}: HistoryViewProps) {
  const isHi = language === 'hi';

  const todayIso = useMemo(() => {
    const lastLive = snapshot.history7d?.[snapshot.history7d.length - 1]?.dateIso;
    if (lastLive && /^\d{4}-\d{2}-\d{2}$/.test(lastLive)) {
      return lastLive;
    }
    return snapshot.observedAtIso.slice(0, 10);
  }, [snapshot.history7d, snapshot.observedAtIso]);

  const minSelectableIso = useMemo(() => shiftDateIso(todayIso, -89), [todayIso]);

  const default7dRange = useMemo(() => computePresetDateRange(7, todayIso), [todayIso]);

  const [chartMode, setChartMode] = useState<HistoryChartMode>('combined');
  const [rangePreset, setRangePreset] = useState<RangePreset>('7d');
  const [draftStartDate, setDraftStartDate] = useState<string>(default7dRange.startDate);
  const [draftEndDate, setDraftEndDate] = useState<string>(default7dRange.endDate);
  const [appliedStartDate, setAppliedStartDate] = useState<string>(default7dRange.startDate);
  const [appliedEndDate, setAppliedEndDate] = useState<string>(default7dRange.endDate);
  const [rangeError, setRangeError] = useState<string | null>(null);
  const [loadingRange, setLoadingRange] = useState<boolean>(false);
  const [fetchedRange, setFetchedRange] = useState<{
    cityKey: string;
    startDate: string;
    endDate: string;
    source: 'open-meteo-live' | 'demo-seed';
    days: DailyHistoryPoint[];
  } | null>(null);

  const requestSeqRef = useRef(0);

  const cityKey = `${snapshot.latitude.toFixed(2)},${snapshot.longitude.toFixed(2)}`;

  const fetchCustomRange = useCallback(
    async (startDate: string, endDate: string, targetCityKey: string) => {
      const reqId = ++requestSeqRef.current;
      setLoadingRange(true);
      setRangeError(null);

      try {
        const qs = new URLSearchParams({
          lat: String(snapshot.latitude),
          lon: String(snapshot.longitude),
          startDate,
          endDate,
          city: snapshot.locationName,
          baseAqi: String(snapshot.aqi),
          basePm25: String(snapshot.pm25),
        });
        const res = await fetch(`/api/aqi/history?${qs.toString()}`);
        if (!res.ok) {
          const errJson = await res.json().catch(() => null);
          throw new Error(errJson?.error || 'Unable to load historical range');
        }
        const data: HistoryRangePayload = await res.json();
        if (requestSeqRef.current !== reqId) return;

        setFetchedRange({
          cityKey: targetCityKey,
          startDate: data.startDate,
          endDate: data.endDate,
          source: data.source,
          days: data.days,
        });
      } catch {
        if (requestSeqRef.current !== reqId) return;
        const fallbackDays = buildSeedHistoryRange(
          snapshot.aqi,
          snapshot.pm25,
          startDate,
          endDate
        );
        setFetchedRange({
          cityKey: targetCityKey,
          startDate,
          endDate,
          source: 'demo-seed',
          days: fallbackDays,
        });
      } finally {
        if (requestSeqRef.current === reqId) {
          setLoadingRange(false);
        }
      }
    },
    [snapshot.latitude, snapshot.longitude, snapshot.locationName, snapshot.aqi, snapshot.pm25]
  );

  // Re-fetch custom or multi-week range automatically when the user switches city
  useEffect(() => {
    if (rangePreset === '7d') return;
    if (
      fetchedRange &&
      fetchedRange.cityKey === cityKey &&
      fetchedRange.startDate === appliedStartDate &&
      fetchedRange.endDate === appliedEndDate
    ) {
      return;
    }

    let cancelled = false;
    const qs = new URLSearchParams({
      lat: String(snapshot.latitude),
      lon: String(snapshot.longitude),
      startDate: appliedStartDate,
      endDate: appliedEndDate,
      city: snapshot.locationName,
      baseAqi: String(snapshot.aqi),
      basePm25: String(snapshot.pm25),
    });

    fetch(`/api/aqi/history?${qs.toString()}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: HistoryRangePayload | null) => {
        if (cancelled) return;
        if (data && Array.isArray(data.days) && data.days.length > 0) {
          setFetchedRange({
            cityKey,
            startDate: data.startDate,
            endDate: data.endDate,
            source: data.source,
            days: data.days,
          });
        } else {
          setFetchedRange({
            cityKey,
            startDate: appliedStartDate,
            endDate: appliedEndDate,
            source: 'demo-seed',
            days: buildSeedHistoryRange(
              snapshot.aqi,
              snapshot.pm25,
              appliedStartDate,
              appliedEndDate
            ),
          });
        }
      })
      .catch(() => {
        if (cancelled) return;
        setFetchedRange({
          cityKey,
          startDate: appliedStartDate,
          endDate: appliedEndDate,
          source: 'demo-seed',
          days: buildSeedHistoryRange(
            snapshot.aqi,
            snapshot.pm25,
            appliedStartDate,
            appliedEndDate
          ),
        });
      });

    return () => {
      cancelled = true;
    };
  }, [
    rangePreset,
    cityKey,
    appliedStartDate,
    appliedEndDate,
    fetchedRange,
    snapshot.latitude,
    snapshot.longitude,
    snapshot.locationName,
    snapshot.aqi,
    snapshot.pm25,
  ]);

  function handleSelectPreset(preset: '7d' | '14d' | '30d') {
    const days = preset === '7d' ? 7 : preset === '14d' ? 14 : 30;
    const next = computePresetDateRange(days, todayIso);
    setRangePreset(preset);
    setDraftStartDate(next.startDate);
    setDraftEndDate(next.endDate);
    setAppliedStartDate(next.startDate);
    setAppliedEndDate(next.endDate);
    setRangeError(null);

    if (preset === '7d') {
      setFetchedRange(null);
      setLoadingRange(false);
    } else {
      void fetchCustomRange(next.startDate, next.endDate, cityKey);
    }
  }

  function handleApplyCustomRange(e: FormEvent) {
    e.preventDefault();
    const check = validateDateRange(draftStartDate, draftEndDate, 90, todayIso);
    if (!check.valid) {
      setRangeError(isHi ? check.errorHi || 'अमान्य तिथि अवधि।' : check.errorEn || 'Invalid date range.');
      return;
    }
    setRangeError(null);
    setRangePreset('custom');
    setAppliedStartDate(draftStartDate);
    setAppliedEndDate(draftEndDate);
    void fetchCustomRange(draftStartDate, draftEndDate, cityKey);
  }

  function handleRefreshClick() {
    if (rangePreset === '7d') {
      onRefresh();
    } else {
      void fetchCustomRange(appliedStartDate, appliedEndDate, cityKey);
    }
  }

  const threshold = useMemo(() => getEffectiveAlertThreshold(profile), [profile]);

  const base7dHistory = useMemo(() => {
    if (Array.isArray(snapshot.history7d) && snapshot.history7d.length > 0) {
      return snapshot.history7d;
    }
    return buildSeedHistory7d(snapshot.aqi, snapshot.pm25);
  }, [snapshot.history7d, snapshot.aqi, snapshot.pm25]);

  const activeHistory = useMemo(() => {
    if (rangePreset === '7d') return base7dHistory;
    if (fetchedRange && fetchedRange.days.length > 0) return fetchedRange.days;
    return base7dHistory;
  }, [rangePreset, fetchedRange, base7dHistory]);

  const activeSource =
    rangePreset === '7d' ? snapshot.source : fetchedRange?.source ?? snapshot.source;

  const spanDays = activeHistory.length;
  const activeStartLabel = activeHistory[0]
    ? activeHistory[0].dayLabel
    : formatCalendarDateLabels(appliedStartDate).dayLabel;
  const activeEndLabel = activeHistory[activeHistory.length - 1]
    ? activeHistory[activeHistory.length - 1].dayLabel
    : formatCalendarDateLabels(appliedEndDate).dayLabel;

  const summary = useMemo(
    () => analyzeHistoryTrend(activeHistory, threshold),
    [activeHistory, threshold]
  );

  const avgBand = useMemo(() => getAqiBand(summary.avgAqi7d), [summary.avgAqi7d]);
  const whoRatio = useMemo(
    () => Math.round((summary.avgPm257d / 15) * 10) / 10,
    [summary.avgPm257d]
  );

  const trendCopy = useMemo(() => {
    const absAqi = Math.abs(summary.aqiDeltaPct);
    const absPm = Math.abs(summary.pm25DeltaPct);

    if (summary.trendDirection === 'improving') {
      return {
        label: isHi ? 'सुधार हो रहा है' : 'Improving',
        detail: isHi
          ? `चयनित ${spanDays}-दिन की अवधि के शुरुआती भाग की तुलना में हाल के दिनों में औसत AQI ${absAqi}% और PM2.5 ${absPm}% कम हुआ है।`
          : `Average AQI fell ${absAqi}% and PM2.5 dropped ${absPm}% in the second half of this ${spanDays}-day window compared with earlier days.`,
        textClass: 'text-teal-800 dark:text-teal-300',
        Icon: TrendingDown,
      };
    }
    if (summary.trendDirection === 'worsening') {
      return {
        label: isHi ? 'प्रदूषण बढ़ रहा है' : 'Worsening',
        detail: isHi
          ? `चयनित ${spanDays}-दिन की अवधि के शुरुआती भाग की तुलना में हाल के दिनों में औसत AQI ${absAqi}% और PM2.5 ${absPm}% बढ़ा है।`
          : `Average AQI climbed ${absAqi}% and PM2.5 rose ${absPm}% in the second half of this ${spanDays}-day window compared with earlier days.`,
        textClass: 'text-rose-800 dark:text-rose-300',
        Icon: TrendingUp,
      };
    }
    return {
      label: isHi ? 'स्थिर स्तर' : 'Holding steady',
      detail: isHi
        ? `इस ${spanDays}-दिन की अवधि में AQI लगभग एक जैसा (${summary.aqiDeltaPct >= 0 ? '+' : ''}${summary.aqiDeltaPct}%) रहा है।`
        : `Average AQI stayed within ${absAqi}% across this ${spanDays}-day range without a sharp directional shift.`,
      textClass: 'text-slate-700 dark:text-slate-300',
      Icon: Minus,
    };
  }, [summary.aqiDeltaPct, summary.pm25DeltaPct, summary.trendDirection, spanDays, isHi]);

  const TrendIcon = trendCopy.Icon;
  const isBusy = loading || loadingRange;

  if (activeHistory.length === 0) {
    return (
      <section className="rounded-xl border border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-[#131C26]">
        <h1 className="text-lg font-semibold text-slate-900 dark:text-white">
          {t.historyTitle}
        </h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          {isHi
            ? 'इस शहर के लिए ऐतिहासिक डेटा अभी उपलब्ध नहीं है।'
            : 'Historical readings are not loaded for this city yet.'}
        </p>
        <button
          type="button"
          onClick={handleRefreshClick}
          className="mt-5 inline-flex min-h-[42px] items-center gap-2 rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-500"
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          <span>{isHi ? 'डेटा रीफ़्रेश करें' : 'Refresh Data'}</span>
        </button>
      </section>
    );
  }

  return (
    <div className={`space-y-8 transition-opacity duration-200 ${loadingRange ? 'opacity-75' : 'opacity-100'}`}>
      {/* Header, Date Range Picker & Directional Trend Summary */}
      <section
        aria-labelledby="history-heading"
        className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8 dark:border-slate-800 dark:bg-[#131C26]"
      >
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-2xl space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span>
                {snapshot.locationName}
                {snapshot.region ? `, ${snapshot.region}` : ''}
              </span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">
                {activeStartLabel} – {activeEndLabel} ({spanDays}{' '}
                {isHi ? 'दिन' : spanDays === 1 ? 'day' : 'days'})
              </span>
              <span aria-hidden="true">·</span>
              <span>
                {activeSource === 'open-meteo-live'
                  ? isHi
                    ? 'Open-Meteo ऐतिहासिक आर्काइव'
                    : 'Open-Meteo historical archive'
                  : isHi
                  ? 'ऑफ़लाइन / सीड डेटा'
                  : 'Seed winter smog history'}
              </span>
            </div>

            <h1
              id="history-heading"
              className="text-2xl font-bold tracking-tight text-slate-950 text-balance dark:text-white"
            >
              {t.historyTitle}
            </h1>
            <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              {t.historySubtitle}
            </p>
          </div>

          <button
            type="button"
            onClick={handleRefreshClick}
            disabled={isBusy}
            className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-800 transition-colors hover:bg-slate-50 disabled:opacity-60 whitespace-nowrap shrink-0 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${isBusy ? 'animate-spin' : ''}`}
              aria-hidden="true"
            />
            <span>{isHi ? 'डेटा ताज़ा करें' : 'Refresh History'}</span>
          </button>
        </div>

        {/* Date Range Picker Controls: Quick Presets + Custom From/To Inputs */}
        <div className="mt-6 flex flex-col gap-4 border-t border-slate-100 pt-5 lg:flex-row lg:items-end lg:justify-between dark:border-slate-800">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300">
              <Calendar className="h-3.5 w-3.5 text-teal-700 dark:text-teal-400" aria-hidden="true" />
              <span>{isHi ? 'तिथि अवधि' : 'Date Range'}</span>
            </span>

            <div
              className="inline-flex rounded-lg bg-slate-100 p-1 dark:bg-slate-800/80"
              role="group"
              aria-label={isHi ? 'त्वरित तिथि अवधि चुनें' : 'Quick date range presets'}
            >
              {(
                [
                  { key: '7d', label: t.historyRange7d },
                  { key: '14d', label: t.historyRange14d },
                  { key: '30d', label: t.historyRange30d },
                ] as const
              ).map((preset) => (
                <button
                  key={preset.key}
                  type="button"
                  onClick={() => handleSelectPreset(preset.key)}
                  aria-pressed={rangePreset === preset.key}
                  className={`min-h-[36px] rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                    rangePreset === preset.key
                      ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          <form
            onSubmit={handleApplyCustomRange}
            aria-label={isHi ? 'कस्टम तिथि अवधि' : 'Custom date range'}
            className="flex flex-wrap items-end gap-2.5"
          >
            <div className="flex flex-col gap-1">
              <label
                htmlFor="history-start-date"
                className="text-[11px] font-medium text-slate-500 dark:text-slate-400"
              >
                {t.historyFromLabel}
              </label>
              <input
                id="history-start-date"
                type="date"
                value={draftStartDate}
                min={minSelectableIso}
                max={todayIso}
                onChange={(e) => {
                  setDraftStartDate(e.target.value);
                  setRangeError(null);
                }}
                className="min-h-[40px] rounded-lg border border-slate-300 bg-white px-3 py-1.5 font-mono text-xs tabular-nums text-slate-900 focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-700/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label
                htmlFor="history-end-date"
                className="text-[11px] font-medium text-slate-500 dark:text-slate-400"
              >
                {t.historyToLabel}
              </label>
              <input
                id="history-end-date"
                type="date"
                value={draftEndDate}
                min={minSelectableIso}
                max={todayIso}
                onChange={(e) => {
                  setDraftEndDate(e.target.value);
                  setRangeError(null);
                }}
                className="min-h-[40px] rounded-lg border border-slate-300 bg-white px-3 py-1.5 font-mono text-xs tabular-nums text-slate-900 focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-700/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              />
            </div>

            <button
              type="submit"
              disabled={loadingRange}
              className="inline-flex min-h-[40px] items-center justify-center rounded-lg bg-teal-700 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-teal-800 disabled:opacity-60 whitespace-nowrap shrink-0 dark:bg-teal-600 dark:hover:bg-teal-500"
            >
              {t.historyApplyRange}
            </button>
          </form>
        </div>

        {rangeError && (
          <p
            role="alert"
            className="mt-3 text-xs font-medium text-rose-700 dark:text-rose-400"
          >
            {rangeError}
          </p>
        )}

        {/* Plain-Language Trend Callout */}
        <div className="mt-5 flex flex-col gap-2 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
          <div className="flex items-start gap-2.5">
            <TrendIcon
              className={`mt-0.5 h-5 w-5 shrink-0 ${trendCopy.textClass}`}
              aria-hidden="true"
            />
            <div>
              <p className={`text-sm font-semibold ${trendCopy.textClass}`}>
                {trendCopy.label}
                <span className="ml-2 font-mono tabular-nums text-xs">
                  ({summary.aqiDeltaPct > 0 ? `+${summary.aqiDeltaPct}%` : `${summary.aqiDeltaPct}%`} AQI)
                </span>
              </p>
              <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-300">
                {trendCopy.detail}
              </p>
            </div>
          </div>

          {loadingRange && (
            <span
              role="status"
              className="font-mono text-xs tabular-nums text-teal-700 dark:text-teal-400"
            >
              {isHi ? 'डेटा लोड हो रहा है...' : 'Loading selected range...'}
            </span>
          )}
        </div>
      </section>

      {/* 4-Column Tabular KPI Strip */}
      <section
        aria-label={isHi ? 'अवधि के मुख्य आँकड़े' : 'Selected period summary metrics'}
        className="grid grid-cols-1 divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-4 lg:divide-x dark:divide-slate-800 dark:border-slate-800 dark:bg-[#131C26]"
      >
        <div className="p-5">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {spanDays}-{isHi ? 'दिन' : 'Day'} {t.historyAvgAqiLabel}
          </p>
          <p className="mt-2 font-mono text-3xl font-bold tabular-nums text-slate-950 dark:text-white">
            {summary.avgAqi7d}
          </p>
          <div className={`mt-1.5 inline-flex items-center gap-1.5 text-xs font-medium ${avgBand.badgeTextClass}`}>
            <AqiCategoryIcon symbol={avgBand.symbol} className="h-3.5 w-3.5" />
            <span>{isHi ? avgBand.labelHi : avgBand.labelEn}</span>
          </div>
        </div>

        <div className="p-5">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {spanDays}-{isHi ? 'दिन' : 'Day'} {t.historyAvgPm25Label}
          </p>
          <p className="mt-2 font-mono text-3xl font-bold tabular-nums text-slate-950 dark:text-white">
            {summary.avgPm257d}
            <span className="ml-1 text-sm font-normal text-slate-500 dark:text-slate-400">
              µg/m³
            </span>
          </p>
          <p className="mt-1.5 font-mono text-xs tabular-nums text-slate-600 dark:text-slate-300">
            {whoRatio > 1
              ? isHi
                ? `WHO 24h सीमा से ${whoRatio}× अधिक`
                : `${whoRatio}× WHO 24h guideline (15 µg/m³)`
              : isHi
              ? 'WHO 24h सीमा के भीतर'
              : 'Within WHO 24h guideline (15 µg/m³)'}
          </p>
        </div>

        <div className="p-5">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {t.historyCleanestDayLabel}
          </p>
          <p className="mt-2 font-mono text-3xl font-bold tabular-nums text-slate-950 dark:text-white">
            {summary.cleanestDay ? summary.cleanestDay.avgAqi : '--'}
            <span className="ml-1.5 text-sm font-normal text-slate-500 dark:text-slate-400">
              AQI
            </span>
          </p>
          <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-300">
            {summary.cleanestDay
              ? `${summary.cleanestDay.weekdayLabel}, ${summary.cleanestDay.dayLabel} · ${summary.cleanestDay.avgPm25} µg/m³`
              : '--'}
          </p>
        </div>

        <div className="p-5">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {t.historySafeDaysLabel}
          </p>
          <p className="mt-2 font-mono text-3xl font-bold tabular-nums text-slate-950 dark:text-white">
            {summary.daysBelowThreshold}
            <span className="ml-1 text-base font-normal text-slate-500 dark:text-slate-400">
              / {spanDays} {isHi ? 'दिन' : spanDays === 1 ? 'day' : 'days'}
            </span>
          </p>
          <p className="mt-1.5 font-mono text-xs tabular-nums text-slate-600 dark:text-slate-300">
            {isHi ? `लक्ष्य: AQI ≤ ${threshold}` : `Threshold: AQI ≤ ${threshold}`}
          </p>
        </div>
      </section>

      {/* Main Interactive Recharts Trend Card */}
      <section
        aria-labelledby="history-chart-heading"
        className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-[#131C26]"
      >
        <div className="flex flex-col gap-4 pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2
              id="history-chart-heading"
              className="text-base font-semibold text-slate-900 dark:text-slate-100"
            >
              {isHi
                ? `${spanDays}-दिन PM2.5 और US AQI रुझान`
                : `${spanDays}-Day PM2.5 & US AQI Trend`}
            </h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              {chartMode === 'combined'
                ? isHi
                  ? 'लाल रेखा दैनिक औसत AQI (बायाँ अक्ष) और टील बार औसत PM2.5 µg/m³ (दायाँ अक्ष) दिखाती है।'
                  : 'Line shows daily average US AQI (left axis); bars show daily average PM2.5 in µg/m³ (right axis).'
                : chartMode === 'aqi'
                ? isHi
                  ? 'दैनिक औसत AQI बनाम दैनिक अधिकतम AQI और आपकी व्यक्तिगत चेतावनी सीमा।'
                  : 'Daily average US AQI compared against daily peak AQI and your household alert limit.'
                : isHi
                ? 'दैनिक औसत PM2.5 (µg/m³), WHO 24-घंटे की सुरक्षित सीमा (15 µg/m³) के सापेक्ष।'
                : 'Daily average fine particulate matter (PM2.5) compared against the WHO 24-hour guideline (15 µg/m³).'}
            </p>
          </div>

          <div
            className="inline-flex self-start rounded-lg bg-slate-100 p-1 dark:bg-slate-800/80"
            role="group"
            aria-label={isHi ? 'चार्ट मोड' : 'History chart view'}
          >
            {(
              [
                { key: 'combined', label: t.historyViewCombined },
                { key: 'aqi', label: t.historyViewAqi },
                { key: 'pm25', label: t.historyViewPm25 },
              ] as const
            ).map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => setChartMode(opt.key)}
                aria-pressed={chartMode === opt.key}
                className={`min-h-[36px] rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  chartMode === opt.key
                    ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Clean Unboxed Legend */}
        <div className="mb-3 flex flex-wrap items-center gap-5 text-xs text-slate-600 dark:text-slate-300">
          {chartMode === 'combined' && (
            <>
              <span className="inline-flex items-center gap-2">
                <span className="h-0.5 w-4 bg-rose-700" aria-hidden="true" />
                <span>{isHi ? 'औसत US AQI' : 'Avg US AQI'}</span>
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="h-2.5 w-3 rounded-xs border border-teal-700 bg-teal-600/35" aria-hidden="true" />
                <span>{isHi ? 'औसत PM2.5 (µg/m³)' : 'Avg PM2.5 (µg/m³)'}</span>
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="h-0.5 w-4 border-t-2 border-dashed border-teal-700" aria-hidden="true" />
                <span>
                  {isHi ? `व्यक्तिगत सीमा (${threshold})` : `Personal limit (${threshold} AQI)`}
                </span>
              </span>
            </>
          )}
          {chartMode === 'aqi' && (
            <>
              <span className="inline-flex items-center gap-2">
                <span className="h-0.5 w-4 bg-rose-700" aria-hidden="true" />
                <span>{isHi ? 'दैनिक औसत AQI' : 'Daily Avg AQI'}</span>
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="h-0.5 w-4 border-t-2 border-dashed border-slate-500" aria-hidden="true" />
                <span>{isHi ? 'दैनिक अधिकतम AQI' : 'Daily Peak AQI'}</span>
              </span>
            </>
          )}
          {chartMode === 'pm25' && (
            <>
              <span className="inline-flex items-center gap-2">
                <span className="h-2.5 w-3 rounded-xs bg-rose-700/80" aria-hidden="true" />
                <span>{isHi ? 'दैनिक औसत PM2.5 (श्रेणी रंग)' : 'Daily Avg PM2.5 (colored by AQI band)'}</span>
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="h-0.5 w-4 border-t-2 border-dashed border-teal-700" aria-hidden="true" />
                <span>WHO 24h (15 µg/m³)</span>
              </span>
            </>
          )}
        </div>

        <div className="h-72 w-full" data-testid="history-chart">
          <HistoryTrendChart
            data={activeHistory}
            mode={chartMode}
            threshold={threshold}
            language={language}
          />
        </div>
      </section>

      {/* Daily Air Quality Breakdown Table */}
      <section
        aria-labelledby="history-table-heading"
        className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-[#131C26]"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-6 py-4 dark:border-slate-800">
          <h2
            id="history-table-heading"
            className="text-base font-semibold text-slate-900 dark:text-slate-100"
          >
            {t.historyBreakdownTitle}
          </h2>
          {summary.worstDay && (
            <span className="font-mono text-xs tabular-nums text-slate-500 dark:text-slate-400">
              {isHi
                ? `सबसे खराब दिन: ${summary.worstDay.dayLabel} (AQI ${summary.worstDay.avgAqi})`
                : `Peak smog day: ${summary.worstDay.dayLabel} (Avg AQI ${summary.worstDay.avgAqi})`}
            </span>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-medium text-slate-500 dark:border-slate-800 dark:text-slate-400">
                <th scope="col" className="px-6 py-3">
                  {isHi ? 'तारीख' : 'Date'}
                </th>
                <th scope="col" className="px-4 py-3">
                  {isHi ? 'श्रेणी' : 'Air Category'}
                </th>
                <th scope="col" className="px-4 py-3 text-right">
                  {isHi ? 'औसत AQI' : 'Avg AQI'}
                </th>
                <th scope="col" className="px-4 py-3 text-right">
                  {isHi ? 'अधिकतम AQI' : 'Peak AQI'}
                </th>
                <th scope="col" className="px-4 py-3 text-right">
                  {isHi ? 'औसत PM2.5' : 'Avg PM2.5'}
                </th>
                <th scope="col" className="px-4 py-3 text-right">
                  {isHi ? 'अधिकतम PM2.5' : 'Peak PM2.5'}
                </th>
                <th scope="col" className="px-6 py-3 text-right">
                  {isHi ? 'दैनिक बदलाव' : 'Day Change'}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {activeHistory.map((day, idx) => {
                const band = getAqiBand(day.avgAqi);
                const prevDay = idx > 0 ? activeHistory[idx - 1] : null;
                const diff = prevDay ? day.avgAqi - prevDay.avgAqi : null;
                const isToday = day.dateIso === todayIso;

                return (
                  <tr
                    key={day.dateIso}
                    className="transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/30"
                  >
                    <td className="whitespace-nowrap px-6 py-3 font-medium text-slate-900 dark:text-slate-100">
                      <span>
                        {day.weekdayLabel}, {day.dayLabel}
                      </span>
                      {isToday && (
                        <span className="ml-2 text-xs font-normal text-teal-700 dark:text-teal-400">
                          · {isHi ? 'आज' : 'Today'}
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 text-xs font-medium ${band.badgeTextClass}`}
                      >
                        <AqiCategoryIcon symbol={band.symbol} className="h-3.5 w-3.5" />
                        <span>{isHi ? band.labelHi : band.labelEn}</span>
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-mono font-semibold tabular-nums text-slate-900 dark:text-white">
                      {day.avgAqi}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-mono tabular-nums text-slate-600 dark:text-slate-300">
                      {day.maxAqi}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-mono font-medium tabular-nums text-slate-900 dark:text-slate-100">
                      {day.avgPm25} µg/m³
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-mono tabular-nums text-slate-600 dark:text-slate-300">
                      {day.maxPm25} µg/m³
                    </td>
                    <td className="whitespace-nowrap px-6 py-3 text-right font-mono text-xs tabular-nums">
                      {diff === null ? (
                        <span className="text-slate-400 dark:text-slate-500">—</span>
                      ) : diff < 0 ? (
                        <span className="font-medium text-teal-700 dark:text-teal-400">
                          {diff} AQI
                        </span>
                      ) : diff > 0 ? (
                        <span className="font-medium text-rose-700 dark:text-rose-400">
                          +{diff} AQI
                        </span>
                      ) : (
                        <span className="text-slate-500 dark:text-slate-400">0 AQI</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
