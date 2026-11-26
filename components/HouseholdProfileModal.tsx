'use client';

import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import type { Translations } from '@/lib/i18n';
import type { HouseholdProfile, LanguageCode, MaskType } from '@/lib/types';
import { ProfileStepAlertsPrivacy } from './profile/ProfileStepAlertsPrivacy';
import { ProfileStepHome } from './profile/ProfileStepHome';
import { ProfileStepLifestyle } from './profile/ProfileStepLifestyle';
import { ProfileStepMembers } from './profile/ProfileStepMembers';

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

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

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
  const dialogRef = useRef<HTMLDivElement>(null);

  // Trap focus inside modal, close on Escape, and restore focus to trigger on close
  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const container = dialogRef.current;
    const focusables = container?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
    focusables?.[0]?.focus();

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== 'Tab' || !container) return;
      const items = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previouslyFocused?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  const isHi = language === 'hi';
  const totalSteps = 4;

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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
    >
      <div
        ref={dialogRef}
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-[#131C26]"
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
          <div>
            <p className="text-xs font-medium text-teal-800 dark:text-teal-300">
              {isHi ? `चरण ${step} / ${totalSteps}` : `Step ${step} of ${totalSteps}`}
            </p>
            <h2
              id="onboarding-title"
              className="text-lg font-semibold text-slate-900 dark:text-slate-50"
            >
              {t.onboardingTitle}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={isHi ? 'परिवार प्रोफ़ाइल बंद करें' : 'Close household profile setup'}
            className="inline-flex min-h-[40px] min-w-[40px] items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

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
                aria-current={active ? 'step' : undefined}
                onClick={() => setStep(stepNum)}
                className={`rounded-md px-2 py-1.5 text-center text-xs font-medium transition-colors whitespace-nowrap truncate ${
                  active
                    ? 'bg-white text-teal-800 shadow-xs dark:bg-slate-800 dark:text-teal-300'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
          {validationError && (
            <div
              role="alert"
              className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-medium text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200"
            >
              {validationError}
            </div>
          )}

          {step === 1 && (
            <ProfileStepMembers draft={draft} language={language} onChange={setDraft} />
          )}
          {step === 2 && (
            <ProfileStepLifestyle draft={draft} language={language} onChange={setDraft} />
          )}
          {step === 3 && (
            <ProfileStepHome
              draft={draft}
              language={language}
              onChange={setDraft}
              onToggleMask={toggleMask}
            />
          )}
          {step === 4 && (
            <ProfileStepAlertsPrivacy
              draft={draft}
              userEmail={userEmail}
              confirmDelete={confirmDelete}
              deleting={deleting}
              language={language}
              t={t}
              onChange={setDraft}
              onSignIn={onSignIn}
              onSignOut={onSignOut}
              onRequestDelete={() => setConfirmDelete(true)}
              onCancelDelete={() => setConfirmDelete(false)}
              onConfirmDelete={() => void handleConfirmDelete()}
            />
          )}
        </div>

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
