'use client';

import dynamic from 'next/dynamic';
import { useMemo, type FormEvent } from 'react';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import {
  Activity,
  CalendarDays,
  Compass,
  FileText,
  MessageSquare,
  Users,
  WifiOff,
} from 'lucide-react';
import { useAirWiseState, type TabKey } from '@/hooks/use-airwise-state';
import { useOnlineStatus } from '@/hooks/use-pwa';
import { getTranslations } from '@/lib/i18n';
import type { AirQualitySnapshot, LanguageCode } from '@/lib/types';
import { AppHeader } from './AppHeader';
import { ErrorBoundary } from './ErrorBoundary';
import { LocationToolbar } from './LocationToolbar';
import { MobileBottomNav, type MobileNavItem } from './MobileBottomNav';
import { NowDashboard } from './NowDashboard';

const TabLoadingFallback = () => (
  <div className="rounded-xl border border-slate-200 bg-white p-8 text-sm text-slate-600 dark:border-slate-800 dark:bg-[#131C26] dark:text-slate-300">
    Loading view...
  </div>
);

const HistoryView = dynamic(
  () => import('./HistoryView').then((mod) => mod.HistoryView),
  { loading: TabLoadingFallback }
);
const DailyPlanView = dynamic(
  () => import('./DailyPlanView').then((mod) => mod.DailyPlanView),
  { loading: TabLoadingFallback }
);
const AssistantView = dynamic(
  () => import('./AssistantView').then((mod) => mod.AssistantView),
  { loading: TabLoadingFallback }
);
const ImpactTrackerView = dynamic(
  () => import('./ImpactTrackerView').then((mod) => mod.ImpactTrackerView),
  { loading: TabLoadingFallback }
);
const CommunityView = dynamic(
  () => import('./CommunityView').then((mod) => mod.CommunityView),
  { loading: TabLoadingFallback }
);
const HouseholdProfileModal = dynamic(
  () => import('./HouseholdProfileModal').then((mod) => mod.HouseholdProfileModal),
  { ssr: false }
);

interface AirWiseAppProps {
  initialSnapshot: AirQualitySnapshot;
}

export function AirWiseApp({ initialSnapshot }: AirWiseAppProps) {
  const isOnline = useOnlineStatus();
  const state = useAirWiseState(initialSnapshot);
  const language: LanguageCode = state.profile.language;
  const t = useMemo(() => getTranslations(language), [language]);

  const navItems: MobileNavItem[] = useMemo(
    () => [
      { key: 'now', label: t.navNow, icon: Compass },
      { key: 'history', label: t.navHistory, icon: CalendarDays },
      { key: 'plan', label: t.navPlan, icon: FileText },
      { key: 'assistant', label: t.navAssistant, icon: MessageSquare },
      { key: 'tracker', label: t.navTracker, icon: Activity },
      { key: 'community', label: t.navCommunity, icon: Users },
    ],
    [t]
  );

  function handleSelectTab(tab: TabKey) {
    state.setActiveTab(tab);
    if (tab === 'plan' && !state.plan) {
      void state.generateDailyPlan(state.snapshot, state.profile);
    }
  }

  async function handleCitySearch(e: FormEvent) {
    e.preventDefault();
    const ok = await state.selectCity(state.cityInput);
    if (ok) state.setCityInput('');
  }

  return (
    <ErrorBoundary>
      <MotionConfig reducedMotion="user">
        <div className="flex min-h-screen flex-col pb-20 md:pb-0">
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-teal-700 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white focus:shadow-lg"
          >
            {language === 'hi' ? 'मुख्य सामग्री पर जाएँ' : 'Skip to main content'}
          </a>

          <AppHeader
            navItems={navItems}
            activeTab={state.activeTab}
            profileBtnLabel={t.profileBtn}
            onSelectTab={handleSelectTab}
            onOpenProfile={() => state.setProfileModalOpen(true)}
          />

          {!isOnline && (
            <div
              role="status"
              className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-xs font-medium text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/50 dark:text-amber-200"
            >
              <span className="inline-flex items-center gap-1.5">
                <WifiOff className="h-3.5 w-3.5" aria-hidden="true" />
                {t.offlineBanner}
              </span>
            </div>
          )}

          <main
            id="main-content"
            tabIndex={-1}
            className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 outline-none sm:px-6 sm:py-8"
          >
            <LocationToolbar
              cityInput={state.cityInput}
              currentLocationName={state.snapshot.locationName}
              language={language}
              darkMode={state.darkMode}
              t={t}
              onCityInputChange={state.setCityInput}
              onCitySearch={handleCitySearch}
              onGeolocate={state.handleGeolocate}
              onSelectPresetCity={(city) => void state.selectCity(city)}
              onToggleLanguage={state.handleToggleLanguage}
              onToggleDarkMode={() => state.setDarkMode((d) => !d)}
            />

            {state.locationNotice && (
              <p
                role="status"
                aria-live="polite"
                className="mb-4 text-xs font-medium text-amber-900 dark:text-amber-300"
              >
                {state.locationNotice}
              </p>
            )}

            <AnimatePresence mode="wait">
              <motion.div
                key={state.activeTab}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
              >
                {state.activeTab === 'now' && (
                  <NowDashboard
                    snapshot={state.snapshot}
                    loading={state.loadingAqi}
                    profile={state.profile}
                    plan={state.plan}
                    language={language}
                    t={t}
                    onOpenPlan={() => {
                      state.setActiveTab('plan');
                      void state.generateDailyPlan(state.snapshot, state.profile);
                    }}
                    onOpenAssistant={() => state.setActiveTab('assistant')}
                    onOpenProfile={() => state.setProfileModalOpen(true)}
                  />
                )}

                {state.activeTab === 'history' && (
                  <HistoryView
                    snapshot={state.snapshot}
                    loading={state.loadingAqi}
                    profile={state.profile}
                    language={language}
                    t={t}
                    onRefresh={() => void state.fetchAqi({ city: state.snapshot.locationName })}
                  />
                )}

                {state.activeTab === 'plan' && (
                  <DailyPlanView
                    plan={state.plan}
                    loading={state.loadingPlan}
                    language={language}
                    t={t}
                    onRefreshPlan={() => void state.generateDailyPlan(state.snapshot, state.profile)}
                  />
                )}

                {state.activeTab === 'assistant' && (
                  <AssistantView
                    snapshot={state.snapshot}
                    profile={state.profile}
                    language={language}
                    t={t}
                    messages={state.chatMessages}
                    onMessagesChange={state.setChatMessages}
                  />
                )}

                {state.activeTab === 'tracker' && (
                  <ImpactTrackerView
                    logs={state.actionLogs}
                    language={language}
                    t={t}
                    onLogAction={state.handleLogAction}
                    onDeleteLog={state.handleDeleteLog}
                  />
                )}

                {state.activeTab === 'community' && (
                  <CommunityView
                    profile={state.profile}
                    logs={state.actionLogs}
                    cloudContributions={state.cloudContributions}
                    language={language}
                    t={t}
                    onSelectGroup={state.handleSelectCommunityGroup}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </main>

          <footer className="hidden border-t border-slate-200 bg-white/60 py-5 text-xs text-slate-600 md:block dark:border-slate-800 dark:bg-[#0B1117] dark:text-slate-400">
            <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6">
              <span>
                AirWise · AI &amp; rule-based environmental guidance (not medical advice). Follow official CPCB/IMD/NDMA advisories; emergency: 112 / 108.
              </span>
              <span>Data: Open-Meteo Air Quality &amp; Weather · Privacy-first household settings</span>
            </div>
          </footer>

          <MobileBottomNav
            items={navItems}
            activeTab={state.activeTab}
            onSelectTab={handleSelectTab}
          />

          {state.profileModalOpen && (
            <HouseholdProfileModal
              open={state.profileModalOpen}
              initialProfile={state.profile}
              userEmail={state.authUser?.email ?? null}
              language={language}
              t={t}
              onClose={() => state.setProfileModalOpen(false)}
              onSave={state.handleSaveProfile}
              onSignIn={() => void state.handleSignIn()}
              onSignOut={() => void state.handleSignOut()}
              onDeleteAllData={state.handleDeleteAllData}
            />
          )}
        </div>
      </MotionConfig>
    </ErrorBoundary>
  );
}
