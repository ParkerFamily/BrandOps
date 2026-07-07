import { useState } from "react";
import { Pressable, Text } from "react-native";
import { Link, useRouter } from "expo-router";
import Toast from "react-native-toast-message";
import { AccountAuthShell } from "@/components/auth/AccountAuthShell";
import { AuthModuleErrorBoundary } from "@/components/auth/AuthModuleErrorBoundary";
import { AuthTextField } from "@/components/auth/AuthTextField";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { BrandOpsButton } from "@/components/ui/BrandOpsButton";
import { BrandOpsTheme } from "@/constants/brandopsTheme";
import { useAuth } from "@/contexts/AuthContext";
import { isGoogleSignInConfigured } from "@/lib/env";

export default function LoginScreen() {
  const router = useRouter();
  const { signInWithEmail, signInWithGoogle } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const finishAuth = () => {
    Toast.show({
      type: "success",
      text1: "Welcome back",
      text2: "You're in.",
    });
    router.replace("/(tabs)");
  };

  const handleGoogle = async (idToken: string) => {
    try {
      setLoading(true);
      await signInWithGoogle(idToken);
      finishAuth();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Try again.";
      Toast.show({
        type: "error",
        text1: "Google sign-in failed",
        text2: message.replace("Firebase: ", "").replace(/\(auth\/.*\)\.?/g, "").trim(),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AccountAuthShell
      eyebrow="Secure sign in"
      title="Welcome back"
      subtitle="Sign in to your BrandOps workspace — campaigns, approvals, and payouts in one place."
      footer={
        <Link href="/(auth)/onboarding" asChild>
          <Pressable>
            <Text style={{ color: BrandOpsTheme.colors.muted, fontSize: 14, textAlign: "center" }}>
              New to BrandOps?{" "}
              <Text style={{ color: BrandOpsTheme.colors.lime, fontWeight: "800" }}>Get started</Text>
            </Text>
          </Pressable>
        </Link>
      }
    >
      {isGoogleSignInConfigured() ? (
        <AuthModuleErrorBoundary>
          <GoogleSignInButton
            loading={loading}
            disabled={loading}
            onIdToken={handleGoogle}
            onError={(message) =>
              Toast.show({
                type: "error",
                text1: "Google sign-in failed",
                text2: message.replace("Firebase: ", "").replace(/\(auth\/.*\)\.?/g, "").trim(),
              })
            }
          />
        </AuthModuleErrorBoundary>
      ) : null}

      <AuthTextField
        label="Work email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
        placeholder="you@brand.com"
      />
      <AuthTextField
        label="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="password"
        placeholder="••••••••"
      />

      <BrandOpsButton
        label={loading ? "Signing in…" : "Sign in"}
        loading={loading}
        onPress={async () => {
          const trimmedEmail = email.trim();
          if (!trimmedEmail) {
            Toast.show({ type: "error", text1: "Enter your email" });
            return;
          }
          if (!password) {
            Toast.show({ type: "error", text1: "Enter your password" });
            return;
          }
          try {
            setLoading(true);
            await signInWithEmail(trimmedEmail, password);
            finishAuth();
          } catch (e: unknown) {
            const message = e instanceof Error ? e.message : "Try again.";
            Toast.show({
              type: "error",
              text1: "Sign in failed",
              text2: message.replace("Firebase: ", "").replace(/\(auth\/.*\)\.?/g, "").trim() || "Incorrect email or password.",
            });
          } finally {
            setLoading(false);
          }
        }}
      />

      {!isGoogleSignInConfigured() ? (
        <Text style={{ fontSize: 12, color: BrandOpsTheme.colors.subtle, textAlign: "center" }}>
          Add Google client IDs in `.env` to enable Google sign-in.
        </Text>
      ) : null}
    </AccountAuthShell>
  );
}
