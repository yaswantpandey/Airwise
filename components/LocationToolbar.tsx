'use client';

import type { FormEvent } from 'react';
import { Languages, MapPin, Moon, Search, Sun } from 'lucide-react';
import type { Translations } from '@/lib/i18n';
import { PRESET_CITIES } from '@/lib/seed-data';
import type { LanguageCode } from '@/lib/types';
import { PWAInstallButton } from './PWAInstallButton';

interface LocationToolbarProps {
  cityInput: string;
  currentLocationName: string;
  language: LanguageCode;
  darkMode: boolean;
  t: Translations;
  onCityInputChange: (val: string) => void;
  onCitySearch: (e: FormEvent) => void;
  onGeolocate: () => void;
  onSelectPresetCity: (city: string) => void;
  onToggleLanguage: () => void;
  onToggleDarkMode: () => void;
}

export function LocationToolbar({
  cityInput,
  currentLocationName,
  language,
  darkMode,
  t,
  onCityInputChange,
  onCitySearch,
  onGeolocate,
  onSelectPresetCity,
  onToggleLanguage,
  onToggleDarkMode,
}: LocationToolbarProps) {
  return (
    <div className="mb-6 flex flex-col gap-3 border-b border-slate-200 pb-5 lg:flex-row lg:items-center lg:justify-between dark:border-slate-800">
      <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
        <form onSubmit={onCitySearch} className="relative flex max-w-md flex-1 items-center">
          <label htmlFor="city-search-input" className="sr-only">
            {t.searchPlaceholder}
          </label>
          <Search
            className="pointer-events-none absolute left-3 h-4 w-4 text-slate-500"
            aria-hidden="true"
          />
          <input
            id="city-search-input"
            type="text"
            value={cityInput}
            onChange={(e) => onCityInputChange(e.target.value)}
            placeholder={t.searchPlaceholder}
            maxLength={80}
            className="min-h-[42px] w-full rounded-lg border border-slate-300 bg-white pl-9 pr-20 text-sm text-slate-900 placeholder:text-slate-500 focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-700/20 dark:border-slate-700 dark:bg-[#131C26] dark:text-slate-100 dark:placeholder:text-slate-400"
          />
          <button
            type="submit"
            className="absolute right-1.5 rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600"
          >
            {language === 'hi' ? 'खोजें' : 'Go'}
          </button>
        </form>

        <button
          type="button"
          onClick={onGeolocate}
          className="inline-flex min-h-[42px] items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 whitespace-nowrap shrink-0 dark:border-slate-700 dark:bg-[#131C26] dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <MapPin className="h-3.5 w-3.5 text-teal-700 dark:text-teal-400" aria-hidden="true" />
          <span>{t.locateMe}</span>
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div
          className="flex items-center gap-1 overflow-x-auto"
          role="group"
          aria-label={language === 'hi' ? 'त्वरित शहर चयन' : 'Quick city selection'}
        >
          {PRESET_CITIES.slice(0, 4).map((c) => {
            const selected = currentLocationName.toLowerCase() === c.name.toLowerCase();
            return (
              <button
                key={c.name}
                type="button"
                aria-pressed={selected}
                onClick={() => onSelectPresetCity(c.name)}
                className={`min-h-[38px] rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  selected
                    ? 'bg-slate-900 text-white dark:bg-slate-200 dark:text-slate-950'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100'
                }`}
              >
                {c.name}
              </button>
            );
          })}
        </div>

        <span className="hidden h-5 w-px bg-slate-200 sm:inline-block dark:bg-slate-800" aria-hidden="true" />

        <button
          type="button"
          onClick={onToggleLanguage}
          aria-label="Toggle language between English and Hindi"
          className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0 dark:border-slate-700 dark:bg-[#131C26] dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <Languages className="h-3.5 w-3.5" aria-hidden="true" />
          <span>{language === 'en' ? 'हिन्दी' : 'English'}</span>
        </button>

        <button
          type="button"
          onClick={onToggleDarkMode}
          aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          className="inline-flex min-h-[40px] min-w-[40px] items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 shrink-0 dark:border-slate-700 dark:bg-[#131C26] dark:text-slate-200 dark:hover:bg-slate-800"
        >
          {darkMode ? (
            <Sun className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Moon className="h-4 w-4" aria-hidden="true" />
          )}
        </button>

        <PWAInstallButton />
      </div>
    </div>
  );
}
