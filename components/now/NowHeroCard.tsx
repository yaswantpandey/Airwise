'use client';

import { ArrowRight, Clock } from 'lucide-react';
import type { WindowAnalysis } from '@/lib/air-quality';
import type { Translations } from '@/lib/i18n';
import type { AirQualitySnapshot, AqiBandInfo, LanguageCode } from '@/lib/types';
import { AqiCategoryIcon } from '../AqiCategoryIcon';

interface QuickActionItem {
  label: string;
  detail: string;
}

interface NowHeroCardProps {
  snapshot: AirQualitySnapshot;
  band: AqiBandInfo;
  headline: string;
  summary: string;
  observedTime: string;
  windows: WindowAnalysis;
  quickActions: QuickActionItem[];
  language: LanguageCode;
  t: Translations;
  onOpenPlan: () => void;
  onOpenAssistant: () => void;
  onOpenProfile: () => void;
}

export function NowHeroCard({
  snapshot,
  band,
  headline,
  summary,
  observedTime,
  windows,
  quickActions,
  language,
  t,
  onOpenPlan,
  onOpenAssistant,
  onOpenProfile,
}: NowHeroCardProps) {
  const isHi = language === 'hi';
  const bandLabel = isHi ? band.labelHi : band.labelEn;
  const bandMeaning = isHi ? band.meaningHi : band.meaningEn;

  return (
    <section
      aria-labelledby="right-now-heading"
      className={`rounded-xl border p-6 sm:p-8 ${band.surfaceTintClass} ${band.borderTintClass}`}
    >
      <div className="flex flex-col gap-6 lg:flex-row lg:items-stretch lg:justify-between">
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
                  ? 'डेमो डेटा (सर्दियों का सीड)'
                  : 'Demo data (winter smog seed)'}
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
              <span className="text-sm font-medium text-slate-600 dark:text-slate-400">US AQI</span>
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

        <div className="w-full border-t border-slate-200/80 pt-5 lg:w-96 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-7 dark:border-slate-700/70">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            {isHi ? 'तुरंत करने योग्य 3 कदम' : '3 Immediate Actions'}
          </h2>
          <dl className="mt-4 divide-y divide-slate-200/80 dark:divide-slate-700/70">
            {quickActions.map((item) => (
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
              {t.bestWindowLabel}:{' '}
              <span className="font-mono tabular-nums">{windows.bestWindowText}</span>
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
