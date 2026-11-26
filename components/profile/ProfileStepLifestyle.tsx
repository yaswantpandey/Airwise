'use client';

import type {
  CommuteMode,
  HouseholdProfile,
  LanguageCode,
  OutdoorExerciseHabit,
} from '@/lib/types';

interface ProfileStepLifestyleProps {
  draft: HouseholdProfile;
  language: LanguageCode;
  onChange: (next: HouseholdProfile) => void;
}

export function ProfileStepLifestyle({ draft, language, onChange }: ProfileStepLifestyleProps) {
  const isHi = language === 'hi';

  return (
    <div className="space-y-5">
      <div>
        <label
          htmlFor="commute-select"
          className="block text-sm font-semibold text-slate-900 dark:text-slate-100"
        >
          {isHi ? 'मुख्य यात्रा तरीका' : 'Primary commute mode'}
        </label>
        <select
          id="commute-select"
          value={draft.commuteMode}
          onChange={(e) => onChange({ ...draft, commuteMode: e.target.value as CommuteMode })}
          className="mt-2 min-h-[44px] w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        >
          <option value="public_transport">
            {isHi ? 'मेट्रो / बस / सार्वजनिक परिवहन' : 'Metro / Bus / Public Transport'}
          </option>
          <option value="car">{isHi ? 'कार / कैब' : 'Car / Cab'}</option>
          <option value="two_wheeler">{isHi ? 'दोपहिया / स्कूटर' : 'Two-wheeler / Scooter'}</option>
          <option value="bike">{isHi ? 'साइकिल' : 'Bicycle'}</option>
          <option value="walk">{isHi ? 'पैदल' : 'Walking'}</option>
          <option value="wfh">{isHi ? 'वर्क फ्रॉम होम' : 'Work from Home'}</option>
        </select>
      </div>

      <div>
        <label
          htmlFor="exercise-select"
          className="block text-sm font-semibold text-slate-900 dark:text-slate-100"
        >
          {isHi ? 'बाहरी व्यायाम या सैर की आदत' : 'Outdoor exercise or walk habit'}
        </label>
        <select
          id="exercise-select"
          value={draft.outdoorExercise}
          onChange={(e) =>
            onChange({
              ...draft,
              outdoorExercise: e.target.value as OutdoorExerciseHabit,
            })
          }
          className="mt-2 min-h-[44px] w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        >
          <option value="morning">{isHi ? 'सुबह जल्दी (5–9 AM)' : 'Early Morning (5–9 AM)'}</option>
          <option value="evening">{isHi ? 'शाम (5–8 PM)' : 'Evening (5–8 PM)'}</option>
          <option value="flexible">{isHi ? 'दोपहर / लचीला समय' : 'Flexible / Midday'}</option>
          <option value="none">{isHi ? 'मुख्यतः घर के अंदर' : 'Mostly indoors'}</option>
        </select>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex min-h-[48px] cursor-pointer items-center gap-3 rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800 dark:border-slate-700 dark:text-slate-200">
          <input
            type="checkbox"
            checked={draft.workFromHome}
            onChange={(e) => onChange({ ...draft, workFromHome: e.target.checked })}
            className="h-4 w-4 rounded border-slate-300 text-teal-700"
          />
          <span>{isHi ? 'वर्क-फ्रॉम-होम विकल्प उपलब्ध' : 'Work-from-home option available'}</span>
        </label>
        <label className="flex min-h-[48px] cursor-pointer items-center gap-3 rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800 dark:border-slate-700 dark:text-slate-200">
          <input
            type="checkbox"
            checked={draft.schoolGoingKids}
            onChange={(e) => onChange({ ...draft, schoolGoingKids: e.target.checked })}
            className="h-4 w-4 rounded border-slate-300 text-teal-700"
          />
          <span>{isHi ? 'स्कूल जाने वाले बच्चे हैं' : 'School-going children in household'}</span>
        </label>
      </div>
    </div>
  );
}
