'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Info, RefreshCw, ShieldCheck } from 'lucide-react';
import type { Translations } from '@/lib/i18n';
import type {
  DailyPlanResponse,
  ImpactExplainer,
  LanguageCode,
  PlanRecommendationItem,
} from '@/lib/types';

interface DailyPlanViewProps {
  plan: DailyPlanResponse | null;
  loading: boolean;
  language: LanguageCode;
  t: Translations;
  onRefreshPlan: () => void;
}

function ImpactExplainerBlock({
  impact,
  t,
  defaultOpen = false,
}: {
  impact: ImpactExplainer;
  t: Translations;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="mt-4 border-t border-slate-100 pt-3 dark:border-slate-800">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        className="flex min-h-[40px] w-full items-center justify-between gap-2 text-left text-xs font-semibold text-teal-800 hover:text-teal-950 dark:text-teal-300 dark:hover:text-teal-200"
      >
        <span className="inline-flex items-center gap-1.5">
          <Info className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>{t.whyThisMatters}</span>
          <span className="font-normal text-slate-500 dark:text-slate-400">
            · {t.approximateTag}
          </span>
        </span>
        {open ? (
          <ChevronUp className="h-4 w-4 shrink-0" aria-hidden="true" />
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0" aria-hidden="true" />
        )}
      </button>

      {open && (
        <dl className="mt-2.5 grid gap-3 text-xs sm:grid-cols-2">
          <div>
            <dt className="font-medium text-slate-500 dark:text-slate-400">
              {t.exposureReductionLabel}
            </dt>
            <dd className="mt-0.5 font-mono font-medium text-slate-900 dark:text-slate-100">
              {impact.pm25ExposureReduction}
            </dd>
          </div>
          <div>
            <dt className="font-medium text-slate-500 dark:text-slate-400">
              {t.emissionsSavedLabel}
            </dt>
            <dd className="mt-0.5 font-mono font-medium text-slate-900 dark:text-slate-100">
              {impact.emissionsSaved}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="font-medium text-slate-500 dark:text-slate-400">
              {t.healthReasonLabel}
            </dt>
            <dd className="mt-0.5 leading-relaxed text-slate-700 dark:text-slate-300">
              {impact.healthReasoning}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="font-medium text-slate-500 dark:text-slate-400">
              {t.assumptionsLabel}
            </dt>
            <dd className="mt-0.5 leading-relaxed text-slate-600 dark:text-slate-400">
              {impact.assumptions}
            </dd>
          </div>
        </dl>
      )}
    </div>
  );
}

function RecommendationSection({
  heading,
  items,
  t,
}: {
  heading: string;
  items: PlanRecommendationItem[];
  t: Translations;
}) {
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{heading}</h2>
      <div className="grid gap-5 md:grid-cols-2">
        {items.map((item, idx) => (
          <article
            key={item.id || `${heading}-${idx}`}
            className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#131C26]"
          >
            <div>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500 dark:text-slate-400">
                <span className="font-medium text-slate-700 dark:text-slate-300">{item.timing}</span>
                <span aria-hidden="true">·</span>
                <span>{item.whoItAppliesTo}</span>
              </div>
              <h3 className="mt-2 text-base font-semibold text-slate-900 dark:text-slate-50">
                {item.title}
              </h3>
              <ul className="mt-3 space-y-2 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                {item.actionSteps.map((step, sIdx) => (
                  <li key={sIdx} className="flex items-start gap-2">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-700 dark:bg-teal-400" aria-hidden="true" />
                    <span>{step}</span>
                  </li>
                ))}
              </ul>
            </div>

            <ImpactExplainerBlock impact={item.impact} t={t} defaultOpen={idx === 0} />
          </article>
        ))}
      </div>
    </section>
  );
}

export function DailyPlanView({
  plan,
  loading,
  language,
  t,
  onRefreshPlan,
}: DailyPlanViewProps) {
  const isHi = language === 'hi';

  if (loading && !plan) {
    return (
      <div className="space-y-6" aria-busy="true" aria-label={t.regeneratingPlan}>
        <div className="h-32 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-[#131C26] animate-pulse" />
        <div className="grid gap-5 md:grid-cols-2">
          <div className="h-60 rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-[#131C26] animate-pulse" />
          <div className="h-60 rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-[#131C26] animate-pulse" />
        </div>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-[#131C26]">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          {isHi ? 'आपकी व्यक्तिगत दैनिक योजना तैयार है' : 'Generate your personalized daily plan'}
        </h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          {isHi
            ? 'लाइव AQI और आपके परिवार के प्रोफ़ाइल के आधार पर स्पष्ट, व्यावहारिक सुझाव पाएँ।'
            : 'Turn live AQI and your household profile into tailored outdoor windows, indoor hacks, and mask guidance.'}
        </p>
        <button
          type="button"
          onClick={onRefreshPlan}
          className="mt-5 inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-teal-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-teal-800"
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          <span>{t.generatePlanBtn}</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-9">
      {/* Header Bar */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-[#131C26]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
              <span className="font-medium text-teal-800 dark:text-teal-300">
                {plan.source === 'gemini-ai'
                  ? isHi
                    ? 'Gemini AI द्वारा व्यक्तिगत योजना'
                    : 'Personalized by Gemini AI'
                  : isHi
                  ? 'AQI नियम-आधारित मार्गदर्शन'
                  : 'Rule-based AQI guidance'}
              </span>
              <span aria-hidden="true">·</span>
              <span>
                {t.bestWindowLabel}: <span className="font-mono tabular-nums">{plan.bestOutdoorWindow}</span>
              </span>
              <span aria-hidden="true">·</span>
              <span>
                {t.peakSmogLabel}: <span className="font-mono tabular-nums">{plan.avoidOutdoorWindow}</span>
              </span>
            </div>
            <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl dark:text-slate-50">
              {plan.rightNowHeadline}
            </h1>
            <p className="max-w-3xl text-sm leading-relaxed text-slate-700 dark:text-slate-300">
              {plan.rightNowSummary}
            </p>
          </div>

          <button
            type="button"
            onClick={onRefreshPlan}
            disabled={loading}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 transition-colors hover:bg-slate-50 disabled:opacity-60 whitespace-nowrap shrink-0 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
            <span>{loading ? t.regeneratingPlan : t.generatePlanBtn}</span>
          </button>
        </div>

        {plan.fallbackNotice && (
          <p className="mt-4 border-t border-slate-100 pt-3 text-xs text-amber-800 dark:border-slate-800 dark:text-amber-300">
            {plan.fallbackNotice}
          </p>
        )}
      </div>

      {/* 1. Low-emission daily routine */}
      <RecommendationSection heading={t.routineHeading} items={plan.routine} t={t} />

      {/* 2. Indoor air quality hacks */}
      <RecommendationSection heading={t.indoorHeading} items={plan.indoorHacks} t={t} />

      {/* 3. Protection guidance per family member */}
      <section className="space-y-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            {t.protectionHeading}
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {plan.protectionGuidance.summary}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-[#131C26]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500 dark:border-slate-800 dark:text-slate-400">
                  <th className="pb-3 pr-4">{isHi ? 'परिवार सदस्य' : 'Household Member'}</th>
                  <th className="pb-3 pr-4">{isHi ? 'जोखिम' : 'Risk'}</th>
                  <th className="pb-3 pr-4">{isHi ? 'मास्क सलाह' : 'Mask Guidance'}</th>
                  <th className="pb-3 pr-4">{isHi ? 'बाहरी सीमा' : 'Outdoor Limit'}</th>
                  <th className="pb-3">{isHi ? 'मुख्य सुझाव' : 'Key Note'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {plan.protectionGuidance.memberAdvice.map((m, idx) => (
                  <tr key={idx} className="align-top">
                    <td className="py-3.5 pr-4 font-semibold text-slate-900 dark:text-slate-100">
                      {m.memberGroup}
                    </td>
                    <td className="py-3.5 pr-4 whitespace-nowrap">
                      <span
                        className={`text-xs font-semibold ${
                          m.riskLevel === 'critical'
                            ? 'text-rose-700 dark:text-rose-400'
                            : m.riskLevel === 'high'
                            ? 'text-orange-700 dark:text-orange-400'
                            : m.riskLevel === 'moderate'
                            ? 'text-amber-700 dark:text-amber-400'
                            : 'text-teal-700 dark:text-teal-400'
                        }`}
                      >
                        {m.riskLevel.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3.5 pr-4 text-slate-700 dark:text-slate-300">
                      {m.maskRecommendation}
                    </td>
                    <td className="py-3.5 pr-4 text-slate-700 dark:text-slate-300">
                      {m.outdoorLimit}
                    </td>
                    <td className="py-3.5 text-slate-600 dark:text-slate-400">
                      {m.specificAdvice}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ImpactExplainerBlock impact={plan.protectionGuidance.impact} t={t} defaultOpen />
        </div>
      </section>

      {/* 4. Sustainable alternatives */}
      <RecommendationSection
        heading={t.sustainableHeading}
        items={plan.sustainableAlternatives}
        t={t}
      />

      {/* Health-safety medical disclaimer */}
      <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs leading-relaxed text-slate-600 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-teal-700 dark:text-teal-400" aria-hidden="true" />
        <p>{plan.medicalDisclaimer}</p>
      </div>
    </div>
  );
}
