import { useEffect, useRef, useState } from "react";
import { useRootNavigationState, useRouter, useSegments } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { hasCompletedCinematicOnboarding, isOnboardingGateComplete } from "@/lib/onboardingStorage";
import { readPendingWorkspaceSwitch } from "@/lib/workspaceSetup";

/**
 * Route rules:
 * - Signed in → app (never redo the questionnaire)
 * - Not signed in → onboarding / signup / login allowed; default entry is onboarding (Get started)
 */
export function AuthRouteGuard({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, loading: authLoading, role } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const rootNavigationState = useRootNavigationState();
  const [cinematicDone, setCinematicDone] = useState<boolean | null>(null);
  const [pendingWorkspaceSwitch, setPendingWorkspaceSwitchState] = useState<string | null>(null);
  const lastRedirect = useRef<string | null>(null);

  useEffect(() => {
    void hasCompletedCinematicOnboarding().then(setCinematicDone);
  }, [isAuthenticated, role, user?.uid]);

  useEffect(() => {
    void readPendingWorkspaceSwitch().then(setPendingWorkspaceSwitchState);
  }, [isAuthenticated, role, user?.uid, segments.join("/")]);

  const navReady = Boolean(rootNavigationState?.key);
  const onboardingComplete = isOnboardingGateComplete(cinematicDone, role);
  // Wait for Firebase auth hydration before routing — don't treat a cached role as signed-in.
  // Signed-in users enter the app immediately — onboarding flag loads in background.
  const bootstrapping = authLoading && !isAuthenticated;

  const inAuth = segments[0] === "(auth)";
  const onOnboarding = inAuth && segments[1] === "onboarding";
  const onSignup = inAuth && segments[1] === "signup";
  const onLogin = inAuth && segments[1] === "login";

  useEffect(() => {
    if (!navReady || bootstrapping) return;

    let target: string | null = null;

    if (isAuthenticated) {
      const switchingWorkspace = Boolean(pendingWorkspaceSwitch) && onOnboarding;
      if ((inAuth || segments.length === 0) && !switchingWorkspace) {
        target = "/(tabs)";
      }
    } else if (onboardingComplete && !onSignup && !onLogin && !onOnboarding) {
      target = "/(auth)/signup";
    } else if (!onboardingComplete && !onOnboarding && !onLogin) {
      // Allow login without bouncing back to setup.
      target = "/(auth)/onboarding";
    }

    if (!target) {
      lastRedirect.current = null;
      return;
    }

    if (lastRedirect.current === target) return;

    lastRedirect.current = target;
    router.replace(target as never);
  }, [
    bootstrapping,
    inAuth,
    isAuthenticated,
    segments,
    navReady,
    onLogin,
    onOnboarding,
    onboardingComplete,
    onSignup,
    pendingWorkspaceSwitch,
    router,
  ]);

  if (!navReady) return null;

  return <>{children}</>;
}
