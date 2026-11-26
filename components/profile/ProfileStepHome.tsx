'use client';

import type {
  BudgetLevel,
  CookingFuelType,
  HouseholdProfile,
  LanguageCode,
  MaskType,
  VentilationType,
} from '@/lib/types';

interface ProfileStepHomeProps {
  draft: HouseholdProfile;
  language: LanguageCode;
  onChange: (next: HouseholdProfile) => void;
  onToggleMask: (mask: MaskType) => void;
}

export function ProfileStepHome({
  draft,
  language,
  onChange,
  onToggleMask,
}: ProfileStepHomeProps) {
  const isHi = language === 'hi';

  const masks: ReadonlyArray<[MaskType, string]> = [
    ['n95', 'N95'],
    ['kn95', 'KN95 / KF94'],
    ['n99', 'N99'],
    ['surgical', isHi ? 'सर्जिकल' : 'Surgical'],
    ['cloth', isHi ? 'कपड़े का' : 'Cloth'],
    ['none', isHi ? 'कोई नहीं' : 'None'],
  ];

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex min-h-[48px] cursor-pointer items-center gap-3 rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800 dark:border-slate-700 dark:text-slate-200">
          <input
            type="checkbox"
            checked={draft.hasAirPurifier}
            onChange={(e) => onChange({ ...draft, hasAirPurifier: e.target.checked })}
            className="h-4 w-4 rounded border-slate-300 text-teal-700"
          />
          <span>{isHi ? 'घर में HEPA एयर प्यूरीफ़ायर है' : 'Have HEPA air purifier at home'}</span>
        </label>
        <label className="flex min-h-[48px] cursor-pointer items-center gap-3 rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800 dark:border-slate-700 dark:text-slate-200">
          <input
            type="checkbox"
            checked={draft.hasIndoorPlants}
            onChange={(e) => onChange({ ...draft, hasIndoorPlants: e.target.checked })}
            className="h-4 w-4 rounded border-slate-300 text-teal-700"
          />
          <span>{isHi ? 'घर के अंदर पौधे हैं' : 'Have indoor plants'}</span>
        </label>
      </div>

      <div>
        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          {isHi ? 'उपलब्ध मास्क प्रकार' : 'Mask types currently owned'}
        </p>
        <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label={isHi ? 'उपलब्ध मास्क प्रकार' : 'Mask types currently owned'}>
          {masks.map(([val, label]) => {
            const active = draft.maskTypes.includes(val);
            return (
              <button
                key={val}
                type="button"
                aria-pressed={active}
                onClick={() => onToggleMask(val)}
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
          <label
            htmlFor="vent-select"
            className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
          >
            {isHi ? 'वेंटिलेशन' : 'Ventilation'}
          </label>
          <select
            id="vent-select"
            value={draft.ventilationType}
            onChange={(e) =>
              onChange({ ...draft, ventilationType: e.target.value as VentilationType })
            }
            className="mt-1.5 min-h-[42px] w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          >
            <option value="standard_windows">{isHi ? 'सामान्य खिड़कियाँ' : 'Standard windows'}</option>
            <option value="sealed_ac">{isHi ? 'बंद / AC कमरा' : 'Sealed / AC room'}</option>
            <option value="cross_ventilated">{isHi ? 'क्रॉस-वेंटिलेटेड' : 'Cross-ventilated'}</option>
            <option value="balcony_open">{isHi ? 'खुली बालकनी दरवाज़े' : 'Open balcony doors'}</option>
          </select>
        </div>

        <div>
          <label
            htmlFor="fuel-select"
            className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
          >
            {isHi ? 'रसोई ईंधन' : 'Cooking fuel'}
          </label>
          <select
            id="fuel-select"
            value={draft.cookingFuel}
            onChange={(e) =>
              onChange({ ...draft, cookingFuel: e.target.value as CookingFuelType })
            }
            className="mt-1.5 min-h-[42px] w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          >
            <option value="png_piped">{isHi ? 'पाइप प्राकृतिक गैस (PNG)' : 'Piped Natural Gas (PNG)'}</option>
            <option value="lpg">{isHi ? 'LPG सिलेंडर' : 'LPG Cylinder'}</option>
            <option value="induction_electric">{isHi ? 'इंडक्शन / इलेक्ट्रिक' : 'Induction / Electric'}</option>
            <option value="biomass_solid">{isHi ? 'लकड़ी / ठोस ईंधन' : 'Solid fuel / Biomass'}</option>
          </select>
        </div>

        <div>
          <label
            htmlFor="budget-select"
            className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
          >
            {isHi ? 'बजट स्तर' : 'Budget level'}
          </label>
          <select
            id="budget-select"
            value={draft.budgetLevel}
            onChange={(e) => onChange({ ...draft, budgetLevel: e.target.value as BudgetLevel })}
            className="mt-1.5 min-h-[42px] w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          >
            <option value="low">{isHi ? 'कम-लागत / DIY' : 'Low-cost / DIY focus'}</option>
            <option value="medium">{isHi ? 'मध्यम' : 'Moderate'}</option>
            <option value="flexible">{isHi ? 'लचीला' : 'Flexible'}</option>
          </select>
        </div>
      </div>
    </div>
  );
}
