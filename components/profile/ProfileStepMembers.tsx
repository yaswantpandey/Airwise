'use client';

import type { HouseholdProfile, LanguageCode } from '@/lib/types';

interface ProfileStepMembersProps {
  draft: HouseholdProfile;
  language: LanguageCode;
  onChange: (next: HouseholdProfile) => void;
}

export function ProfileStepMembers({ draft, language, onChange }: ProfileStepMembersProps) {
  const isHi = language === 'hi';

  const memberFlags = [
    ['hasChildren', isHi ? 'बच्चे (12 वर्ष से कम)' : 'Children (under 12)'],
    ['hasElderly', isHi ? 'बुजुर्ग (60+ वर्ष)' : 'Elderly members (60+)'],
    ['hasPregnant', isHi ? 'गर्भवती सदस्य' : 'Pregnant member'],
    [
      'hasAsthmaOrRespiratory',
      isHi ? 'अस्थमा / श्वसन संवेदनशीलता' : 'Asthma / respiratory condition',
    ],
    ['hasHeartCondition', isHi ? 'हृदय रोग संवेदनशीलता' : 'Heart / cardiovascular condition'],
  ] as const;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          {isHi
            ? 'परिवार में संवेदनशील सदस्य (वैकल्पिक, पूर्णतः निजी)'
            : 'Sensitive household members (optional, private)'}
        </h3>
        <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
          {isHi
            ? 'हम न्यूनतम जानकारी लेते हैं ताकि मास्क, खेल और अलर्ट की सलाह सही मिल सके।'
            : 'We collect minimal flags solely to personalize mask, outdoor window, and alert thresholds.'}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {memberFlags.map(([key, label]) => (
          <label
            key={key}
            className="flex min-h-[48px] cursor-pointer items-center gap-3 rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800/60"
          >
            <input
              type="checkbox"
              checked={draft[key]}
              onChange={(e) => onChange({ ...draft, [key]: e.target.checked })}
              className="h-4 w-4 rounded border-slate-300 text-teal-700 focus:ring-teal-700"
            />
            <span>{label}</span>
          </label>
        ))}
      </div>

      <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-teal-200 bg-teal-50/50 p-3.5 text-xs leading-relaxed text-slate-700 dark:border-teal-900/60 dark:bg-teal-950/30 dark:text-slate-300">
        <input
          type="checkbox"
          checked={draft.healthConsentAccepted}
          onChange={(e) => onChange({ ...draft, healthConsentAccepted: e.target.checked })}
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-teal-700 focus:ring-teal-700"
        />
        <span>
          {isHi
            ? 'मैं वैकल्पिक स्वास्थ्य संवेदनशीलता प्राथमिकताओं को केवल मेरे निजी AirWise मार्गदर्शन के लिए सहेजने की स्पष्ट सहमति देता/देती हूँ। मैं इन्हें कभी भी हटा सकता/सकती हूँ।'
            : 'I give explicit consent to store these optional sensitivity flags strictly for personalizing my AirWise guidance. They are never shared publicly and can be deleted anytime.'}
        </span>
      </label>
    </div>
  );
}
