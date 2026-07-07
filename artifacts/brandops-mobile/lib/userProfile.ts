import AsyncStorage from "@react-native-async-storage/async-storage";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { getFirebase } from "@/lib/firebase";
import {
  markOnboardingGateComplete,
  ONBOARDING_SESSION_KEY,
  type OnboardingAnswers,
} from "@/lib/onboardingStorage";
import type { UserRole } from "@/lib/types";
import {
  hydrateWorkspacesSetupFromFirestore,
  onboardingWorkspaceField,
  readWorkspacesSetup,
  workspaceSetupToFirestore,
  type WorkspacesSetupState,
} from "@/lib/workspaceSetup";

export type SyncUserProfileInput = {
  uid: string;
  email?: string | null;
  displayName?: string | null;
  role: UserRole;
};

type FirestoreUserDoc = {
  role?: UserRole;
  mobileCinematicOnboardingComplete?: boolean;
  onboarding?: OnboardingAnswers | Record<string, unknown> | null;
  /** Web dashboard stores account type here (`Brand`, `Creator`, etc.). */
  onboardingData?: Record<string, unknown> | null;
  workspacesSetup?: Partial<WorkspacesSetupState>;
  workspacesOnboarding?: Partial<Record<"brand" | "creator", Record<string, unknown>>>;
};

function roleFromAccountType(accountType: unknown): UserRole | null {
  const normalized = String(accountType ?? "").toLowerCase().trim();
  if (!normalized) return null;
  if (normalized === "creator") return "creator";
  if (normalized === "creator manager" || normalized === "creator_manager") return "creator_manager";
  if (normalized === "agency") return "agency";
  if (normalized === "brand") return "brand";
  return "brand";
}

function inferRoleFromFirestore(data: FirestoreUserDoc): UserRole | null {
  if (data.role) return data.role;

  const webOnboarding = data.onboardingData;
  if (webOnboarding && typeof webOnboarding === "object" && "accountType" in webOnboarding) {
    const fromWeb = roleFromAccountType(webOnboarding.accountType);
    if (fromWeb) return fromWeb;
  }

  const onboarding = data.onboarding;
  if (onboarding && typeof onboarding === "object" && "accountType" in onboarding) {
    const fromMobile = roleFromAccountType(onboarding.accountType);
    if (fromMobile) return fromMobile;
  }

  if (onboarding && typeof onboarding === "object" && "inferredRole" in onboarding) {
    return onboarding.inferredRole as UserRole;
  }

  if (onboarding && typeof onboarding === "object" && "workspace" in onboarding) {
    const workspace = onboarding.workspace;
    if (workspace === "creator") return "creator";
    if (workspace === "brand") return "brand";
  }

  if (webOnboarding && typeof webOnboarding === "object" && "workspace" in webOnboarding) {
    const workspace = webOnboarding.workspace;
    if (workspace === "creator") return "creator";
    if (workspace === "brand") return "brand";
  }

  const workspacesSetup = data.workspacesSetup;
  if (workspacesSetup && typeof workspacesSetup === "object") {
    const primary = (workspacesSetup as { primary?: string }).primary;
    if (primary === "creator") return "creator";
    if (primary === "brand") return "brand";
    const brand = Boolean((workspacesSetup as { brand?: boolean }).brand);
    const creator = Boolean((workspacesSetup as { creator?: boolean }).creator);
    if (brand && !creator) return "brand";
    if (creator && !brand) return "creator";
  }

  return null;
}

export type HydratedSession = {
  role: UserRole | null;
  mobileCinematicComplete: boolean;
};

/** Returning sign-in only: load role + mobile cinematic flag from Firestore (never fake local onboarding). */
export async function hydrateSessionFromFirestore(uid: string): Promise<HydratedSession> {
  const firebase = getFirebase();
  if (!firebase) return { role: null, mobileCinematicComplete: false };

  const snap = await getDoc(doc(firebase.db, "users", uid));
  if (!snap.exists()) {
    return { role: null, mobileCinematicComplete: false };
  }

  const data = snap.data() as FirestoreUserDoc;
  const role = inferRoleFromFirestore(data);

  await hydrateWorkspacesSetupFromFirestore(data as Record<string, unknown>);

  if (role) {
    await AsyncStorage.setItem("brandops:userRole:v2", role);
    // Existing account — skip the pre-signup questionnaire on this device.
    const sessionId = (await AsyncStorage.getItem(ONBOARDING_SESSION_KEY)) ?? `restored_${uid}`;
    await markOnboardingGateComplete(sessionId);

    // Web stores account type in onboardingData only — persist role for mobile + rules.
    if (!data.role) {
      try {
        await setDoc(
          doc(firebase.db, "users", uid),
          {
            role,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      } catch {
        // Non-fatal — local session still uses inferred role.
      }
    }
  }

  return {
    role,
    mobileCinematicComplete: Boolean(data.mobileCinematicOnboardingComplete) || Boolean(role),
  };
}

import { normalizeAccountEmail } from "@/lib/authIdentity";

/** Persist onboarding + account metadata to Firestore `users/{uid}`. */
export async function syncUserProfileToFirestore(input: SyncUserProfileInput): Promise<void> {
  const firebase = getFirebase();
  if (!firebase) return;

  const { readOnboardingAnswers, hasCompletedCinematicOnboarding } = await import("@/lib/onboardingStorage");
  const onboarding = await readOnboardingAnswers();
  const cinematicDone = await hasCompletedCinematicOnboarding();
  const workspacesSetup = workspaceSetupToFirestore(await readWorkspacesSetup());
  const now = serverTimestamp();

  const workspaceOnboardingPatch =
    onboarding?.workspace === "brand" || onboarding?.workspace === "creator"
      ? {
          [`workspacesOnboarding.${onboarding.workspace}`]: onboardingWorkspaceField(
            onboarding,
            onboarding.workspace
          ),
        }
      : {};

  await setDoc(
    doc(firebase.db, "users", input.uid),
    {
      email: input.email?.trim() || null,
      emailLower: normalizeAccountEmail(input.email),
      displayName: input.displayName ?? null,
      role: input.role,
      platform: "mobile",
      mobileCinematicOnboardingComplete: cinematicDone,
      onboardingComplete: cinematicDone,
      workspacesSetup,
      ...workspaceOnboardingPatch,
      onboarding: onboarding
        ? {
            identity: onboarding.identity,
            workspace: onboarding.workspace,
            platforms: onboarding.platforms,
            goal: onboarding.goal,
            monthlyBudget: onboarding.monthlyBudget,
            inferredRole: onboarding.inferredRole,
            profile: onboarding.profile,
            strategy: onboarding.strategy,
            matchTags: onboarding.strategy.matchTags,
            completedAt: new Date(onboarding.ts).toISOString(),
            source: "mobile",
          }
        : null,
      updatedAt: now,
      ...(cinematicDone ? { onboardingCompletedAt: now, mobileOnboardingCompletedAt: now } : {}),
    },
    { merge: true }
  );
}
