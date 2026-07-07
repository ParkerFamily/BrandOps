import { Redirect } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { hasCompletedCinematicOnboarding, isOnboardingGateComplete } from "@/lib/onboardingStorage";
import { useEffect, useState } from "react";

export default function Index() {
  const { user, isAuthenticated, loading, role } = useAuth();
  const [cinematicDone, setCinematicDone] = useState<boolean | null>(null);

  useEffect(() => {
    void hasCompletedCinematicOnboarding().then(setCinematicDone);
  }, []);

  if (loading || (!isAuthenticated && cinematicDone === null)) return null;

  if (isAuthenticated) return <Redirect href="/(tabs)" />;

  const onboardingComplete = isOnboardingGateComplete(cinematicDone, role);
  if (!onboardingComplete) return <Redirect href="/(auth)/onboarding" />;
  if (!user) return <Redirect href="/(auth)/signup" />;
  return <Redirect href="/(tabs)" />;
}
