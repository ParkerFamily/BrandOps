import { ActivityIndicator, View, Text } from "react-native";
import { Redirect } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { hasCompletedCinematicOnboarding, isOnboardingGateComplete } from "@/lib/onboardingStorage";
import { resolvePostAuthRoute } from "@/lib/postAuthRoute";
import { BrandOpsTheme } from "@/constants/brandopsTheme";
import { useEffect, useState } from "react";

export default function Index() {
  const { isAuthenticated, loading, role, profileComplete } = useAuth();
  const [cinematicDone, setCinematicDone] = useState<boolean | null>(null);

  useEffect(() => {
    void hasCompletedCinematicOnboarding().then(setCinematicDone);
  }, []);

  if (loading || (!isAuthenticated && cinematicDone === null)) {
    return (
      <View style={{ flex: 1, backgroundColor: BrandOpsTheme.colors.bg, alignItems: "center", justifyContent: "center", gap: 12 }}>
        <ActivityIndicator color={BrandOpsTheme.colors.lime} size="large" />
        <Text style={{ color: BrandOpsTheme.colors.muted, fontWeight: "700" }}>Loading BrandOps…</Text>
      </View>
    );
  }

  if (isAuthenticated) {
    const onboardingComplete = isOnboardingGateComplete(cinematicDone, role);
    return <Redirect href={resolvePostAuthRoute({ profileComplete, onboardingComplete })} />;
  }

  const onboardingComplete = isOnboardingGateComplete(cinematicDone, role);
  if (!onboardingComplete) return <Redirect href="/(auth)/onboarding" />;
  return <Redirect href="/(auth)/signup" />;
}
