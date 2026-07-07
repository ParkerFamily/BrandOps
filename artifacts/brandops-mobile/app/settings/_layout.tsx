import { Pressable } from "react-native";
import { Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

function SettingsRootBackButton() {
  const router = useRouter();

  return (
    <Pressable
      onPress={() => {
        if (router.canGoBack()) router.back();
        else router.replace("/(tabs)/profile" as never);
      }}
      hitSlop={8}
      style={{ paddingHorizontal: 4, paddingVertical: 4 }}
      accessibilityRole="button"
      accessibilityLabel="Back to profile"
    >
      <Ionicons name="chevron-back" size={24} color="#FAFAFA" />
    </Pressable>
  );
}

export default function SettingsLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: "#0A0A0A" },
        headerTintColor: "#FAFAFA",
        headerShadowVisible: false,
        headerBackTitle: "Back",
        contentStyle: { backgroundColor: "#0A0A0A" },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: "Settings",
          headerLeft: () => <SettingsRootBackButton />,
        }}
      />
      <Stack.Screen name="account" options={{ title: "Account" }} />
      <Stack.Screen name="notifications" options={{ title: "Notifications" }} />
      <Stack.Screen name="payouts" options={{ title: "Payouts" }} />
      <Stack.Screen name="security" options={{ title: "Security & deletion" }} />
      <Stack.Screen name="workspace" options={{ title: "Workspace" }} />
      <Stack.Screen name="legal" options={{ title: "Legal" }} />
      <Stack.Screen name="support" options={{ title: "Support" }} />
      <Stack.Screen name="about" options={{ title: "About" }} />
      <Stack.Screen name="privacy" options={{ title: "Privacy Policy" }} />
      <Stack.Screen name="terms" options={{ title: "Terms of Service" }} />
    </Stack>
  );
}
