'use client';

import { getAqiBand, type HistoryTrendSummary } from '@/lib/air-quality';
import type { Translations } from '@/lib/i18n';
import type { DailyHistoryPoint, LanguageCode } from '@/lib/types';
import { AqiCategoryIcon } from '../AqiCategoryIcon';

interface HistoryDailyTableProps {
  activeHistory: DailyHistoryPoint[];
  todayIso: string;
  summary: HistoryTrendSummary;
  language: LanguageCode;
  t: Translations;
}

export function HistoryDailyTable({
  activeHistory,
  todayIso,
  summary,
  language,
  t,
}: HistoryDailyTableProps) {
  const isHi = language === 'hi';

  return (
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
          <span className="font-mono text-xs tabular-nums text-slate-600 dark:text-slate-300">
            {isHi
              ? `सबसे खराब दिन: ${summary.worstDay.dayLabel} (AQI ${summary.worstDay.avgAqi})`
              : `Peak smog day: ${summary.worstDay.dayLabel} (Avg AQI ${summary.worstDay.avgAqi})`}
          </span>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-xs font-medium text-slate-600 dark:border-slate-800 dark:text-slate-300">
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
                      <span className="text-slate-500 dark:text-slate-400">—</span>
                    ) : diff < 0 ? (
                      <span className="font-medium text-teal-700 dark:text-teal-400">
                        {diff} AQI
                      </span>
                    ) : diff > 0 ? (
                      <span className="font-medium text-rose-700 dark:text-rose-400">
                        +{diff} AQI
                      </span>
                    ) : (
                      <span className="text-slate-600 dark:text-slate-400">0 AQI</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
