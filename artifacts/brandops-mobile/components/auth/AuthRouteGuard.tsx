import { useEffect, useRef, useState } from "react";
import { useRootNavigationState, useRouter, useSegments } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { hasCompletedCinematicOnboarding, isOnboardingGateComplete } from "@/lib/onboardingStorage";
import { resolvePostAuthRoute } from "@/lib/postAuthRoute";
import { readPendingWorkspaceSwitch } from "@/lib/workspaceSetup";

/**
 * Route rules:
 * - Signed in + Firestore profile → app
 * - Signed in + no profile → onboarding, then signup/provisioning
 * - Not signed in → onboarding / signup / login allowed; default entry is onboarding
 */
export function AuthRouteGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading: authLoading, profileComplete, role } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const rootNavigationState = useRootNavigationState();
  const [cinematicDone, setCinematicDone] = useState<boolean | null>(null);
  const [pendingWorkspaceSwitch, setPendingWorkspaceSwitchState] = useState<string | null>(null);
  const lastRedirect = useRef<string | null>(null);

  useEffect(() => {
    void hasCompletedCinematicOnboarding().then(setCinematicDone);
  }, [isAuthenticated, profileComplete, role]);

  useEffect(() => {
    void readPendingWorkspaceSwitch().then(setPendingWorkspaceSwitchState);
  }, [isAuthenticated, profileComplete, role, segments.join("/")]);

  const navReady = Boolean(rootNavigationState?.key);
  const onboardingComplete = isOnboardingGateComplete(cinematicDone, role);
  const bootstrapping = authLoading;

  const inAuth = segments[0] === "(auth)";
  const onOnboarding = inAuth && segments[1] === "onboarding";
  const onSignup = inAuth && segments[1] === "signup";
  const onLogin = inAuth && segments[1] === "login";

  useEffect(() => {
    if (!navReady || bootstrapping) return;

    let target: string | null = null;
    const switchingWorkspace = Boolean(pendingWorkspaceSwitch) && onOnboarding;

    if (isAuthenticated) {
      if (switchingWorkspace) {
        lastRedirect.current = null;
        return;
      }

      if (!profileComplete) {
        target = resolvePostAuthRoute({ profileComplete, onboardingComplete });
        if (target === "/(auth)/onboarding" && onOnboarding) target = null;
        if (target === "/(auth)/signup" && onSignup) target = null;
      } else if (inAuth || segments.join("/") === "") {
        target = "/(tabs)";
      }
    } else if (onboardingComplete && !onSignup && !onLogin && !onOnboarding) {
      target = "/(auth)/signup";
    } else if (!onboardingComplete && !onOnboarding && !onLogin) {
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
    onboardingComplete,
    onLogin,
    onOnboarding,
    onSignup,
    pendingWorkspaceSwitch,
    profileComplete,
    role,
    router,
    segments.join("/"),
  ]);

  if (!navReady) return null;

  return <>{children}</>;
}
