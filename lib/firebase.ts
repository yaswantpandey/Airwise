'use client';

import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  getDocFromServer,
  setDoc,
  deleteDoc,
  collection,
  getDocs,
  query,
  where,
  serverTimestamp,
  writeBatch,
  type Timestamp,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import type {
  ActionLogEntry,
  CommunityLeaderboardEntry,
  HouseholdProfile,
  ImpactStats,
} from './types';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

let connectionTested = false;

/**
 * Startup connectivity check against Firestore (per Firebase integration guidelines).
 */
export async function testFirestoreConnection(): Promise<void> {
  if (connectionTested || typeof window === 'undefined') return;
  connectionTested = true;
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}

export async function signInWithGoogle(): Promise<User> {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

export async function signOutUser(): Promise<void> {
  await signOut(auth);
}

export function subscribeToAuthState(callback: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, callback);
}

/**
 * Sanitize and enforce blueprint maxLength constraints prior to writing to Firestore.
 */
function sanitizeHouseholdPayload(uid: string, profile: HouseholdProfile) {
  return {
    ownerId: uid,
    displayLabel: (profile.displayLabel || 'My Household').trim().slice(0, 60),
    city: (profile.city || 'New Delhi').trim().slice(0, 80),
    latitude: typeof profile.latitude === 'number' ? profile.latitude : 28.6139,
    longitude: typeof profile.longitude === 'number' ? profile.longitude : 77.209,
    language: profile.language === 'hi' ? 'hi' : 'en',
    hasChildren: Boolean(profile.hasChildren),
    hasElderly: Boolean(profile.hasElderly),
    hasPregnant: Boolean(profile.hasPregnant),
    hasAsthmaOrRespiratory: Boolean(profile.hasAsthmaOrRespiratory),
    hasHeartCondition: Boolean(profile.hasHeartCondition),
    commuteMode: profile.commuteMode,
    workFromHome: Boolean(profile.workFromHome),
    schoolGoingKids: Boolean(profile.schoolGoingKids),
    outdoorExercise: profile.outdoorExercise,
    hasAirPurifier: Boolean(profile.hasAirPurifier),
    maskTypes: profile.maskTypes.slice(0, 5),
    ventilationType: profile.ventilationType,
    cookingFuel: profile.cookingFuel,
    hasIndoorPlants: Boolean(profile.hasIndoorPlants),
    budgetLevel: profile.budgetLevel,
    alertAqiThreshold: Math.max(50, Math.min(400, Math.round(profile.alertAqiThreshold || 150))),
    healthConsentAccepted: Boolean(profile.healthConsentAccepted),
    communityGroupId: (profile.communityGroupId || 'rwa-vasant-vihar')
      .replace(/[^a-zA-Z0-9_-]/g, '')
      .slice(0, 64),
  };
}

export async function loadHouseholdFromCloud(uid: string): Promise<HouseholdProfile | null> {
  const path = `households/${uid}`;
  try {
    const snap = await getDoc(doc(db, 'households', uid));
    if (!snap.exists()) return null;
    const d = snap.data();
    return {
      displayLabel: String(d.displayLabel ?? 'My Household'),
      city: String(d.city ?? 'New Delhi'),
      latitude: typeof d.latitude === 'number' ? d.latitude : undefined,
      longitude: typeof d.longitude === 'number' ? d.longitude : undefined,
      language: d.language === 'hi' ? 'hi' : 'en',
      hasChildren: Boolean(d.hasChildren),
      hasElderly: Boolean(d.hasElderly),
      hasPregnant: Boolean(d.hasPregnant),
      hasAsthmaOrRespiratory: Boolean(d.hasAsthmaOrRespiratory),
      hasHeartCondition: Boolean(d.hasHeartCondition),
      commuteMode: d.commuteMode,
      workFromHome: Boolean(d.workFromHome),
      schoolGoingKids: Boolean(d.schoolGoingKids),
      outdoorExercise: d.outdoorExercise,
      hasAirPurifier: Boolean(d.hasAirPurifier),
      maskTypes: Array.isArray(d.maskTypes) ? d.maskTypes : [],
      ventilationType: d.ventilationType,
      cookingFuel: d.cookingFuel,
      hasIndoorPlants: Boolean(d.hasIndoorPlants),
      budgetLevel: d.budgetLevel,
      alertAqiThreshold: Number(d.alertAqiThreshold ?? 150),
      healthConsentAccepted: Boolean(d.healthConsentAccepted),
      communityGroupId: String(d.communityGroupId ?? 'rwa-vasant-vihar'),
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function saveHouseholdToCloud(uid: string, profile: HouseholdProfile): Promise<void> {
  const path = `households/${uid}`;
  try {
    const ref = doc(db, 'households', uid);
    const existing = await getDoc(ref);
    const base = sanitizeHouseholdPayload(uid, profile);

    if (existing.exists()) {
      await setDoc(
        ref,
        {
          ...base,
          createdAt: existing.data().createdAt,
          updatedAt: serverTimestamp(),
        },
        { merge: false }
      );
    } else {
      await setDoc(ref, {
        ...base,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function loadActionLogsFromCloud(uid: string): Promise<ActionLogEntry[]> {
  const path = `households/${uid}/actionLogs`;
  try {
    const q = query(collection(db, 'households', uid, 'actionLogs'), where('ownerId', '==', uid));
    const snap = await getDocs(q);
    return snap.docs
      .map((docSnap) => {
        const d = docSnap.data();
        const ts = d.createdAt as Timestamp | undefined;
        return {
          id: docSnap.id,
          actionId: String(d.actionId),
          label: String(d.label),
          category: d.category,
          pm25AvoidedUg: Number(d.pm25AvoidedUg ?? 0),
          co2SavedKg: Number(d.co2SavedKg ?? 0),
          pmSavedGrams: Number(d.pmSavedGrams ?? 0),
          dateKey: String(d.dateKey),
          createdAtIso: ts?.toDate ? ts.toDate().toISOString() : new Date().toISOString(),
        } as ActionLogEntry;
      })
      .sort((a, b) => (a.createdAtIso < b.createdAtIso ? 1 : -1));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function addActionLogToCloud(
  uid: string,
  entry: ActionLogEntry,
  profile: HouseholdProfile
): Promise<void> {
  const safeId = entry.id.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64) || `log_${Date.now()}`;
  const path = `households/${uid}/actionLogs/${safeId}`;
  try {
    // Ensure parent household doc exists first (Master Gate invariant)
    const parentRef = doc(db, 'households', uid);
    const parentSnap = await getDoc(parentRef);
    if (!parentSnap.exists()) {
      await saveHouseholdToCloud(uid, profile);
    }
    await setDoc(doc(db, 'households', uid, 'actionLogs', safeId), {
      ownerId: uid,
      actionId: entry.actionId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64),
      label: entry.label.slice(0, 120),
      category: entry.category,
      pm25AvoidedUg: Math.max(0, Math.min(5000, Number(entry.pm25AvoidedUg))),
      co2SavedKg: Math.max(0, Math.min(100, Number(entry.co2SavedKg))),
      pmSavedGrams: Math.max(0, Math.min(500, Number(entry.pmSavedGrams))),
      dateKey: entry.dateKey,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function syncCommunityContributionToCloud(
  uid: string,
  groupId: string,
  alias: string,
  stats: ImpactStats
): Promise<void> {
  const safeGroup = groupId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64);
  const path = `communityGroups/${safeGroup}/contributions/${uid}`;
  try {
    const groupRef = doc(db, 'communityGroups', safeGroup);
    const groupSnap = await getDoc(groupRef);
    if (!groupSnap.exists()) {
      // Seed the community group doc once if absent (no PII)
      await setDoc(groupRef, {
        name: safeGroup.replace(/-/g, ' ').slice(0, 80),
        city: 'Urban NCR',
        area: 'Local Ward',
        groupType: 'rwa',
        challengeTitle: 'Winter Clean-Air Community Challenge',
        challengeTargetActions: 250,
        tips: ['Avoid open waste burning and switch off idling engines near school gates.'],
        createdBy: uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    const contribRef = doc(db, 'communityGroups', safeGroup, 'contributions', uid);
    const contribSnap = await getDoc(contribRef);
    const safeAlias = (alias || 'Clean Air Household').trim().slice(0, 40) || 'Clean Air Household';

    if (contribSnap.exists()) {
      await setDoc(contribRef, {
        ownerId: uid,
        groupId: safeGroup,
        alias: safeAlias,
        weeklyActions: Math.min(500, Math.max(0, stats.weeklyActions)),
        weeklyCo2SavedKg: Math.min(500, Math.max(0, stats.weeklyCo2SavedKg)),
        weeklyExposureAvoidedUg: Math.min(50000, Math.max(0, stats.weeklyPm25AvoidedUg)),
        streakDays: Math.min(365, Math.max(0, stats.streakDays)),
        createdAt: contribSnap.data().createdAt,
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(contribRef, {
        ownerId: uid,
        groupId: safeGroup,
        alias: safeAlias,
        weeklyActions: Math.min(500, Math.max(0, stats.weeklyActions)),
        weeklyCo2SavedKg: Math.min(500, Math.max(0, stats.weeklyCo2SavedKg)),
        weeklyExposureAvoidedUg: Math.min(50000, Math.max(0, stats.weeklyPm25AvoidedUg)),
        streakDays: Math.min(365, Math.max(0, stats.streakDays)),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function loadCommunityContributionsFromCloud(
  groupId: string,
  currentUid?: string
): Promise<CommunityLeaderboardEntry[]> {
  const safeGroup = groupId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64);
  const path = `communityGroups/${safeGroup}/contributions`;
  try {
    const q = query(
      collection(db, 'communityGroups', safeGroup, 'contributions'),
      where('groupId', '==', safeGroup)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        alias: String(data.alias ?? 'Household'),
        weeklyActions: Number(data.weeklyActions ?? 0),
        weeklyCo2SavedKg: Number(data.weeklyCo2SavedKg ?? 0),
        weeklyExposureAvoidedUg: Number(data.weeklyExposureAvoidedUg ?? 0),
        streakDays: Number(data.streakDays ?? 0),
        isCurrentUser: Boolean(currentUid && d.id === currentUid),
      };
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

/**
 * Privacy-first "Delete My Data": erases household profile, all action logs, and community alias.
 */
export async function deleteAllUserCloudData(uid: string, groupId: string): Promise<void> {
  const path = `households/${uid}`;
  try {
    const logsQuery = query(
      collection(db, 'households', uid, 'actionLogs'),
      where('ownerId', '==', uid)
    );
    const logsSnap = await getDocs(logsQuery);
    const batch = writeBatch(db);
    logsSnap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();

    const safeGroup = (groupId || 'rwa-vasant-vihar').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64);
    try {
      await deleteDoc(doc(db, 'communityGroups', safeGroup, 'contributions', uid));
    } catch {
      // Ignore if user never posted to that community group
    }

    await deleteDoc(doc(db, 'households', uid));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}
