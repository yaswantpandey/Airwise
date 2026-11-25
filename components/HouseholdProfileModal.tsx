'use client';

import { useState } from 'react';
import { LogIn, LogOut, ShieldAlert, Trash2, X } from 'lucide-react';
import type { Translations } from '@/lib/i18n';
import { SEED_COMMUNITY_GROUPS } from '@/lib/seed-data';
import type {
  BudgetLevel,
  CommuteMode,
  CookingFuelType,
  HouseholdProfile,
  LanguageCode,
  MaskType,
  OutdoorExerciseHabit,
  VentilationType,
} from '@/lib/types';

interface HouseholdProfileModalProps {
  open: boolean;
  initialProfile: HouseholdProfile;
  userEmail: string | null;
  language: LanguageCode;
  t: Translations;
  onClose: () => void;
  onSave: (next: HouseholdProfile) => void;
  onSignIn: () => void;
  onSignOut: () => void;
  onDeleteAllData: () => Promise<void>;
}

export function HouseholdProfileModal({
  open,
  initialProfile,
  userEmail,
  language,
  t,
  onClose,
  onSave,
  onSignIn,
  onSignOut,
  onDeleteAllData,
}: HouseholdProfileModalProps) {
  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState<HouseholdProfile>(initialProfile);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  if (!open) return null;

  const isHi = language === 'hi';

  function toggleMask(mask: MaskType) {
    setDraft((prev) => {
      const exists = prev.maskTypes.includes(mask);
      if (mask === 'none') {
        return { ...prev, maskTypes: exists ? [] : ['none'] };
      }
      const withoutNone = prev.maskTypes.filter((m) => m !== 'none');
      return {
        ...prev,
        maskTypes: exists
          ? withoutNone.filter((m) => m !== mask)
          : [...withoutNone, mask].slice(0, 5),
      };
    });
  }

  function handleSave() {
    const hasHealthFlag =
      draft.hasChildren ||
      draft.hasElderly ||
      draft.hasPregnant ||
      draft.hasAsthmaOrRespiratory ||
      draft.hasHeartCondition;

    if (hasHealthFlag && !draft.healthConsentAccepted) {
      setValidationError(
        isHi
          ? 'वैकल्पिक स्वास्थ्य संवेदनशीलता सहेजने के लिए कृपया गोपनीयता सहमति चुनें।'
          : 'Please accept the explicit health-data privacy consent before saving optional sensitivity flags.'
      );
      setStep(1);
      return;
    }

    setValidationError(null);
    onSave(draft);
    onClose();
  }

  async function handleConfirmDelete() {
    setDeleting(true);
    try {
      await onDeleteAllData();
      setConfirmDelete(false);
      onClose();
    } finally {
      setDeleting(false);
    }
  }

  const totalSteps = 4;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
    >
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-[#131C26]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
          <div>
            <p className="text-xs font-medium text-teal-800 dark:text-teal-300">
              {isHi ? `चरण ${step} / ${totalSteps}` : `Step ${step} of ${totalSteps}`}
            </p>
            <h2 id="onboarding-title" className="text-lg font-semibold text-slate-900 dark:text-slate-50">
              {t.onboardingTitle}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close household profile setup"
            className="inline-flex min-h-[40px] min-w-[40px] items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* Step Indicator Bar */}
        <div className="grid grid-cols-4 gap-1 bg-slate-50 px-6 py-2.5 dark:bg-slate-900/50">
          {[
            isHi ? '1. सदस्य' : '1. Members',
            isHi ? '2. दिनचर्या' : '2. Lifestyle',
            isHi ? '3. घर व मास्क' : '3. Home',
            isHi ? '4. अलर्ट व डेटा' : '4. Alerts & Privacy',
          ].map((label, idx) => {
            const stepNum = idx + 1;
            const active = step === stepNum;
            return (
              <button
                key={label}
                type="button"
                onClick={() => setStep(stepNum)}
                className={`rounded-md px-2 py-1.5 text-center text-xs font-medium transition-colors whitespace-nowrap truncate ${
                  active
                    ? 'bg-white text-teal-800 shadow-xs dark:bg-slate-800 dark:text-teal-300'
                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Body */}
        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
          {validationError && (
            <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-medium text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200">
              {validationError}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {isHi
                    ? 'परिवार में संवेदनशील सदस्य (वैकल्पिक, पूर्णतः निजी)'
                    : 'Sensitive household members (optional, private)'}
                </h3>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {isHi
                    ? 'हम न्यूनतम जानकारी लेते हैं ताकि मास्क, खेल और अलर्ट की सलाह सही मिल सके।'
                    : 'We collect minimal flags solely to personalize mask, outdoor window, and alert thresholds.'}
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {(
                  [
                    ['hasChildren', isHi ? 'बच्चे (12 वर्ष से कम)' : 'Children (under 12)'],
                    ['hasElderly', isHi ? 'बुजुर्ग (60+ वर्ष)' : 'Elderly members (60+)'],
                    ['hasPregnant', isHi ? 'गर्भवती सदस्य' : 'Pregnant member'],
                    [
                      'hasAsthmaOrRespiratory',
                      isHi ? 'अस्थमा / श्वसन संवेदनशीलता' : 'Asthma / respiratory condition',
                    ],
                    ['hasHeartCondition', isHi ? 'हृदय रोग संवेदनशीलता' : 'Heart / cardiovascular condition'],
                  ] as const
                ).map(([key, label]) => (
                  <label
                    key={key}
                    className="flex min-h-[48px] cursor-pointer items-center gap-3 rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800/60"
                  >
                    <input
                      type="checkbox"
                      checked={draft[key]}
                      onChange={(e) => setDraft({ ...draft, [key]: e.target.checked })}
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
                  onChange={(e) =>
                    setDraft({ ...draft, healthConsentAccepted: e.target.checked })
                  }
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-teal-700 focus:ring-teal-700"
                />
                <span>
                  {isHi
                    ? 'मैं वैकल्पिक स्वास्थ्य संवेदनशीलता प्राथमिकताओं को केवल मेरे निजी AirWise मार्गदर्शन के लिए सहेजने की स्पष्ट सहमति देता/देती हूँ। मैं इन्हें कभी भी हटा सकता/सकती हूँ।'
                    : 'I give explicit consent to store these optional sensitivity flags strictly for personalizing my AirWise guidance. They are never shared publicly and can be deleted anytime.'}
                </span>
              </label>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <div>
                <label htmlFor="commute-select" className="block text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {isHi ? 'मुख्य यात्रा तरीका' : 'Primary commute mode'}
                </label>
                <select
                  id="commute-select"
                  value={draft.commuteMode}
                  onChange={(e) =>
                    setDraft({ ...draft, commuteMode: e.target.value as CommuteMode })
                  }
                  className="mt-2 min-h-[44px] w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                >
                  <option value="public_transport">Metro / Bus / Public Transport</option>
                  <option value="car">Car / Cab</option>
                  <option value="two_wheeler">Two-wheeler / Scooter</option>
                  <option value="bike">Bicycle</option>
                  <option value="walk">Walking</option>
                  <option value="wfh">Work from Home</option>
                </select>
              </div>

              <div>
                <label htmlFor="exercise-select" className="block text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {isHi ? 'बाहरी व्यायाम या सैर की आदत' : 'Outdoor exercise or walk habit'}
                </label>
                <select
                  id="exercise-select"
                  value={draft.outdoorExercise}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      outdoorExercise: e.target.value as OutdoorExerciseHabit,
                    })
                  }
                  className="mt-2 min-h-[44px] w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                >
                  <option value="morning">Early Morning (5–9 AM)</option>
                  <option value="evening">Evening (5–8 PM)</option>
                  <option value="flexible">Flexible / Midday</option>
                  <option value="none">Mostly indoors</option>
                </select>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex min-h-[48px] cursor-pointer items-center gap-3 rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800 dark:border-slate-700 dark:text-slate-200">
                  <input
                    type="checkbox"
                    checked={draft.workFromHome}
                    onChange={(e) => setDraft({ ...draft, workFromHome: e.target.checked })}
                    className="h-4 w-4 rounded border-slate-300 text-teal-700"
                  />
                  <span>{isHi ? 'वर्क-फ्रॉम-होम विकल्प उपलब्ध' : 'Work-from-home option available'}</span>
                </label>
                <label className="flex min-h-[48px] cursor-pointer items-center gap-3 rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800 dark:border-slate-700 dark:text-slate-200">
                  <input
                    type="checkbox"
                    checked={draft.schoolGoingKids}
                    onChange={(e) => setDraft({ ...draft, schoolGoingKids: e.target.checked })}
                    className="h-4 w-4 rounded border-slate-300 text-teal-700"
                  />
                  <span>{isHi ? 'स्कूल जाने वाले बच्चे हैं' : 'School-going children in household'}</span>
                </label>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex min-h-[48px] cursor-pointer items-center gap-3 rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800 dark:border-slate-700 dark:text-slate-200">
                  <input
                    type="checkbox"
                    checked={draft.hasAirPurifier}
                    onChange={(e) => setDraft({ ...draft, hasAirPurifier: e.target.checked })}
                    className="h-4 w-4 rounded border-slate-300 text-teal-700"
                  />
                  <span>{isHi ? 'घर में HEPA एयर प्यूरीफ़ायर है' : 'Have HEPA air purifier at home'}</span>
                </label>
                <label className="flex min-h-[48px] cursor-pointer items-center gap-3 rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800 dark:border-slate-700 dark:text-slate-200">
                  <input
                    type="checkbox"
                    checked={draft.hasIndoorPlants}
                    onChange={(e) => setDraft({ ...draft, hasIndoorPlants: e.target.checked })}
                    className="h-4 w-4 rounded border-slate-300 text-teal-700"
                  />
                  <span>{isHi ? 'घर के अंदर पौधे हैं' : 'Have indoor plants'}</span>
                </label>
              </div>

              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {isHi ? 'उपलब्ध मास्क प्रकार' : 'Mask types currently owned'}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(
                    [
                      ['n95', 'N95'],
                      ['kn95', 'KN95 / KF94'],
                      ['n99', 'N99'],
                      ['surgical', 'Surgical'],
                      ['cloth', 'Cloth'],
                      ['none', 'None'],
                    ] as const
                  ).map(([val, label]) => {
                    const active = draft.maskTypes.includes(val);
                    return (
                      <button
                        key={val}
                        type="button"
                        onClick={() => toggleMask(val)}
                        className={`min-h-[40px] rounded-lg border px-3.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                          active
                            ? 'border-teal-700 bg-teal-700 text-white dark:border-teal-500 dark:bg-teal-600'
                            : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label htmlFor="vent-select" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {isHi ? 'वेंटिलेशन' : 'Ventilation'}
                  </label>
                  <select
                    id="vent-select"
                    value={draft.ventilationType}
                    onChange={(e) =>
                      setDraft({ ...draft, ventilationType: e.target.value as VentilationType })
                    }
                    className="mt-1.5 min-h-[42px] w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                  >
                    <option value="standard_windows">Standard windows</option>
                    <option value="sealed_ac">Sealed / AC room</option>
                    <option value="cross_ventilated">Cross-ventilated</option>
                    <option value="balcony_open">Open balcony doors</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="fuel-select" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {isHi ? 'रसोई ईंधन' : 'Cooking fuel'}
                  </label>
                  <select
                    id="fuel-select"
                    value={draft.cookingFuel}
                    onChange={(e) =>
                      setDraft({ ...draft, cookingFuel: e.target.value as CookingFuelType })
                    }
                    className="mt-1.5 min-h-[42px] w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                  >
                    <option value="png_piped">Piped Natural Gas (PNG)</option>
                    <option value="lpg">LPG Cylinder</option>
                    <option value="induction_electric">Induction / Electric</option>
                    <option value="biomass_solid">Solid fuel / Biomass</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="budget-select" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {isHi ? 'बजट स्तर' : 'Budget level'}
                  </label>
                  <select
                    id="budget-select"
                    value={draft.budgetLevel}
                    onChange={(e) =>
                      setDraft({ ...draft, budgetLevel: e.target.value as BudgetLevel })
                    }
                    className="mt-1.5 min-h-[42px] w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                  >
                    <option value="low">Low-cost / DIY focus</option>
                    <option value="medium">Moderate</option>
                    <option value="flexible">Flexible</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-5">
              <div>
                <div className="flex items-center justify-between">
                  <label htmlFor="threshold-range" className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {isHi ? 'व्यक्तिगत AQI अलर्ट सीमा' : 'Personal AQI Alert Threshold'}
                  </label>
                  <span className="font-mono text-sm font-semibold text-teal-800 tabular-nums dark:text-teal-300">
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
                  onChange={(e) =>
                    setDraft({ ...draft, alertAqiThreshold: Number(e.target.value) })
                  }
                  className="mt-2 w-full accent-teal-700"
                />
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {isHi
                    ? 'संवेदनशील सदस्यों के लिए AirWise स्वचालित रूप से AQI 120 या उससे कम पर चेतावनी देता है।'
                    : 'AirWise automatically warns earlier (≤120 AQI) when children, elderly, or respiratory flags are active.'}
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="alias-input" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {isHi ? 'सामुदायिक उपनाम (कोई व्यक्तिगत डेटा नहीं)' : 'Community Alias (non-PII)'}
                  </label>
                  <input
                    id="alias-input"
                    type="text"
                    maxLength={40}
                    value={draft.displayLabel}
                    onChange={(e) => setDraft({ ...draft, displayLabel: e.target.value })}
                    className="mt-1.5 min-h-[42px] w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label htmlFor="group-select" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {isHi ? 'समुदाय / RWA समूह' : 'Community / RWA Group'}
                  </label>
                  <select
                    id="group-select"
                    value={draft.communityGroupId}
                    onChange={(e) => setDraft({ ...draft, communityGroupId: e.target.value })}
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

              {/* Cloud Sync Account + Delete My Data */}
              <div className="space-y-3 border-t border-slate-200 pt-4 dark:border-slate-800">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {userEmail ? t.syncSavedCloud : t.demoModeNotice}
                    </p>
                    {userEmail && (
                      <p className="text-xs text-slate-500 dark:text-slate-400">{userEmail}</p>
                    )}
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
                    onClick={() => setConfirmDelete(true)}
                    className="inline-flex min-h-[40px] items-center gap-2 text-xs font-semibold text-rose-700 hover:underline dark:text-rose-400"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>{t.deleteMyDataBtn}</span>
                  </button>
                ) : (
                  <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 dark:border-rose-900/60 dark:bg-rose-950/40">
                    <div className="flex items-start gap-2.5">
                      <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-rose-700 dark:text-rose-400" aria-hidden="true" />
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-rose-900 dark:text-rose-100">
                          {t.deleteConfirmTitle}
                        </p>
                        <p className="text-xs text-rose-800 dark:text-rose-200">
                          {t.deleteConfirmBody}
                        </p>
                        <div className="flex gap-2 pt-1">
                          <button
                            type="button"
                            disabled={deleting}
                            onClick={() => void handleConfirmDelete()}
                            className="min-h-[36px] rounded-md bg-rose-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-800 disabled:opacity-50"
                          >
                            {deleting ? 'Deleting...' : t.confirmDelete}
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDelete(false)}
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
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-200 px-6 py-4 dark:border-slate-800">
          <button
            type="button"
            onClick={() => (step > 1 ? setStep(step - 1) : onClose())}
            className="min-h-[44px] rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            {step > 1 ? t.stepBack : t.cancel}
          </button>

          {step < totalSteps ? (
            <button
              type="button"
              onClick={() => setStep(step + 1)}
              className="min-h-[44px] rounded-lg bg-teal-700 px-5 py-2 text-sm font-medium text-white hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-500"
            >
              {t.stepNext}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSave}
              className="min-h-[44px] rounded-lg bg-teal-700 px-5 py-2 text-sm font-medium text-white hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-500"
            >
              {t.saveProfile}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
