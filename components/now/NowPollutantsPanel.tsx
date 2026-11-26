'use client';

import { Droplets, Thermometer, Wind } from 'lucide-react';
import type { Translations } from '@/lib/i18n';
import type { AirQualitySnapshot, LanguageCode } from '@/lib/types';

interface NowPollutantsPanelProps {
  snapshot: AirQualitySnapshot;
  inversionLabel: string;
  language: LanguageCode;
  t: Translations;
}

export function NowPollutantsPanel({
  snapshot,
  inversionLabel,
  language,
  t,
}: NowPollutantsPanelProps) {
  const isHi = language === 'hi';

  const pollutants = [
    { name: 'PM2.5', desc: isHi ? 'सूक्ष्म कण' : 'Fine particulate', val: `${snapshot.pm25} µg/m³` },
    { name: 'PM10', desc: isHi ? 'धूल व मोटे कण' : 'Coarse dust', val: `${snapshot.pm10} µg/m³` },
    { name: 'NO2', desc: isHi ? 'ट्रैफ़िक गैस' : 'Nitrogen dioxide', val: `${snapshot.no2} µg/m³` },
    { name: 'O3', desc: isHi ? 'ओज़ोन' : 'Ground ozone', val: `${snapshot.o3} µg/m³` },
    { name: 'CO', desc: isHi ? 'कार्बन मोनोऑक्साइड' : 'Carbon monoxide', val: `${snapshot.co} mg/m³` },
  ];

  return (
    <section
      aria-labelledby="pollutants-heading"
      className="flex flex-col justify-between gap-6 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-[#131C26]"
    >
      <div>
        <h2
          id="pollutants-heading"
          className="text-base font-semibold text-slate-900 dark:text-slate-100"
        >
          {t.pollutantsTitle}
        </h2>
        <dl className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
          {pollutants.map((row) => (
            <div key={row.name} className="flex items-center justify-between py-2.5 text-sm">
              <div>
                <dt className="font-semibold text-slate-900 dark:text-slate-100">{row.name}</dt>
                <dd className="text-xs text-slate-600 dark:text-slate-300">{row.desc}</dd>
              </div>
              <dd className="font-mono text-sm font-medium tabular-nums text-slate-900 dark:text-slate-100">
                {row.val}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="border-t border-slate-200 pt-4 dark:border-slate-800">
        <h3 className="text-xs font-semibold text-slate-600 dark:text-slate-300">
          {t.weatherTitle}
        </h3>
        <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
          <div>
            <div className="flex items-center gap-1 text-xs text-slate-600 dark:text-slate-300">
              <Thermometer className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{isHi ? 'तापमान' : 'Temp'}</span>
            </div>
            <p className="mt-1 font-mono font-semibold tabular-nums text-slate-900 dark:text-slate-100">
              {snapshot.temperatureC}°C
            </p>
          </div>
          <div>
            <div className="flex items-center gap-1 text-xs text-slate-600 dark:text-slate-300">
              <Droplets className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{isHi ? 'नमी' : 'Humidity'}</span>
            </div>
            <p className="mt-1 font-mono font-semibold tabular-nums text-slate-900 dark:text-slate-100">
              {snapshot.humidityPct}%
            </p>
          </div>
          <div>
            <div className="flex items-center gap-1 text-xs text-slate-600 dark:text-slate-300">
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
  );
}
