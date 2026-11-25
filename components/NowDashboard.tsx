'use client';

import dynamic from 'next/dynamic';
import { useMemo, useState } from 'react';
import {
  ArrowRight,
  Bell,
  Clock,
  Droplets,
  Thermometer,
  Wind,
} from 'lucide-react';
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
import { AqiCategoryIcon } from './AqiCategoryIcon';

const ForecastChart = dynamic(
  () => import('./ForecastChart').then((mod) => mod.ForecastChart),
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full rounded-lg bg-slate-50 dark:bg-slate-900/40" />
    ),
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
      axisLabel:
        horizon === '48h' && index >= 24 ? `+${pt.hourLabel}` : pt.hourLabel,
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
    const items: { label: string; detail: string }[] = [];

    items.push({
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
    });

    items.push({
      label: isHi ? 'मास्क और सुरक्षा' : 'Mask Protection',
      detail: unhealthy
        ? isHi
          ? 'बाहर निकलते समय सही फिट वाला N95/KN95 मास्क पहनें।'
          : 'Wear a snugly sealed N95/KN95 respirator when outdoors.'
        : isHi
        ? 'संवेदनशील सदस्यों के लिए N95 मास्क साथ रखें।'
        : 'Keep an N95 mask handy for sensitive family members near traffic.',
    });

    items.push({
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
    });

    return items;
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
    <div className={`space-y-8 transition-opacity duration-150 ${loading ? 'opacity-80' : 'opacity-100'}`} aria-busy={loading}>
      {/* Primary One-Screen Hero: "What should I do right now?" */}
      <section
        aria-labelledby="right-now-heading"
        className={`rounded-xl border p-6 sm:p-8 ${band.surfaceTintClass} ${band.borderTintClass}`}
      >
        <div className="flex flex-col gap-6 lg:flex-row lg:items-stretch lg:justify-between">
          {/* Left: Focal AQI Number + Plain-Language Verdict */}
          <div className="flex-1 space-y-4">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium text-slate-600 dark:text-slate-300">
              <span>{t.rightNowTitle}</span>
              <span aria-hidden="true">·</span>
              <span>
                {snapshot.locationName}
                {snapshot.region ? `, ${snapshot.region}` : ''}
              </span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">
                {snapshot.source === 'open-meteo-live'
                  ? isHi
                    ? `लाइव अपडेट ${observedTime}`
                    : `Live ${observedTime}`
                  : isHi
                  ? 'सर्दियों का डेमो डेटा'
                  : 'Seed winter smog data'}
              </span>
            </div>

            <div className="flex flex-wrap items-baseline gap-4">
              <div className="flex items-baseline gap-2">
                <span
                  data-testid="live-aqi-value"
                  className="font-mono text-5xl font-semibold tracking-tight text-slate-950 tabular-nums sm:text-6xl dark:text-white"
                >
                  {snapshot.aqi}
                </span>
                <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  US AQI
                </span>
              </div>

              <div className={`inline-flex items-center gap-2 text-base font-semibold ${band.badgeTextClass}`}>
                <AqiCategoryIcon symbol={band.symbol} className="h-5 w-5" />
                <span>{bandLabel}</span>
              </div>
            </div>

            <h1
              id="right-now-heading"
              className="max-w-2xl text-xl font-semibold leading-snug text-slate-900 sm:text-2xl dark:text-slate-50"
            >
              {headline}
            </h1>

            <p className="max-w-2xl text-sm leading-relaxed text-slate-700 sm:text-base dark:text-slate-300">
              {bandMeaning} {summary}
            </p>

            {/* Primary + Secondary CTAs */}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                type="button"
                onClick={onOpenPlan}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-teal-700 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-teal-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 whitespace-nowrap shrink-0 dark:bg-teal-600 dark:hover:bg-teal-500"
              >
                <span>{isHi ? 'मेरी दैनिक योजना देखें' : 'View Full Daily Plan'}</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={onOpenAssistant}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 whitespace-nowrap shrink-0 dark:border-slate-700 dark:bg-[#131C26] dark:text-slate-100 dark:hover:bg-slate-800"
              >
                <span>{isHi ? 'AirWise से प्रश्न पूछें' : 'Ask AirWise Assistant'}</span>
              </button>
              <button
                type="button"
                onClick={onOpenProfile}
                className="min-h-[44px] px-2 text-sm font-medium text-teal-800 underline-offset-4 hover:underline whitespace-nowrap shrink-0 dark:text-teal-300"
              >
                {isHi ? 'परिवार प्रोफ़ाइल बदलें' : 'Customize for your household'}
              </button>
            </div>
          </div>

          {/* Right: 3 Immediate Household Actions (clean divider layout, no nested cards) */}
          <div className="w-full border-t border-slate-200/80 pt-5 lg:w-96 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-7 dark:border-slate-700/70">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {isHi ? 'तुरंत करने योग्य 3 कदम' : '3 Immediate Actions'}
            </h2>
            <dl className="mt-4 divide-y divide-slate-200/80 dark:divide-slate-700/70">
              {quickRightNowActions.map((item) => (
                <div key={item.label} className="py-3 first:pt-0 last:pb-0">
                  <dt className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                    {item.label}
                  </dt>
                  <dd className="mt-1 text-sm leading-snug text-slate-700 dark:text-slate-300">
                    {item.detail}
                  </dd>
                </div>
              ))}
            </dl>
            <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-slate-200/80 pt-3 text-xs text-slate-600 dark:border-slate-700/70 dark:text-slate-400">
              <span className="inline-flex items-center gap-1.5 font-medium text-teal-800 dark:text-teal-300">
                <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                {t.bestWindowLabel}: <span className="font-mono tabular-nums">{windows.bestWindowText}</span>
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Personalized Threshold & Inversion Alerts */}
      <section aria-labelledby="alerts-heading" className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-[#131C26]">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-teal-700 dark:text-teal-400" aria-hidden="true" />
            <h2 id="alerts-heading" className="text-base font-semibold text-slate-900 dark:text-slate-100">
              {t.alertsTitle}
            </h2>
          </div>
          <span className="text-xs text-slate-500 font-mono tabular-nums dark:text-slate-400">
            {isHi ? `व्यक्तिगत सीमा: AQI ${threshold}` : `Personal threshold: AQI ${threshold}`}
          </span>
        </div>

        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {alerts.map((alert) => (
            <li key={alert.id} className="flex flex-col gap-1 py-3.5 sm:flex-row sm:items-baseline sm:justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                  <span
                    className={
                      alert.severity === 'critical'
                        ? 'text-rose-700 dark:text-rose-400'
                        : alert.severity === 'warning'
                        ? 'text-amber-700 dark:text-amber-400'
                        : 'text-teal-700 dark:text-teal-400'
                    }
                  >
                    {alert.severity === 'critical'
                      ? isHi ? 'उच्च चेतावनी' : 'High Alert'
                      : alert.severity === 'warning'
                      ? isHi ? 'सावधानी' : 'Advisory'
                      : isHi ? 'समय विंडो' : 'Window'}
                  </span>
                  <span aria-hidden="true" className="text-slate-300 dark:text-slate-600">·</span>
                  <span>{isHi ? alert.titleHi : alert.titleEn}</span>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  {isHi ? alert.detailHi : alert.detailEn}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Main Data Grid: 24-48h Forecast Chart + Live Pollutants & Weather */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* 24-48 Hour Interactive Forecast */}
        <section
          aria-labelledby="forecast-heading"
          className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-2 dark:border-slate-800 dark:bg-[#131C26]"
        >
          <div className="flex flex-wrap items-center justify-between gap-4 pb-5">
            <div>
              <h2 id="forecast-heading" className="text-base font-semibold text-slate-900 dark:text-slate-100">
                {t.forecastTitle}
              </h2>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                {t.bestWindowLabel}: <span className="font-mono tabular-nums text-slate-700 dark:text-slate-200">{windows.bestWindowText}</span>
                <span className="mx-2" aria-hidden="true">·</span>
                {t.peakSmogLabel}: <span className="font-mono tabular-nums text-slate-700 dark:text-slate-200">{windows.worstWindowText}</span>
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex rounded-lg bg-slate-100 p-1 dark:bg-slate-800/80" role="group" aria-label="Chart metric">
                <button
                  type="button"
                  onClick={() => setChartMetric('aqi')}
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
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                    chartMetric === 'pm25'
                      ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
                  }`}
                >
                  PM2.5
                </button>
              </div>

              <div className="inline-flex rounded-lg bg-slate-100 p-1 dark:bg-slate-800/80" role="group" aria-label="Forecast horizon">
                <button
                  type="button"
                  onClick={() => setHorizon('24h')}
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

        {/* Live Pollutants & Weather Panel */}
        <section
          aria-labelledby="pollutants-heading"
          className="rounded-xl border border-slate-200 bg-white p-6 flex flex-col justify-between gap-6 dark:border-slate-800 dark:bg-[#131C26]"
        >
          <div>
            <h2 id="pollutants-heading" className="text-base font-semibold text-slate-900 dark:text-slate-100">
              {t.pollutantsTitle}
            </h2>
            <dl className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
              {[
                { name: 'PM2.5', desc: isHi ? 'सूक्ष्म कण' : 'Fine particulate', val: `${snapshot.pm25} µg/m³` },
                { name: 'PM10', desc: isHi ? 'धूल व मोटे कण' : 'Coarse dust', val: `${snapshot.pm10} µg/m³` },
                { name: 'NO2', desc: isHi ? 'ट्रैफ़िक गैस' : 'Nitrogen dioxide', val: `${snapshot.no2} µg/m³` },
                { name: 'O3', desc: isHi ? 'ओज़ोन' : 'Ground ozone', val: `${snapshot.o3} µg/m³` },
                { name: 'CO', desc: isHi ? 'कार्बन मोनोऑक्साइड' : 'Carbon monoxide', val: `${snapshot.co} mg/m³` },
              ].map((row) => (
                <div key={row.name} className="flex items-center justify-between py-2.5 text-sm">
                  <div>
                    <dt className="font-semibold text-slate-900 dark:text-slate-100">{row.name}</dt>
                    <dd className="text-xs text-slate-500 dark:text-slate-400">{row.desc}</dd>
                  </div>
                  <dd className="font-mono text-sm font-medium text-slate-900 tabular-nums dark:text-slate-100">
                    {row.val}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="border-t border-slate-200 pt-4 dark:border-slate-800">
            <h3 className="text-xs font-semibold text-slate-600 dark:text-slate-400">
              {t.weatherTitle}
            </h3>
            <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
              <div>
                <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                  <Thermometer className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{isHi ? 'तापमान' : 'Temp'}</span>
                </div>
                <p className="mt-1 font-mono font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                  {snapshot.temperatureC}°C
                </p>
              </div>
              <div>
                <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                  <Droplets className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{isHi ? 'नमी' : 'Humidity'}</span>
                </div>
                <p className="mt-1 font-mono font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                  {snapshot.humidityPct}%
                </p>
              </div>
              <div>
                <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                  <Wind className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{isHi ? 'हवा' : 'Wind'}</span>
                </div>
                <p className="mt-1 font-mono font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                  {snapshot.windKmh} km/h
                </p>
              </div>
            </div>
            <p className="mt-3 text-xs text-slate-600 dark:text-slate-300">
              {t.inversionLabel}:{' '}
              <span className="font-semibold text-slate-900 dark:text-slate-100">{inversionLabel}</span>
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
