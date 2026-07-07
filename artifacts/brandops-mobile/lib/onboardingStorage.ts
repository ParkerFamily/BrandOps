import AsyncStorage from "@react-native-async-storage/async-storage";
import type { OnboardingProfile, WorkspaceStrategy } from "@/lib/onboardingStrategy";
import type { UserRole } from "@/lib/types";
import { PENDING_WORKSPACE_SWITCH_KEY, WORKSPACES_SETUP_KEY } from "@/lib/workspaceSetup";

export const ONBOARDING_KEY = "brandops:onboarding:v1";
export const ONBOARDING_DRAFT_KEY = "brandops:onboarding:draft:v1";
const ROLE_KEY = "brandops:userRole:v2";
const LOCAL_USER_KEY = "brandops:localUser:v1";
export const ONBOARDING_SESSION_KEY = "brandops:onboarding:session:v1";
export const CINEMATIC_DONE_SESSION_KEY = "brandops:onboarding:cinematicDoneSession:v1";

export type OnboardingAnswers = {
  identity: string | null;
  workspace?: "brand" | "creator" | null;
  platforms: string[];
  goal: string | null;
  monthlyBudget: string;
  inferredRole: UserRole;
  profile: OnboardingProfile;
  strategy: WorkspaceStrategy;
  ts: number;
  source: "mobile";
};

export type OnboardingDraft = {
  step: number;
  answers: OnboardingProfile;
};

export async function saveOnboardingDraft(draft: OnboardingDraft): Promise<void> {
  await AsyncStorage.setItem(ONBOARDING_DRAFT_KEY, JSON.stringify(draft));
}

export async function loadOnboardingDraft(): Promise<OnboardingDraft | null> {
  const raw = await AsyncStorage.getItem(ONBOARDING_DRAFT_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as OnboardingDraft;
  } catch {
    return null;
  }
}

export async function clearOnboardingDraft(): Promise<void> {
  await AsyncStorage.removeItem(ONBOARDING_DRAFT_KEY);
}

function newSessionId(): string {
  return `sess_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export async function ensureOnboardingSession(): Promise<string> {
  const existing = await AsyncStorage.getItem(ONBOARDING_SESSION_KEY);
  if (existing) return existing;
  const id = newSessionId();
  await AsyncStorage.setItem(ONBOARDING_SESSION_KEY, id);
  return id;
}

export async function hasCompletedCinematicOnboarding(): Promise<boolean> {
  const [session, doneSession] = await Promise.all([
    AsyncStorage.getItem(ONBOARDING_SESSION_KEY),
    AsyncStorage.getItem(CINEMATIC_DONE_SESSION_KEY),
  ]);
  return Boolean(session && doneSession && session === doneSession);
}

export async function hasCompletedOnboarding(): Promise<boolean> {
  return hasCompletedCinematicOnboarding();
}

/** Sync gate used by route guards — role is set only after onboarding finishes. */
export function isOnboardingGateComplete(cinematicDone: boolean | null, role: UserRole | null | undefined): boolean {
  return cinematicDone === true || Boolean(role);
}

export async function readOnboardingAnswers(): Promise<OnboardingAnswers | null> {
  const raw = await AsyncStorage.getItem(ONBOARDING_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as OnboardingAnswers;
  } catch {
    return null;
  }
}

/** Mark the mobile onboarding gate complete for this install session. */
export async function markOnboardingGateComplete(sessionId?: string): Promise<void> {
  const session = sessionId ?? (await AsyncStorage.getItem(ONBOARDING_SESSION_KEY)) ?? `restored_${Date.now()}`;
  await AsyncStorage.setItem(ONBOARDING_SESSION_KEY, session);
  await AsyncStorage.setItem(CINEMATIC_DONE_SESSION_KEY, session);
}

export async function markCinematicOnboardingComplete(): Promise<void> {
  const session = await AsyncStorage.getItem(ONBOARDING_SESSION_KEY);
  if (!session) {
    throw new Error("Onboarding session missing — restart from Get started.");
  }
  await markOnboardingGateComplete(session);
  await clearOnboardingDraft();
}

export async function resetOnboardingSession(): Promise<void> {
  await AsyncStorage.multiRemove([
    ONBOARDING_KEY,
    ONBOARDING_DRAFT_KEY,
    ROLE_KEY,
    LOCAL_USER_KEY,
    ONBOARDING_SESSION_KEY,
    CINEMATIC_DONE_SESSION_KEY,
    WORKSPACES_SETUP_KEY,
    PENDING_WORKSPACE_SWITCH_KEY,
  ]);
}

export type { OnboardingProfile } from "@/lib/onboardingStrategy";

export const defaultOnboardingProfile: OnboardingProfile = {
  workspace: null,
  brandName: "",
  businessType: null,
  goal: null,
  monthlyBudget: "2-10k",
  contentStyles: [],
  contentCapabilities: [],
  experienceLevel: null,
  equipment: [],
  creatorPreference: null,
};
