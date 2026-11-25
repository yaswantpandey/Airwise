'use client';

import { useMemo } from 'react';
import { Check, Flame, Plus, Trash2 } from 'lucide-react';
import { calculateImpactStats } from '@/lib/air-quality';
import type { Translations } from '@/lib/i18n';
import { CLEAN_AIR_ACTIONS } from '@/lib/seed-data';
import type {
  ActionLogEntry,
  CleanAirActionOption,
  LanguageCode,
} from '@/lib/types';

interface ImpactTrackerViewProps {
  logs: ActionLogEntry[];
  language: LanguageCode;
  t: Translations;
  onLogAction: (action: CleanAirActionOption) => void;
  onDeleteLog: (id: string) => void;
}

export function ImpactTrackerView({
  logs,
  language,
  t,
  onLogAction,
  onDeleteLog,
}: ImpactTrackerViewProps) {
  const isHi = language === 'hi';
  const stats = useMemo(() => calculateImpactStats(logs), [logs]);
  const todayKey = new Date().toISOString().slice(0, 10);

  const loggedTodayIds = useMemo(() => {
    const set = new Set<string>();
    for (const l of logs) {
      if (l.dateKey === todayKey) set.add(l.actionId);
    }
    return set;
  }, [logs, todayKey]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl dark:text-slate-50">
          {t.trackerTitle}
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          {t.trackerSubtitle}
        </p>
      </div>

      {/* 4-Column Weekly Impact Strip (Tabular Numerals) */}
      <section
        aria-label="Weekly impact totals"
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#131C26]">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {t.weeklyExposureLabel}
          </p>
          <p
            data-testid="stat-exposure-avoided"
            className="mt-2 font-mono text-2xl font-semibold text-slate-900 tabular-nums dark:text-white"
          >
            ~{stats.weeklyPm25AvoidedUg}{' '}
            <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
              µg·h/m³
            </span>
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {t.approximateTag}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#131C26]">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {t.weeklyCo2Label}
          </p>
          <p
            data-testid="stat-co2-saved"
            className="mt-2 font-mono text-2xl font-semibold text-slate-900 tabular-nums dark:text-white"
          >
            ~{stats.weeklyCo2SavedKg.toFixed(1)}{' '}
            <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
              kg CO2
            </span>
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {t.approximateTag}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#131C26]">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {t.weeklyPmLabel}
          </p>
          <p
            data-testid="stat-pm-saved"
            className="mt-2 font-mono text-2xl font-semibold text-slate-900 tabular-nums dark:text-white"
          >
            ~{stats.weeklyPmSavedGrams.toFixed(1)}{' '}
            <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
              g PM
            </span>
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {t.approximateTag}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#131C26]">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {t.streakLabel}
          </p>
          <p
            data-testid="stat-streak"
            className="mt-2 inline-flex items-baseline gap-2 font-mono text-2xl font-semibold text-teal-800 tabular-nums dark:text-teal-300"
          >
            <Flame className="h-5 w-5 self-center text-teal-700 dark:text-teal-400" aria-hidden="true" />
            <span>{stats.streakDays}</span>
            <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
              {isHi ? 'दिन लगातार' : stats.streakDays === 1 ? 'day' : 'days'}
            </span>
          </p>
          <p className="mt-1 text-xs text-slate-500 tabular-nums dark:text-slate-400">
            {stats.weeklyActions} {isHi ? 'कदम इस सप्ताह' : 'actions this week'}
          </p>
        </div>
      </section>

      {/* Quick Action Logger */}
      <section
        aria-labelledby="log-actions-heading"
        className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-[#131C26]"
      >
        <div className="flex flex-wrap items-baseline justify-between gap-2 pb-4 border-b border-slate-100 dark:border-slate-800">
          <h2 id="log-actions-heading" className="text-base font-semibold text-slate-900 dark:text-slate-100">
            {t.logActionHeading}
          </h2>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {isHi ? 'सभी बचत मान पारदर्शी अनुमान हैं' : 'All impact values are transparent approximations'}
          </span>
        </div>

        <div className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
          {CLEAN_AIR_ACTIONS.map((action) => {
            const doneToday = loggedTodayIds.has(action.actionId);
            const label = isHi ? action.labelHi : action.labelEn;
            const assumption = isHi ? action.assumptionHi : action.assumptionEn;

            return (
              <div
                key={action.actionId}
                className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-x-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                    <span>{label}</span>
                    {doneToday && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-teal-700 dark:text-teal-300">
                        <Check className="h-3.5 w-3.5" aria-hidden="true" />
                        {isHi ? 'आज लॉग किया गया' : 'Logged today'}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {assumption}
                  </p>
                  <p className="font-mono text-xs text-slate-600 tabular-nums dark:text-slate-300">
                    ~{action.pm25AvoidedUg} µg·h/m³ PM2.5
                    {action.co2SavedKg > 0 ? ` · ~${action.co2SavedKg} kg CO2` : ''}
                    {action.pmSavedGrams > 0 ? ` · ~${action.pmSavedGrams} g PM` : ''}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => onLogAction(action)}
                  aria-label={`Log ${action.labelEn}`}
                  className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-lg border border-teal-700 bg-white px-4 py-2 text-xs font-semibold text-teal-800 transition-colors hover:bg-teal-50 whitespace-nowrap shrink-0 dark:border-teal-500 dark:bg-transparent dark:text-teal-300 dark:hover:bg-teal-950/60"
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  <span>{isHi ? 'लॉग करें' : 'Log Action'}</span>
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* Recent Logs Table */}
      <section
        aria-labelledby="recent-logs-heading"
        className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-[#131C26]"
      >
        <h2 id="recent-logs-heading" className="text-base font-semibold text-slate-900 dark:text-slate-100">
          {t.recentLogsHeading}
        </h2>

        {logs.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
            {isHi
              ? 'अभी तक कोई कदम लॉग नहीं हुआ है। ऊपर से अपना पहला स्वच्छ-वायु कदम जोड़ें।'
              : 'No actions logged yet. Log your first clean-air action above to start your streak.'}
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[540px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500 dark:border-slate-800 dark:text-slate-400">
                  <th className="pb-2.5 pr-4">{isHi ? 'तिथि' : 'Date'}</th>
                  <th className="pb-2.5 pr-4">{isHi ? 'कदम' : 'Action'}</th>
                  <th className="pb-2.5 pr-4 text-right">PM2.5 Avoided</th>
                  <th className="pb-2.5 pr-4 text-right">CO2 Saved</th>
                  <th className="pb-2.5 text-right">{isHi ? 'हटाएँ' : 'Remove'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {logs.slice(0, 15).map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30">
                    <td className="py-3 pr-4 font-mono text-xs text-slate-500 tabular-nums dark:text-slate-400">
                      {log.dateKey}
                    </td>
                    <td className="py-3 pr-4 font-medium text-slate-900 dark:text-slate-100">
                      {log.label}
                    </td>
                    <td className="py-3 pr-4 text-right font-mono text-xs tabular-nums text-slate-700 dark:text-slate-300">
                      ~{log.pm25AvoidedUg} µg·h/m³
                    </td>
                    <td className="py-3 pr-4 text-right font-mono text-xs tabular-nums text-slate-700 dark:text-slate-300">
                      ~{log.co2SavedKg.toFixed(1)} kg
                    </td>
                    <td className="py-3 text-right">
                      <button
                        type="button"
                        onClick={() => onDeleteLog(log.id)}
                        aria-label={`Remove logged action ${log.label}`}
                        className="inline-flex min-h-[36px] min-w-[36px] items-center justify-center rounded-md text-slate-400 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/50 dark:hover:text-rose-300"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
