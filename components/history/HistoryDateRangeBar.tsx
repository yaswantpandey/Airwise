'use client';

import type { FormEvent } from 'react';
import { Calendar } from 'lucide-react';
import type { Translations } from '@/lib/i18n';
import type { LanguageCode } from '@/lib/types';

export type RangePreset = '7d' | '14d' | '30d' | 'custom';

interface HistoryDateRangeBarProps {
  rangePreset: RangePreset;
  draftStartDate: string;
  draftEndDate: string;
  minSelectableIso: string;
  todayIso: string;
  loadingRange: boolean;
  rangeError: string | null;
  language: LanguageCode;
  t: Translations;
  onSelectPreset: (preset: '7d' | '14d' | '30d') => void;
  onChangeStartDate: (val: string) => void;
  onChangeEndDate: (val: string) => void;
  onApplyCustomRange: (e: FormEvent) => void;
}

export function HistoryDateRangeBar({
  rangePreset,
  draftStartDate,
  draftEndDate,
  minSelectableIso,
  todayIso,
  loadingRange,
  rangeError,
  language,
  t,
  onSelectPreset,
  onChangeStartDate,
  onChangeEndDate,
  onApplyCustomRange,
}: HistoryDateRangeBarProps) {
  const isHi = language === 'hi';

  return (
    <>
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
                onClick={() => onSelectPreset(preset.key)}
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
          onSubmit={onApplyCustomRange}
          aria-label={isHi ? 'कस्टम तिथि अवधि' : 'Custom date range'}
          className="flex flex-wrap items-end gap-2.5"
        >
          <div className="flex flex-col gap-1">
            <label
              htmlFor="history-start-date"
              className="text-[11px] font-medium text-slate-600 dark:text-slate-300"
            >
              {t.historyFromLabel}
            </label>
            <input
              id="history-start-date"
              type="date"
              value={draftStartDate}
              min={minSelectableIso}
              max={todayIso}
              onChange={(e) => onChangeStartDate(e.target.value)}
              className="min-h-[40px] rounded-lg border border-slate-300 bg-white px-3 py-1.5 font-mono text-xs tabular-nums text-slate-900 focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-700/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label
              htmlFor="history-end-date"
              className="text-[11px] font-medium text-slate-600 dark:text-slate-300"
            >
              {t.historyToLabel}
            </label>
            <input
              id="history-end-date"
              type="date"
              value={draftEndDate}
              min={minSelectableIso}
              max={todayIso}
              onChange={(e) => onChangeEndDate(e.target.value)}
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
        <p role="alert" className="mt-3 text-xs font-medium text-rose-700 dark:text-rose-400">
          {rangeError}
        </p>
      )}
    </>
  );
}
