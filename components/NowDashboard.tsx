'use client';

import dynamic from 'next/dynamic';
import { useMemo, useState } from 'react';
import {
  evaluateAlerts,
  findBestOutdoorWindows,
  getAqiBand,
  getEffectiveAlertThreshold,
} from '@/lib/air-quality';
import type { Translations } from '@/lib/i18n';
import type {
  AirQualitySnapshot,
  DailyPlanResponse,
  HouseholdProfile,
  LanguageCode,
} from '@/lib/types';
import { NowAlertsSection } from './now/NowAlertsSection';
import { NowHeroCard } from './now/NowHeroCard';
import { NowPollutantsPanel } from './now/NowPollutantsPanel';

const ForecastChart = dynamic(
  () => import('./ForecastChart').then((mod) => mod.ForecastChart),
  {
    ssr: false,
    loading: () => <div className="h-full w-full rounded-lg bg-slate-50 dark:bg-slate-900/40" />,
  }
);

interface NowDashboardProps {
  snapshot: AirQualitySnapshot;
  loading: boolean;
  profile: HouseholdProfile;
  plan: DailyPlanResponse | null;
  language: LanguageCode;
  t: Translations;
  onOpenPlan: () => void;
  onOpenAssistant: () => void;
  onOpenProfile: () => void;
}

export function NowDashboard({
  snapshot,
  loading,
  profile,
  plan,
  language,
  t,
  onOpenPlan,
  onOpenAssistant,
  onOpenProfile,
}: NowDashboardProps) {
  const [horizon, setHorizon] = useState<'24h' | '48h'>('24h');
  const [chartMetric, setChartMetric] = useState<'aqi' | 'pm25'>('aqi');

  const band = useMemo(() => getAqiBand(snapshot.aqi), [snapshot.aqi]);
  const windows = useMemo(() => findBestOutdoorWindows(snapshot.hourly), [snapshot.hourly]);
  const alerts = useMemo(() => evaluateAlerts(snapshot, profile), [snapshot, profile]);
  const threshold = useMemo(() => getEffectiveAlertThreshold(profile), [profile]);

  const chartData = useMemo(() => {
    const slice = horizon === '24h' ? snapshot.hourly.slice(0, 24) : snapshot.hourly.slice(0, 48);
    return slice.map((pt, index) => ({
      ...pt,
      axisLabel: horizon === '48h' && index >= 24 ? `+${pt.hourLabel}` : pt.hourLabel,
    }));
  }, [snapshot.hourly, horizon]);

  const isHi = language === 'hi';
  const bandLabel = isHi ? band.labelHi : band.labelEn;
  const bandMeaning = isHi ? band.meaningHi : band.meaningEn;

  const headline =
    plan?.rightNowHeadline ||
    (isHi
      ? `${snapshot.locationName} में AQI ${snapshot.aqi} (${bandLabel}) — ${bandMeaning}`
      : `AQI ${snapshot.aqi} (${bandLabel}) in ${snapshot.locationName}`);

  const summary =
    plan?.rightNowSummary ||
    (isHi
      ? `PM2.5 ${snapshot.pm25} µg/m³ है। सबसे कम स्मॉग वाली विंडो ${windows.bestWindowText} है।`
      : `Live PM2.5 is ${snapshot.pm25} µg/m³. Your best lower-smog outdoor window is ${windows.bestWindowText}.`);

  const inversionLabel =
    snapshot.inversionRisk === 'high'
      ? t.inversionHigh
      : snapshot.inversionRisk === 'moderate'
        ? t.inversionModerate
        : t.inversionLow;

  const quickRightNowActions = useMemo(() => {
    const severe = snapshot.aqi >= 201;
    const unhealthy = snapshot.aqi >= 151;
    return [
      {
        label: isHi ? 'बाहर जाना और खेल' : 'Outdoor Activity',
        detail: severe
          ? isHi
            ? 'व्यायाम और बच्चों का खेल घर के अंदर रखें।'
            : 'Keep workouts and children’s play indoors today.'
          : unhealthy
            ? isHi
              ? `केवल ${windows.bestStartLabel}–${windows.bestEndLabel} में ज़रूरी काम करें।`
              : `Limit outdoor time to essential trips during ${windows.bestStartLabel}–${windows.bestEndLabel}.`
            : isHi
              ? 'मुख्य ट्रैफ़िक से दूर हल्की बाहरी गतिविधि सुरक्षित।'
              : 'Outdoor activity is manageable away from busy arterial roads.',
      },
      {
        label: isHi ? 'मास्क और सुरक्षा' : 'Mask Protection',
        detail: unhealthy
          ? isHi
            ? 'बाहर निकलते समय सही फिट वाला N95/KN95 मास्क पहनें।'
            : 'Wear a snugly sealed N95/KN95 respirator when outdoors.'
          : isHi
            ? 'संवेदनशील सदस्यों के लिए N95 मास्क साथ रखें।'
            : 'Keep an N95 mask handy for sensitive family members near traffic.',
      },
      {
        label: isHi ? 'घर की हवा और खिड़कियाँ' : 'Windows & Indoor Air',
        detail: unhealthy
          ? profile.hasAirPurifier
            ? isHi
              ? `खिड़कियाँ बंद रखें; बेडरूम में HEPA चलाएँ (${windows.bestStartLabel} बजे 10 मिनट हवा बदलें)।`
              : `Keep windows closed; run bedroom HEPA purifier (brief 10-min airing at ${windows.bestStartLabel}).`
            : isHi
              ? 'खिड़कियाँ बंद रखें, गीला पोछा लगाएँ और घर के अंदर धुआँ/अगरबत्ती न करें।'
              : 'Keep windows closed, wet-mop dust, and skip indoor incense or frying smoke.'
          : isHi
            ? 'ताज़ी हवा के लिए 15–20 मिनट क्रॉस-वेंटिलेशन सुरक्षित है।'
            : 'Safe to cross-ventilate indoors for 15–20 minutes.',
      },
    ];
  }, [snapshot.aqi, windows, profile.hasAirPurifier, isHi]);

  const observedTime = useMemo(() => {
    try {
      return new Date(snapshot.observedAtIso).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  }, [snapshot.observedAtIso]);

  return (
    <div
      className={`space-y-8 transition-opacity duration-150 ${loading ? 'opacity-80' : 'opacity-100'}`}
      aria-busy={loading}
    >
      <NowHeroCard
        snapshot={snapshot}
        band={band}
        headline={headline}
        summary={summary}
        observedTime={observedTime}
        windows={windows}
        quickActions={quickRightNowActions}
        language={language}
        t={t}
        onOpenPlan={onOpenPlan}
        onOpenAssistant={onOpenAssistant}
        onOpenProfile={onOpenProfile}
      />

      <NowAlertsSection alerts={alerts} threshold={threshold} language={language} t={t} />

      <div className="grid gap-6 lg:grid-cols-3">
        <section
          aria-labelledby="forecast-heading"
          className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-2 dark:border-slate-800 dark:bg-[#131C26]"
        >
          <div className="flex flex-wrap items-center justify-between gap-4 pb-5">
            <div>
              <h2
                id="forecast-heading"
                className="text-base font-semibold text-slate-900 dark:text-slate-100"
              >
                {t.forecastTitle}
              </h2>
              <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-300">
                {t.bestWindowLabel}:{' '}
                <span className="font-mono tabular-nums text-slate-800 dark:text-slate-100">
                  {windows.bestWindowText}
                </span>
                <span className="mx-2" aria-hidden="true">
                  ·
                </span>
                {t.peakSmogLabel}:{' '}
                <span className="font-mono tabular-nums text-slate-800 dark:text-slate-100">
                  {windows.worstWindowText}
                </span>
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div
                className="inline-flex rounded-lg bg-slate-100 p-1 dark:bg-slate-800/80"
                role="group"
                aria-label="Chart metric"
              >
                <button
                  type="button"
                  onClick={() => setChartMetric('aqi')}
                  aria-pressed={chartMetric === 'aqi'}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                    chartMetric === 'aqi'
                      ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
                  }`}
                >
                  AQI
                </button>
                <button
                  type="button"
                  onClick={() => setChartMetric('pm25')}
                  aria-pressed={chartMetric === 'pm25'}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                    chartMetric === 'pm25'
                      ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
                  }`}
                >
                  PM2.5
                </button>
              </div>

              <div
                className="inline-flex rounded-lg bg-slate-100 p-1 dark:bg-slate-800/80"
                role="group"
                aria-label="Forecast horizon"
              >
                <button
                  type="button"
                  onClick={() => setHorizon('24h')}
                  aria-pressed={horizon === '24h'}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                    horizon === '24h'
                      ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
                  }`}
                >
                  {t.forecast24h}
                </button>
                <button
                  type="button"
                  onClick={() => setHorizon('48h')}
                  aria-pressed={horizon === '48h'}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                    horizon === '48h'
                      ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
                  }`}
                >
                  {t.forecast48h}
                </button>
              </div>
            </div>
          </div>

          <div className="h-64 w-full" data-testid="forecast-chart">
            <ForecastChart
              data={chartData}
              chartMetric={chartMetric}
              horizon={horizon}
              threshold={threshold}
              bandHex={band.hex}
            />
          </div>
        </section>

        <NowPollutantsPanel
          snapshot={snapshot}
          inversionLabel={inversionLabel}
          language={language}
          t={t}
        />
      </div>
    </div>
  );
}
