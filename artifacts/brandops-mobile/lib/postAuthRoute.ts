import AsyncStorage from "@react-native-async-storage/async-storage";
import type { UserRole } from "@/lib/types";
import { hasCompletedCinematicOnboarding, isOnboardingGateComplete } from "@/lib/onboardingStorage";
import { hydrateSessionFromFirestore } from "@/lib/userProfile";

export type PostAuthRoute = "/(auth)/onboarding" | "/(auth)/signup" | "/(tabs)";

/** Where an authenticated session should land before entering the main app. */
export function resolvePostAuthRoute(input: {
  profileComplete: boolean;
  onboardingComplete: boolean;
}): PostAuthRoute {
  if (input.profileComplete) return "/(tabs)";
  if (!input.onboardingComplete) return "/(auth)/onboarding";
  return "/(auth)/signup";
}

export async function resolvePostAuthRouteForUid(uid: string): Promise<PostAuthRoute> {
  const ROLE_KEY = "brandops:userRole:v2";
  const [session, cinematicDone, localRoleRaw] = await Promise.all([
    hydrateSessionFromFirestore(uid),
    hasCompletedCinematicOnboarding(),
    AsyncStorage.getItem(ROLE_KEY),
  ]);
  const localRole = localRoleRaw as UserRole | null;
  const profileComplete = Boolean(session.role);
  const onboardingComplete = isOnboardingGateComplete(cinematicDone, localRole ?? session.role);
  return resolvePostAuthRoute({ profileComplete, onboardingComplete });
}

export function canEnterMainApp(profileComplete: boolean, role: UserRole | null | undefined): boolean {
  return profileComplete && Boolean(role);
}
