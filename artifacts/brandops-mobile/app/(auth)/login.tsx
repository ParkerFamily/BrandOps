import { useState } from "react";
import { Pressable, Text } from "react-native";
import { Link, useRouter } from "expo-router";
import Toast from "react-native-toast-message";
import { AccountAuthShell } from "@/components/auth/AccountAuthShell";
import { AuthModuleErrorBoundary } from "@/components/auth/AuthModuleErrorBoundary";
import { AuthTextField } from "@/components/auth/AuthTextField";
import { SocialAuthButtons, useSocialAuthAvailable } from "@/components/auth/SocialAuthButtons";
import { BrandOpsButton } from "@/components/ui/BrandOpsButton";
import { BrandOpsTheme } from "@/constants/brandopsTheme";
import { useAuth } from "@/contexts/AuthContext";
import type { AppleAuthCredentials } from "@/lib/appleSignIn";
import { getFirebase } from "@/lib/firebase";
import { resolvePostAuthRouteForUid } from "@/lib/postAuthRoute";

export default function LoginScreen() {
  const router = useRouter();
  const { signInWithEmail, signInWithGoogle, signInWithApple } = useAuth();
  const socialAuthAvailable = useSocialAuthAvailable();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const finishAuth = async () => {
    const uid = getFirebase()?.auth.currentUser?.uid;
    if (!uid) return;

    const destination = await resolvePostAuthRouteForUid(uid);
    Toast.show({
      type: "success",
      text1: destination === "/(tabs)" ? "Welcome back" : "Almost there",
      text2: destination === "/(tabs)" ? "You're in." : "Let's finish setting up your workspace.",
    });
    router.replace(destination);
  };

  const handleGoogle = async (idToken: string) => {
    try {
      setLoading(true);
      await signInWithGoogle(idToken);
      await finishAuth();
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

  const handleApple = async (credentials: AppleAuthCredentials) => {
    try {
      setLoading(true);
      await signInWithApple(credentials);
      await finishAuth();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Try again.";
      Toast.show({
        type: "error",
        text1: "Apple sign-in failed",
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
      {socialAuthAvailable ? (
        <AuthModuleErrorBoundary>
          <SocialAuthButtons
            loading={loading}
            disabled={loading}
            onGoogleIdToken={handleGoogle}
            onAppleCredentials={handleApple}
            onGoogleError={(message) =>
              Toast.show({
                type: "error",
                text1: "Google sign-in failed",
                text2: message.replace("Firebase: ", "").replace(/\(auth\/.*\)\.?/g, "").trim(),
              })
            }
            onAppleError={(message) =>
              Toast.show({
                type: "error",
                text1: "Apple sign-in failed",
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
            await finishAuth();
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

    </AccountAuthShell>
  );
}
