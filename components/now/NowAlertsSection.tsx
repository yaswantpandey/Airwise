'use client';

import { Bell } from 'lucide-react';
import type { Translations } from '@/lib/i18n';
import type { AirAlertItem, LanguageCode } from '@/lib/types';

interface NowAlertsSectionProps {
  alerts: AirAlertItem[];
  threshold: number;
  language: LanguageCode;
  t: Translations;
}

export function NowAlertsSection({ alerts, threshold, language, t }: NowAlertsSectionProps) {
  const isHi = language === 'hi';

  return (
    <section
      aria-labelledby="alerts-heading"
      className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-[#131C26]"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-teal-700 dark:text-teal-400" aria-hidden="true" />
          <h2 id="alerts-heading" className="text-base font-semibold text-slate-900 dark:text-slate-100">
            {t.alertsTitle}
          </h2>
        </div>
        <span className="font-mono text-xs tabular-nums text-slate-600 dark:text-slate-300">
          {isHi ? `व्यक्तिगत सीमा: AQI ${threshold}` : `Personal threshold: AQI ${threshold}`}
        </span>
      </div>

      <ul className="divide-y divide-slate-100 dark:divide-slate-800" aria-live="polite">
        {alerts.map((alert) => (
          <li
            key={alert.id}
            className="flex flex-col gap-1 py-3.5 sm:flex-row sm:items-baseline sm:justify-between"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                <span
                  className={
                    alert.severity === 'critical'
                      ? 'text-rose-700 dark:text-rose-400'
                      : alert.severity === 'warning'
                        ? 'text-amber-900 dark:text-amber-300'
                        : 'text-teal-700 dark:text-teal-400'
                  }
                >
                  {alert.severity === 'critical'
                    ? isHi
                      ? 'उच्च चेतावनी'
                      : 'High Alert'
                    : alert.severity === 'warning'
                      ? isHi
                        ? 'सावधानी'
                        : 'Advisory'
                      : isHi
                        ? 'समय विंडो'
                        : 'Window'}
                </span>
                <span aria-hidden="true" className="text-slate-400 dark:text-slate-600">
                  ·
                </span>
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
  );
}
