'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Activity,
  CalendarDays,
  Compass,
  FileText,
  Languages,
  MapPin,
  MessageSquare,
  Moon,
  Search,
  SlidersHorizontal,
  Sun,
  Users,
  WifiOff,
} from 'lucide-react';
import type { User } from 'firebase/auth';
import {
  buildRuleBasedDailyPlan,
  calculateImpactStats,
} from '@/lib/air-quality';
import { getTranslations } from '@/lib/i18n';
import {
  buildSeedActionLogs,
  DEFAULT_HOUSEHOLD_PROFILE,
  PRESET_CITIES,
} from '@/lib/seed-data';
import type {
  ActionLogEntry,
  AirQualitySnapshot,
  ChatMessage,
  CleanAirActionOption,
  CommunityLeaderboardEntry,
  DailyPlanResponse,
  HouseholdProfile,
  LanguageCode,
} from '@/lib/types';
import { useOnlineStatus } from '@/hooks/use-pwa';
import { ErrorBoundary } from './ErrorBoundary';
import { NowDashboard } from './NowDashboard';
import { PWAInstallButton } from './PWAInstallButton';

const TabLoadingFallback = () => (
  <div className="rounded-xl border border-slate-200 bg-white p-8 text-sm text-slate-500 dark:border-slate-800 dark:bg-[#131C26] dark:text-slate-400">
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

const loadFirebase = () => import('@/lib/firebase');

type TabKey = 'now' | 'history' | 'plan' | 'assistant' | 'tracker' | 'community';

const LS_PROFILE_KEY = 'airwise_profile_v1';
const LS_LOGS_KEY = 'airwise_logs_v1';
const LS_SNAPSHOT_KEY = 'airwise_last_snapshot_v1';
const LS_THEME_KEY = 'airwise_theme_v1';

interface AirWiseAppProps {
  initialSnapshot: AirQualitySnapshot;
}

export function AirWiseApp({ initialSnapshot }: AirWiseAppProps) {
  const isOnline = useOnlineStatus();

  const [activeTab, setActiveTab] = useState<TabKey>('now');
  const [darkMode, setDarkMode] = useState(false);
  const [profile, setProfile] = useState<HouseholdProfile>(DEFAULT_HOUSEHOLD_PROFILE);
  const [snapshot, setSnapshot] = useState<AirQualitySnapshot>(initialSnapshot);
  const [loadingAqi, setLoadingAqi] = useState(false);
  const [cityInput, setCityInput] = useState('');
  const [locationNotice, setLocationNotice] = useState<string | null>(null);

  const [plan, setPlan] = useState<DailyPlanResponse | null>(() =>
    buildRuleBasedDailyPlan(initialSnapshot, DEFAULT_HOUSEHOLD_PROFILE, 'en')
  );
  const [loadingPlan, setLoadingPlan] = useState(false);

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [actionLogs, setActionLogs] = useState<ActionLogEntry[]>(() => buildSeedActionLogs());
  const [cloudContributions, setCloudContributions] = useState<CommunityLeaderboardEntry[]>([]);

  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [authUser, setAuthUser] = useState<User | null>(null);

  const language: LanguageCode = profile.language;
  const t = useMemo(() => getTranslations(language), [language]);

  // Hydrate theme, profile, action logs, and cached snapshot from localStorage asynchronously
  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (!active) return;
      try {
        const savedTheme = localStorage.getItem(LS_THEME_KEY);
        if (savedTheme === 'dark') {
          setDarkMode(true);
          document.documentElement.classList.add('dark');
        }
        const savedProfile = localStorage.getItem(LS_PROFILE_KEY);
        if (savedProfile) {
          setProfile({ ...DEFAULT_HOUSEHOLD_PROFILE, ...JSON.parse(savedProfile) });
        }
        const savedLogs = localStorage.getItem(LS_LOGS_KEY);
        if (savedLogs) {
          const parsedLogs = JSON.parse(savedLogs);
          if (Array.isArray(parsedLogs)) setActionLogs(parsedLogs);
        }
        const savedSnap = localStorage.getItem(LS_SNAPSHOT_KEY);
        if (savedSnap && !navigator.onLine) {
          setSnapshot(JSON.parse(savedSnap));
        }
      } catch {
        // Ignore storage parse errors
      }
    });
    return () => {
      active = false;
    };
  }, []);

  // Sync dark mode class on <html>
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem(LS_THEME_KEY, 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem(LS_THEME_KEY, 'light');
    }
  }, [darkMode]);

  // Startup Firestore connection check & Auth state listener (loaded dynamically on client)
  useEffect(() => {
    let active = true;
    let unsub: (() => void) | undefined;

    loadFirebase()
      .then((fb) => {
        if (!active) return;
        void fb.testFirestoreConnection();

        unsub = fb.subscribeToAuthState(async (user) => {
          if (!active) return;
          setAuthUser(user);
          if (user) {
            try {
              const cloudProfile = await fb.loadHouseholdFromCloud(user.uid);
              if (cloudProfile && active) {
                setProfile(cloudProfile);
                localStorage.setItem(LS_PROFILE_KEY, JSON.stringify(cloudProfile));
              }
              const cloudLogs = await fb.loadActionLogsFromCloud(user.uid);
              if (cloudLogs.length > 0 && active) {
                setActionLogs(cloudLogs);
                localStorage.setItem(LS_LOGS_KEY, JSON.stringify(cloudLogs));
              }
            } catch (err) {
              console.warn('Cloud profile sync notice:', err);
            }
          } else {
            setCloudContributions([]);
          }
        });
      })
      .catch((err) => {
        console.warn('Firebase client initialization notice:', err);
      });

    return () => {
      active = false;
      unsub?.();
    };
  }, []);

  const profileRef = useRef<HouseholdProfile>(profile);
  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

  // Fetch live AQI on mount for initial city (falls back cleanly to seed if offline)
  const fetchAqi = useCallback(async (params: { city?: string; lat?: number; lon?: number }) => {
    setLoadingAqi(true);
    setLocationNotice(null);
    try {
      const qs = new URLSearchParams();
      if (params.city) qs.set('city', params.city);
      if (params.lat !== undefined && params.lon !== undefined) {
        qs.set('lat', String(params.lat));
        qs.set('lon', String(params.lon));
      }
      const res = await fetch(`/api/aqi?${qs.toString()}`);
      if (!res.ok) throw new Error('Unable to load live AQI');
      const data: AirQualitySnapshot = await res.json();
      setSnapshot(data);
      setPlan(buildRuleBasedDailyPlan(data, profileRef.current, profileRef.current.language));
      try {
        localStorage.setItem(LS_SNAPSHOT_KEY, JSON.stringify(data));
      } catch {
        // Ignore quota errors
      }
      return data;
    } catch {
      setLocationNotice('Could not reach live AQI server — showing last known data.');
      return null;
    } finally {
      setLoadingAqi(false);
    }
  }, []);

  // Fetch live AQI once after initial mount without synchronous setState in effect body
  useEffect(() => {
    let cancelled = false;
    const city = DEFAULT_HOUSEHOLD_PROFILE.city;
    fetch(`/api/aqi?city=${encodeURIComponent(city)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: AirQualitySnapshot | null) => {
        if (cancelled || !data) return;
        setSnapshot(data);
        setPlan(buildRuleBasedDailyPlan(data, profileRef.current, profileRef.current.language));
        try {
          localStorage.setItem(LS_SNAPSHOT_KEY, JSON.stringify(data));
        } catch {
          // Ignore storage quota errors
        }
      })
      .catch(() => {
        // Seed snapshot already rendered
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Fetch AI Daily Plan from /api/plan
  const generateDailyPlan = useCallback(
    async (targetSnapshot: AirQualitySnapshot, targetProfile: HouseholdProfile) => {
      setLoadingPlan(true);
      try {
        const res = await fetch('/api/plan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            snapshot: targetSnapshot,
            profile: targetProfile,
            language: targetProfile.language,
          }),
        });
        if (!res.ok) throw new Error('Plan request failed');
        const data: DailyPlanResponse = await res.json();
        setPlan(data);
      } catch {
        setPlan(
          buildRuleBasedDailyPlan(
            targetSnapshot,
            targetProfile,
            targetProfile.language,
            'Offline or network error — showing rule-based guidance grounded in your cached AQI data.'
          )
        );
      } finally {
        setLoadingPlan(false);
      }
    },
    []
  );

  // Sync community contributions when signed in and group changes
  useEffect(() => {
    if (!authUser) return;
    let cancelled = false;
    loadFirebase()
      .then((fb) => fb.loadCommunityContributionsFromCloud(profile.communityGroupId, authUser.uid))
      .then((rows) => {
        if (!cancelled) setCloudContributions(rows);
      })
      .catch(() => {
        // Non-blocking fallback to seed community rows
      });
    return () => {
      cancelled = true;
    };
  }, [authUser, profile.communityGroupId]);

  async function handleCitySearch(e: FormEvent) {
    e.preventDefault();
    const cleaned = cityInput.trim();
    if (!cleaned) return;
    const nextSnap = await fetchAqi({ city: cleaned });
    if (nextSnap) {
      const updatedProfile = {
        ...profile,
        city: nextSnap.locationName,
        latitude: nextSnap.latitude,
        longitude: nextSnap.longitude,
      };
      setProfile(updatedProfile);
      localStorage.setItem(LS_PROFILE_KEY, JSON.stringify(updatedProfile));
      setPlan(buildRuleBasedDailyPlan(nextSnap, updatedProfile, updatedProfile.language));
      setCityInput('');
    }
  }

  async function handleSelectPresetCity(cityName: string) {
    const nextSnap = await fetchAqi({ city: cityName });
    if (nextSnap) {
      const updatedProfile = {
        ...profile,
        city: nextSnap.locationName,
        latitude: nextSnap.latitude,
        longitude: nextSnap.longitude,
      };
      setProfile(updatedProfile);
      localStorage.setItem(LS_PROFILE_KEY, JSON.stringify(updatedProfile));
      setPlan(buildRuleBasedDailyPlan(nextSnap, updatedProfile, updatedProfile.language));
    }
  }

  function handleGeolocate() {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setLocationNotice('Geolocation is not supported in this browser. Search your city above.');
      return;
    }
    setLocationNotice('Detecting your coordinates...');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const nextSnap = await fetchAqi({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
        });
        if (nextSnap) {
          setLocationNotice(null);
          setPlan(buildRuleBasedDailyPlan(nextSnap, profile, profile.language));
        }
      },
      () => {
        setLocationNotice(
          'Location permission declined. Select or search your city manually.'
        );
      },
      { timeout: 6000 }
    );
  }

  function handleToggleLanguage() {
    const nextLang: LanguageCode = profile.language === 'en' ? 'hi' : 'en';
    const nextProfile: HouseholdProfile = { ...profile, language: nextLang };
    setProfile(nextProfile);
    localStorage.setItem(LS_PROFILE_KEY, JSON.stringify(nextProfile));
    setPlan(buildRuleBasedDailyPlan(snapshot, nextProfile, nextLang));
    if (authUser) {
      void loadFirebase()
        .then((fb) => fb.saveHouseholdToCloud(authUser.uid, nextProfile))
        .catch(() => {});
    }
  }

  function handleSaveProfile(next: HouseholdProfile) {
    setProfile(next);
    localStorage.setItem(LS_PROFILE_KEY, JSON.stringify(next));
    void generateDailyPlan(snapshot, next);
    if (authUser) {
      void loadFirebase()
        .then((fb) => fb.saveHouseholdToCloud(authUser.uid, next))
        .catch(() => {});
    }
  }

  function handleLogAction(action: CleanAirActionOption) {
    const entry: ActionLogEntry = {
      id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      actionId: action.actionId,
      label: language === 'hi' ? action.labelHi : action.labelEn,
      category: action.category,
      pm25AvoidedUg: action.pm25AvoidedUg,
      co2SavedKg: action.co2SavedKg,
      pmSavedGrams: action.pmSavedGrams,
      dateKey: new Date().toISOString().slice(0, 10),
      createdAtIso: new Date().toISOString(),
    };
    const nextLogs = [entry, ...actionLogs];
    setActionLogs(nextLogs);
    localStorage.setItem(LS_LOGS_KEY, JSON.stringify(nextLogs));

    if (authUser) {
      const nextStats = calculateImpactStats(nextLogs);
      void loadFirebase()
        .then((fb) => {
          void fb.addActionLogToCloud(authUser.uid, entry, profile).catch(() => {});
          void fb
            .syncCommunityContributionToCloud(
              authUser.uid,
              profile.communityGroupId,
              profile.displayLabel,
              nextStats
            )
            .catch(() => {});
        })
        .catch(() => {});
    }
  }

  function handleDeleteLog(id: string) {
    const nextLogs = actionLogs.filter((l) => l.id !== id);
    setActionLogs(nextLogs);
    localStorage.setItem(LS_LOGS_KEY, JSON.stringify(nextLogs));
  }

  function handleSelectCommunityGroup(groupId: string) {
    const nextProfile = { ...profile, communityGroupId: groupId };
    setProfile(nextProfile);
    localStorage.setItem(LS_PROFILE_KEY, JSON.stringify(nextProfile));
    if (authUser) {
      void loadFirebase()
        .then((fb) => fb.saveHouseholdToCloud(authUser.uid, nextProfile))
        .catch(() => {});
    }
  }

  async function handleSignIn() {
    try {
      const fb = await loadFirebase();
      await fb.signInWithGoogle();
    } catch (err) {
      console.warn('Google sign-in cancelled or blocked:', err);
    }
  }

  async function handleSignOut() {
    const fb = await loadFirebase();
    await fb.signOutUser();
  }

  async function handleDeleteAllData() {
    if (authUser) {
      const fb = await loadFirebase();
      await fb.deleteAllUserCloudData(authUser.uid, profile.communityGroupId);
    }
    localStorage.removeItem(LS_PROFILE_KEY);
    localStorage.removeItem(LS_LOGS_KEY);
    localStorage.removeItem(LS_SNAPSHOT_KEY);
    setProfile(DEFAULT_HOUSEHOLD_PROFILE);
    setActionLogs([]);
    setChatMessages([]);
    setCloudContributions([]);
  }

  const navItems: { key: TabKey; label: string; icon: typeof Compass }[] = [
    { key: 'now', label: t.navNow, icon: Compass },
    { key: 'history', label: t.navHistory, icon: CalendarDays },
    { key: 'plan', label: t.navPlan, icon: FileText },
    { key: 'assistant', label: t.navAssistant, icon: MessageSquare },
    { key: 'tracker', label: t.navTracker, icon: Activity },
    { key: 'community', label: t.navCommunity, icon: Users },
  ];

  return (
    <ErrorBoundary>
      <div className="min-h-screen flex flex-col pb-20 md:pb-0">
        {/* Strict 3-Zone Top Bar Contract */}
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-xs dark:border-slate-800 dark:bg-[#0B1117]/95">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-8 px-4 py-3.5 sm:px-6">
            {/* Zone 1: Single-line Brand Wordmark */}
            <button
              type="button"
              onClick={() => setActiveTab('now')}
              className="text-lg font-bold tracking-tight text-slate-950 whitespace-nowrap shrink-0 dark:text-white"
            >
              AirWise
            </button>

            {/* Zone 2: 5 Single-line Nav Links */}
            <nav aria-label="Primary navigation" className="hidden md:flex items-center gap-6">
              {navItems.map((item) => {
                const active = activeTab === item.key;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => {
                      setActiveTab(item.key);
                      if (item.key === 'plan' && !plan) {
                        void generateDailyPlan(snapshot, profile);
                      }
                    }}
                    aria-current={active ? 'page' : undefined}
                    className={`min-h-[40px] border-b-2 px-1 text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
                      active
                        ? 'border-teal-700 text-teal-800 dark:border-teal-400 dark:text-teal-300'
                        : 'border-transparent text-slate-600 hover:text-slate-950 dark:text-slate-400 dark:hover:text-slate-100'
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </nav>

            {/* Zone 3: 1 Primary Action Button */}
            <div className="shrink-0">
              <button
                type="button"
                onClick={() => setProfileModalOpen(true)}
                className="inline-flex min-h-[40px] items-center gap-2 rounded-lg bg-teal-700 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-teal-800 whitespace-nowrap shrink-0 dark:bg-teal-600 dark:hover:bg-teal-500"
              >
                <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{t.profileBtn}</span>
              </button>
            </div>
          </div>
        </header>

        {/* Offline Connectivity Banner */}
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

        {/* Main Workspace Container */}
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
          {/* Workspace Utility Toolbar (Location Search, Presets, Language, Theme, PWA Install) */}
          <div className="mb-6 flex flex-col gap-3 border-b border-slate-200 pb-5 lg:flex-row lg:items-center lg:justify-between dark:border-slate-800">
            <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
              <form onSubmit={handleCitySearch} className="relative flex flex-1 max-w-md items-center">
                <label htmlFor="city-search-input" className="sr-only">
                  {t.searchPlaceholder}
                </label>
                <Search
                  className="pointer-events-none absolute left-3 h-4 w-4 text-slate-400"
                  aria-hidden="true"
                />
                <input
                  id="city-search-input"
                  type="text"
                  value={cityInput}
                  onChange={(e) => setCityInput(e.target.value)}
                  placeholder={t.searchPlaceholder}
                  maxLength={80}
                  className="min-h-[42px] w-full rounded-lg border border-slate-300 bg-white pl-9 pr-20 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-700/20 dark:border-slate-700 dark:bg-[#131C26] dark:text-slate-100 dark:placeholder:text-slate-500"
                />
                <button
                  type="submit"
                  className="absolute right-1.5 rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600"
                >
                  Go
                </button>
              </form>

              <button
                type="button"
                onClick={handleGeolocate}
                className="inline-flex min-h-[42px] items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 whitespace-nowrap shrink-0 dark:border-slate-700 dark:bg-[#131C26] dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <MapPin className="h-3.5 w-3.5 text-teal-700 dark:text-teal-400" aria-hidden="true" />
                <span>{t.locateMe}</span>
              </button>
            </div>

            {/* Right Controls: Quick Cities, EN/HI, Theme, PWA */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 overflow-x-auto" aria-label="Quick city selection">
                {PRESET_CITIES.slice(0, 4).map((c) => {
                  const selected = snapshot.locationName.toLowerCase() === c.name.toLowerCase();
                  return (
                    <button
                      key={c.name}
                      type="button"
                      onClick={() => void handleSelectPresetCity(c.name)}
                      className={`min-h-[38px] rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                        selected
                          ? 'bg-slate-900 text-white dark:bg-slate-200 dark:text-slate-950'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100'
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
                onClick={handleToggleLanguage}
                aria-label="Toggle language between English and Hindi"
                className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0 dark:border-slate-700 dark:bg-[#131C26] dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <Languages className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{language === 'en' ? 'हिन्दी' : 'English'}</span>
              </button>

              <button
                type="button"
                onClick={() => setDarkMode((d) => !d)}
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

          {locationNotice && (
            <p role="status" className="mb-4 text-xs font-medium text-amber-800 dark:text-amber-300">
              {locationNotice}
            </p>
          )}

          {/* View Switcher with Subtle Compositor-Only Motion */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            >
              {activeTab === 'now' && (
                <NowDashboard
                  snapshot={snapshot}
                  loading={loadingAqi}
                  profile={profile}
                  plan={plan}
                  language={language}
                  t={t}
                  onOpenPlan={() => {
                    setActiveTab('plan');
                    void generateDailyPlan(snapshot, profile);
                  }}
                  onOpenAssistant={() => setActiveTab('assistant')}
                  onOpenProfile={() => setProfileModalOpen(true)}
                />
              )}

              {activeTab === 'history' && (
                <HistoryView
                  snapshot={snapshot}
                  loading={loadingAqi}
                  profile={profile}
                  language={language}
                  t={t}
                  onRefresh={() => void fetchAqi({ city: snapshot.locationName })}
                />
              )}

              {activeTab === 'plan' && (
                <DailyPlanView
                  plan={plan}
                  loading={loadingPlan}
                  language={language}
                  t={t}
                  onRefreshPlan={() => void generateDailyPlan(snapshot, profile)}
                />
              )}

              {activeTab === 'assistant' && (
                <AssistantView
                  snapshot={snapshot}
                  profile={profile}
                  language={language}
                  t={t}
                  messages={chatMessages}
                  onMessagesChange={setChatMessages}
                />
              )}

              {activeTab === 'tracker' && (
                <ImpactTrackerView
                  logs={actionLogs}
                  language={language}
                  t={t}
                  onLogAction={handleLogAction}
                  onDeleteLog={handleDeleteLog}
                />
              )}

              {activeTab === 'community' && (
                <CommunityView
                  profile={profile}
                  logs={actionLogs}
                  cloudContributions={cloudContributions}
                  language={language}
                  t={t}
                  onSelectGroup={handleSelectCommunityGroup}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Quiet Footer */}
        <footer className="hidden md:block border-t border-slate-200 bg-white/60 py-5 text-xs text-slate-500 dark:border-slate-800 dark:bg-[#0B1117] dark:text-slate-400">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6">
            <span>
              AirWise · General environmental air-quality guidance (not medical advice).
            </span>
            <span>
              Data: Open-Meteo Air Quality & Weather · Privacy-first household settings
            </span>
          </div>
        </footer>

        {/* Compact Mobile Bottom Thumb Navigation (<= 7% viewport height) */}
        <nav
          aria-label="Mobile navigation"
          className="fixed bottom-0 left-0 right-0 z-30 grid grid-cols-6 border-t border-slate-200 bg-white/95 backdrop-blur-xs md:hidden dark:border-slate-800 dark:bg-[#0B1117]/95"
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setActiveTab(item.key)}
                aria-current={active ? 'page' : undefined}
                className={`flex min-h-[54px] flex-col items-center justify-center gap-0.5 px-0.5 text-[10px] font-medium ${
                  active
                    ? 'text-teal-800 dark:text-teal-300'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                <span className="truncate max-w-[58px]">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* 4-Step Household Profile & Privacy Modal */}
        {profileModalOpen && (
          <HouseholdProfileModal
            open={profileModalOpen}
            initialProfile={profile}
            userEmail={authUser?.email ?? null}
            language={language}
            t={t}
            onClose={() => setProfileModalOpen(false)}
            onSave={handleSaveProfile}
            onSignIn={() => void handleSignIn()}
            onSignOut={() => void handleSignOut()}
            onDeleteAllData={handleDeleteAllData}
          />
        )}
      </div>
    </ErrorBoundary>
  );
}
