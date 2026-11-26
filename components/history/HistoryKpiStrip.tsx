'use client';

import type { HistoryTrendSummary } from '@/lib/air-quality';
import type { Translations } from '@/lib/i18n';
import type { AqiBandInfo, LanguageCode } from '@/lib/types';
import { AqiCategoryIcon } from '../AqiCategoryIcon';

interface HistoryKpiStripProps {
  spanDays: number;
  summary: HistoryTrendSummary;
  avgBand: AqiBandInfo;
  whoRatio: number;
  threshold: number;
  language: LanguageCode;
  t: Translations;
}

export function HistoryKpiStrip({
  spanDays,
  summary,
  avgBand,
  whoRatio,
  threshold,
  language,
  t,
}: HistoryKpiStripProps) {
  const isHi = language === 'hi';

  return (
    <section
      aria-label={isHi ? 'अवधि के मुख्य आँकड़े' : 'Selected period summary metrics'}
      className="grid grid-cols-1 divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-4 lg:divide-x dark:divide-slate-800 dark:border-slate-800 dark:bg-[#131C26]"
    >
      <div className="p-5">
        <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
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
        <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
          {spanDays}-{isHi ? 'दिन' : 'Day'} {t.historyAvgPm25Label}
        </p>
        <p className="mt-2 font-mono text-3xl font-bold tabular-nums text-slate-950 dark:text-white">
          {summary.avgPm257d}
          <span className="ml-1 text-sm font-normal text-slate-600 dark:text-slate-400">µg/m³</span>
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
        <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
          {t.historyCleanestDayLabel}
        </p>
        <p className="mt-2 font-mono text-3xl font-bold tabular-nums text-slate-950 dark:text-white">
          {summary.cleanestDay ? summary.cleanestDay.avgAqi : '--'}
          <span className="ml-1.5 text-sm font-normal text-slate-600 dark:text-slate-400">AQI</span>
        </p>
        <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-300">
          {summary.cleanestDay
            ? `${summary.cleanestDay.weekdayLabel}, ${summary.cleanestDay.dayLabel} · ${summary.cleanestDay.avgPm25} µg/m³`
            : '--'}
        </p>
      </div>

      <div className="p-5">
        <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
          {t.historySafeDaysLabel}
        </p>
        <p className="mt-2 font-mono text-3xl font-bold tabular-nums text-slate-950 dark:text-white">
          {summary.daysBelowThreshold}
          <span className="ml-1 text-base font-normal text-slate-600 dark:text-slate-400">
            / {spanDays} {isHi ? 'दिन' : spanDays === 1 ? 'day' : 'days'}
          </span>
        </p>
        <p className="mt-1.5 font-mono text-xs tabular-nums text-slate-600 dark:text-slate-300">
          {isHi ? `लक्ष्य: AQI ≤ ${threshold}` : `Threshold: AQI ≤ ${threshold}`}
        </p>
      </div>
    </section>
  );
}
