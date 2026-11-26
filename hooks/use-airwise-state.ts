'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { User } from 'firebase/auth';
import { buildRuleBasedDailyPlan, calculateImpactStats } from '@/lib/air-quality';
import { buildSeedActionLogs, DEFAULT_HOUSEHOLD_PROFILE } from '@/lib/seed-data';
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

export type TabKey = 'now' | 'history' | 'plan' | 'assistant' | 'tracker' | 'community';

const LS_PROFILE_KEY = 'airwise_profile_v1';
const LS_LOGS_KEY = 'airwise_logs_v1';
const LS_SNAPSHOT_KEY = 'airwise_last_snapshot_v1';
const LS_THEME_KEY = 'airwise_theme_v1';

const loadFirebase = () => import('@/lib/firebase');

export function useAirWiseState(initialSnapshot: AirQualitySnapshot) {
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

  const profileRef = useRef<HouseholdProfile>(profile);
  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

  // Hydrate persisted state from localStorage asynchronously
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

  // Keep <html lang="..."> synchronized with selected EN/HI language
  useEffect(() => {
    document.documentElement.lang = profile.language;
  }, [profile.language]);

  // Startup Firestore check & Auth listener
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

  // Fetch live AQI on initial mount
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/aqi?city=${encodeURIComponent(DEFAULT_HOUSEHOLD_PROFILE.city)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: AirQualitySnapshot | null) => {
        if (cancelled || !data) return;
        setSnapshot(data);
        setPlan(buildRuleBasedDailyPlan(data, profileRef.current, profileRef.current.language));
        try {
          localStorage.setItem(LS_SNAPSHOT_KEY, JSON.stringify(data));
        } catch {
          // Ignore quota errors
        }
      })
      .catch(() => {
        // Seed snapshot already rendered
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Sync community contributions when signed in and group changes
  useEffect(() => {
    if (!authUser) return;
    let cancelled = false;
    loadFirebase()
      .then((fb) => fb.loadCommunityContributionsFromCloud(profile.communityGroupId, authUser.uid))
      .then((rows) => {
        if (!cancelled) setCloudContributions(rows);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [authUser, profile.communityGroupId]);

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

  const selectCity = useCallback(
    async (cityName: string) => {
      const cleaned = cityName.trim();
      if (!cleaned) return false;
      const nextSnap = await fetchAqi({ city: cleaned });
      if (!nextSnap) return false;
      const updatedProfile: HouseholdProfile = {
        ...profileRef.current,
        city: nextSnap.locationName,
        latitude: nextSnap.latitude,
        longitude: nextSnap.longitude,
      };
      setProfile(updatedProfile);
      localStorage.setItem(LS_PROFILE_KEY, JSON.stringify(updatedProfile));
      setPlan(buildRuleBasedDailyPlan(nextSnap, updatedProfile, updatedProfile.language));
      return true;
    },
    [fetchAqi]
  );

  const handleGeolocate = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setLocationNotice('Geolocation is not supported in this browser. Search your city above.');
      return;
    }
    setLocationNotice('Detecting your coordinates...');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const nextSnap = await fetchAqi({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        if (nextSnap) {
          setLocationNotice(null);
          setPlan(buildRuleBasedDailyPlan(nextSnap, profileRef.current, profileRef.current.language));
        }
      },
      () => {
        setLocationNotice('Location permission declined. Select or search your city manually.');
      },
      { timeout: 6000 }
    );
  }, [fetchAqi]);

  const handleToggleLanguage = useCallback(() => {
    const nextLang: LanguageCode = profile.language === 'en' ? 'hi' : 'en';
    const nextProfile: HouseholdProfile = { ...profile, language: nextLang };
    setProfile(nextProfile);
    localStorage.setItem(LS_PROFILE_KEY, JSON.stringify(nextProfile));
    setPlan(buildRuleBasedDailyPlan(snapshot, nextProfile, nextLang));
    if (authUser) {
      void loadFirebase().then((fb) => fb.saveHouseholdToCloud(authUser.uid, nextProfile)).catch(() => {});
    }
  }, [profile, snapshot, authUser]);

  const handleSaveProfile = useCallback(
    (next: HouseholdProfile) => {
      setProfile(next);
      localStorage.setItem(LS_PROFILE_KEY, JSON.stringify(next));
      void generateDailyPlan(snapshot, next);
      if (authUser) {
        void loadFirebase().then((fb) => fb.saveHouseholdToCloud(authUser.uid, next)).catch(() => {});
      }
    },
    [snapshot, authUser, generateDailyPlan]
  );

  const handleLogAction = useCallback(
    (action: CleanAirActionOption) => {
      const entry: ActionLogEntry = {
        id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        actionId: action.actionId,
        label: profile.language === 'hi' ? action.labelHi : action.labelEn,
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
    },
    [actionLogs, authUser, profile]
  );

  const handleDeleteLog = useCallback(
    (id: string) => {
      const nextLogs = actionLogs.filter((l) => l.id !== id);
      setActionLogs(nextLogs);
      localStorage.setItem(LS_LOGS_KEY, JSON.stringify(nextLogs));
    },
    [actionLogs]
  );

  const handleSelectCommunityGroup = useCallback(
    (groupId: string) => {
      const nextProfile = { ...profile, communityGroupId: groupId };
      setProfile(nextProfile);
      localStorage.setItem(LS_PROFILE_KEY, JSON.stringify(nextProfile));
      if (authUser) {
        void loadFirebase().then((fb) => fb.saveHouseholdToCloud(authUser.uid, nextProfile)).catch(() => {});
      }
    },
    [profile, authUser]
  );

  const handleSignIn = useCallback(async () => {
    try {
      const fb = await loadFirebase();
      await fb.signInWithGoogle();
    } catch (err) {
      console.warn('Google sign-in cancelled or blocked:', err);
    }
  }, []);

  const handleSignOut = useCallback(async () => {
    const fb = await loadFirebase();
    await fb.signOutUser();
  }, []);

  const handleDeleteAllData = useCallback(async () => {
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
  }, [authUser, profile.communityGroupId]);

  return {
    activeTab,
    setActiveTab,
    darkMode,
    setDarkMode,
    profile,
    snapshot,
    loadingAqi,
    cityInput,
    setCityInput,
    locationNotice,
    plan,
    loadingPlan,
    chatMessages,
    setChatMessages,
    actionLogs,
    cloudContributions,
    profileModalOpen,
    setProfileModalOpen,
    authUser,
    fetchAqi,
    generateDailyPlan,
    selectCity,
    handleGeolocate,
    handleToggleLanguage,
    handleSaveProfile,
    handleLogAction,
    handleDeleteLog,
    handleSelectCommunityGroup,
    handleSignIn,
    handleSignOut,
    handleDeleteAllData,
  };
}
