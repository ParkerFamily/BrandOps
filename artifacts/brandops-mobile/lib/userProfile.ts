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
  workspacesSetup?: Partial<WorkspacesSetupState>;
  workspacesOnboarding?: Partial<Record<"brand" | "creator", Record<string, unknown>>>;
};

function inferRoleFromFirestore(data: FirestoreUserDoc): UserRole | null {
  if (data.role) return data.role;

  const onboarding = data.onboarding;
  if (onboarding && typeof onboarding === "object" && "accountType" in onboarding) {
    const accountType = String(onboarding.accountType ?? "");
    if (accountType === "creator") return "creator";
    if (accountType === "creator_manager") return "creator_manager";
    if (accountType === "agency") return "agency";
    if (accountType) return "brand";
  }

  if (onboarding && typeof onboarding === "object" && "inferredRole" in onboarding) {
    return onboarding.inferredRole as UserRole;
  }

  if (onboarding && typeof onboarding === "object" && "workspace" in onboarding) {
    const workspace = onboarding.workspace;
    if (workspace === "creator") return "creator";
    if (workspace === "brand") return "brand";
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
  }

  return {
    role,
    mobileCinematicComplete: Boolean(data.mobileCinematicOnboardingComplete) || Boolean(role),
  };
}

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
      email: input.email ?? null,
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
