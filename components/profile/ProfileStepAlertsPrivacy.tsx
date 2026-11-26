'use client';

import { LogIn, LogOut, ShieldAlert, Trash2 } from 'lucide-react';
import type { Translations } from '@/lib/i18n';
import { SEED_COMMUNITY_GROUPS } from '@/lib/seed-data';
import type { HouseholdProfile, LanguageCode } from '@/lib/types';

interface ProfileStepAlertsPrivacyProps {
  draft: HouseholdProfile;
  userEmail: string | null;
  confirmDelete: boolean;
  deleting: boolean;
  language: LanguageCode;
  t: Translations;
  onChange: (next: HouseholdProfile) => void;
  onSignIn: () => void;
  onSignOut: () => void;
  onRequestDelete: () => void;
  onCancelDelete: () => void;
  onConfirmDelete: () => void;
}

export function ProfileStepAlertsPrivacy({
  draft,
  userEmail,
  confirmDelete,
  deleting,
  language,
  t,
  onChange,
  onSignIn,
  onSignOut,
  onRequestDelete,
  onCancelDelete,
  onConfirmDelete,
}: ProfileStepAlertsPrivacyProps) {
  const isHi = language === 'hi';

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center justify-between">
          <label
            htmlFor="threshold-range"
            className="text-sm font-semibold text-slate-900 dark:text-slate-100"
          >
            {isHi ? 'व्यक्तिगत AQI अलर्ट सीमा' : 'Personal AQI Alert Threshold'}
          </label>
          <span className="font-mono text-sm font-semibold tabular-nums text-teal-800 dark:text-teal-300">
            AQI {draft.alertAqiThreshold}
          </span>
        </div>
        <input
          id="threshold-range"
          type="range"
          min={50}
          max={300}
          step={10}
          value={draft.alertAqiThreshold}
          onChange={(e) => onChange({ ...draft, alertAqiThreshold: Number(e.target.value) })}
          className="mt-2 w-full accent-teal-700"
        />
        <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
          {isHi
            ? 'संवेदनशील सदस्यों के लिए AirWise स्वचालित रूप से AQI 120 या उससे कम पर चेतावनी देता है।'
            : 'AirWise automatically warns earlier (≤120 AQI) when children, elderly, or respiratory flags are active.'}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor="alias-input"
            className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
          >
            {isHi ? 'सामुदायिक उपनाम (कोई व्यक्तिगत डेटा नहीं)' : 'Community Alias (non-PII)'}
          </label>
          <input
            id="alias-input"
            type="text"
            maxLength={40}
            value={draft.displayLabel}
            onChange={(e) => onChange({ ...draft, displayLabel: e.target.value })}
            className="mt-1.5 min-h-[42px] w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
        </div>
        <div>
          <label
            htmlFor="group-select"
            className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
          >
            {isHi ? 'समुदाय / RWA समूह' : 'Community / RWA Group'}
          </label>
          <select
            id="group-select"
            value={draft.communityGroupId}
            onChange={(e) => onChange({ ...draft, communityGroupId: e.target.value })}
            className="mt-1.5 min-h-[42px] w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          >
            {SEED_COMMUNITY_GROUPS.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-3 border-t border-slate-200 pt-4 dark:border-slate-800">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {userEmail ? t.syncSavedCloud : t.demoModeNotice}
            </p>
            {userEmail && <p className="text-xs text-slate-600 dark:text-slate-300">{userEmail}</p>}
          </div>
          {userEmail ? (
            <button
              type="button"
              onClick={onSignOut}
              className="inline-flex min-h-[40px] items-center gap-2 rounded-lg border border-slate-300 px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              <span>{t.signOut}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onSignIn}
              className="inline-flex min-h-[40px] items-center gap-2 rounded-lg border border-teal-700 px-3.5 py-2 text-xs font-semibold text-teal-800 hover:bg-teal-50 dark:border-teal-500 dark:text-teal-300 dark:hover:bg-teal-950/50"
            >
              <LogIn className="h-4 w-4" aria-hidden="true" />
              <span>{t.signInGoogle}</span>
            </button>
          )}
        </div>

        {!confirmDelete ? (
          <button
            type="button"
            onClick={onRequestDelete}
            className="inline-flex min-h-[40px] items-center gap-2 text-xs font-semibold text-rose-700 hover:underline dark:text-rose-400"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{t.deleteMyDataBtn}</span>
          </button>
        ) : (
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 dark:border-rose-900/60 dark:bg-rose-950/40">
            <div className="flex items-start gap-2.5">
              <ShieldAlert
                className="mt-0.5 h-4 w-4 shrink-0 text-rose-700 dark:text-rose-400"
                aria-hidden="true"
              />
              <div className="space-y-2">
                <p className="text-xs font-semibold text-rose-900 dark:text-rose-100">
                  {t.deleteConfirmTitle}
                </p>
                <p className="text-xs text-rose-800 dark:text-rose-200">{t.deleteConfirmBody}</p>
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    disabled={deleting}
                    onClick={onConfirmDelete}
                    className="min-h-[36px] rounded-md bg-rose-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-800 disabled:opacity-50"
                  >
                    {deleting ? (isHi ? 'हटाया जा रहा है...' : 'Deleting...') : t.confirmDelete}
                  </button>
                  <button
                    type="button"
                    onClick={onCancelDelete}
                    className="min-h-[36px] rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                  >
                    {t.cancel}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
