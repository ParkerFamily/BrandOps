import { Image, KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";
import { AnimatedWelcomeBackground } from "@/components/onboarding/AnimatedWelcomeBackground";
import { BrandOpsTheme } from "@/constants/brandopsTheme";

type Props = {
  title: string;
  subtitle: string;
  eyebrow?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
};

export function AccountAuthShell({ title, subtitle, eyebrow = "BrandOps", children, footer }: Props) {
  return (
    <View style={{ flex: 1, backgroundColor: BrandOpsTheme.colors.bg }}>
      <AnimatedWelcomeBackground active />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: 22,
            paddingTop: 56,
            paddingBottom: 32,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={{ alignItems: "center", marginBottom: 28 }}>
            <View style={{ position: "relative", marginBottom: 18 }}>
              <View
                pointerEvents="none"
                style={{
                  position: "absolute",
                  top: -18,
                  left: -28,
                  right: -28,
                  bottom: -18,
                  borderRadius: 999,
                  backgroundColor: BrandOpsTheme.colors.lime,
                  opacity: 0.14,
                }}
              />
              <Image
                source={require("../../assets/images/brandops-logo-transparent-app.png")}
                resizeMode="contain"
                style={{ height: 48, width: 240 }}
              />
            </View>
            <Text
              style={{
                color: BrandOpsTheme.colors.lime,
                fontSize: 11,
                fontWeight: "800",
                letterSpacing: 2,
                textTransform: "uppercase",
                marginBottom: 10,
              }}
            >
              {eyebrow}
            </Text>
            <Text
              style={{
                color: BrandOpsTheme.colors.text,
                fontSize: 30,
                fontWeight: "900",
                letterSpacing: -0.8,
                textAlign: "center",
              }}
            >
              {title}
            </Text>
            <Text
              style={{
                color: BrandOpsTheme.colors.muted,
                fontSize: 15,
                lineHeight: 22,
                textAlign: "center",
                marginTop: 10,
                maxWidth: 320,
              }}
            >
              {subtitle}
            </Text>
          </View>

          <View
            style={{
              borderRadius: 24,
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.10)",
              backgroundColor: "rgba(255,255,255,0.035)",
              padding: 22,
              gap: 16,
              ...BrandOpsTheme.shadow.soft,
            }}
          >
            <View
              pointerEvents="none"
              style={{
                position: "absolute",
                top: 0,
                left: 24,
                right: 24,
                height: 1,
                backgroundColor: "rgba(198,255,0,0.35)",
              }}
            />
            {children}
          </View>

          {footer ? <View style={{ marginTop: 22, alignItems: "center" }}>{footer}</View> : null}

          <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 8, marginTop: 24 }}>
            {["SOC2-ready", "Stripe payouts", "AI workflows"].map((pill) => (
              <View
                key={pill}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.08)",
                  backgroundColor: "rgba(255,255,255,0.03)",
                }}
              >
                <Text style={{ color: BrandOpsTheme.colors.subtle, fontSize: 11, fontWeight: "700" }}>{pill}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

/** @deprecated Use AuthTextField */
export const authInputStyle = {
  height: 52,
  borderRadius: 14,
  paddingHorizontal: 16,
  backgroundColor: "rgba(255,255,255,0.04)",
  borderWidth: 1,
  borderColor: "rgba(255,255,255,0.10)",
  color: BrandOpsTheme.colors.text,
} as const;
