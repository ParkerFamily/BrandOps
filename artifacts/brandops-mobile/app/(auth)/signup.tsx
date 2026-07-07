import { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { Link, useRouter } from "expo-router";
import Toast from "react-native-toast-message";
import { AccountAuthShell } from "@/components/auth/AccountAuthShell";
import { AuthModuleErrorBoundary } from "@/components/auth/AuthModuleErrorBoundary";
import { AuthTextField } from "@/components/auth/AuthTextField";
import { SocialAuthButtons, useSocialAuthAvailable } from "@/components/auth/SocialAuthButtons";
import { WorkspaceProvisioning } from "@/components/auth/WorkspaceProvisioning";
import { StrategySummary } from "@/components/onboarding/StrategySummary";
import { BrandOpsButton } from "@/components/ui/BrandOpsButton";
import { BrandOpsTheme } from "@/constants/brandopsTheme";
import { useAuth } from "@/contexts/AuthContext";
import { getFirebase } from "@/lib/firebase";
import type { AppleAuthCredentials } from "@/lib/appleSignIn";
import { hasCompletedCinematicOnboarding, isOnboardingGateComplete, readOnboardingAnswers } from "@/lib/onboardingStorage";
import { provisioningSteps } from "@/lib/onboardingStrategy";
import { provisionWorkspace } from "@/lib/provisionWorkspace";
import { sendWelcomeEmailFromMobile } from "@/lib/emailApi";

export default function SignupScreen() {
  const router = useRouter();
  const { role, signUpWithEmail, signUpWithGoogle, signUpWithApple, refreshProfile, isAuthenticated } = useAuth();
  const socialAuthAvailable = useSocialAuthAvailable();
  const provisionedRef = useRef(false);

  const [saved, setSaved] = useState<Awaited<ReturnType<typeof readOnboardingAnswers>>>(null);
  const [ready, setReady] = useState(false);
  const [showEmail, setShowEmail] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [provisioning, setProvisioning] = useState(false);
  const [provisionSteps, setProvisionSteps] = useState<string[]>(["Creating workspace…"]);

  useEffect(() => {
    void (async () => {
      const done = await hasCompletedCinematicOnboarding();
      const answers = await readOnboardingAnswers();
      if (!isOnboardingGateComplete(done, role) || !answers?.strategy || !answers.profile) {
        router.replace("/(auth)/onboarding");
        return;
      }
      setSaved(answers);
      setProvisionSteps(provisioningSteps(answers.profile));
      setReady(true);
    })();
  }, [role, router]);

  const finishAndEnterApp = async () => {
    if (provisionedRef.current || !role) return;
    const firebase = getFirebase();
    const authUser = firebase?.auth.currentUser;
    if (!authUser) return;

    provisionedRef.current = true;
    setProvisioning(true);
    try {
      await provisionWorkspace({
        uid: authUser.uid,
        email: authUser.email,
        displayName: authUser.displayName,
        role,
        onStep: (label, index) => {
          setProvisionSteps((prev) => {
            const next = [...prev];
            next[index] = label;
            return next;
          });
        },
      });
      await refreshProfile();
      router.replace("/(tabs)");
    } catch {
      provisionedRef.current = false;
      Toast.show({ type: "error", text1: "Workspace setup failed", text2: "Try again in a moment." });
    } finally {
      setProvisioning(false);
    }
  };

  useEffect(() => {
    if (!ready || provisioning || provisionedRef.current || !isAuthenticated || !role) return;
    void finishAndEnterApp();
  }, [ready, isAuthenticated, role, provisioning]);

  const handleGoogle = async (idToken: string) => {
    try {
      setLoading(true);
      await signUpWithGoogle(idToken);
      await finishAndEnterApp();
    } catch (e: unknown) {
      provisionedRef.current = false;
      const message = e instanceof Error ? e.message : "Try again.";
      Toast.show({ type: "error", text1: "Google sign-in failed", text2: message.replace("Firebase: ", "").replace(/\(auth\/.*\)\.?/g, "").trim() });
    } finally {
      setLoading(false);
    }
  };

  const handleApple = async (credentials: AppleAuthCredentials) => {
    try {
      setLoading(true);
      await signUpWithApple(credentials);
      await finishAndEnterApp();
    } catch (e: unknown) {
      provisionedRef.current = false;
      const message = e instanceof Error ? e.message : "Try again.";
      Toast.show({ type: "error", text1: "Apple sign-in failed", text2: message.replace("Firebase: ", "").replace(/\(auth\/.*\)\.?/g, "").trim() });
    } finally {
      setLoading(false);
    }
  };

  if (!ready || !saved?.strategy || !saved.profile) {
    return null;
  }

  return (
    <View style={{ flex: 1 }}>
      <AccountAuthShell
        eyebrow="Strategy ready"
        title="Create your account"
        subtitle="Your answers are saved locally and will attach to your account automatically."
        footer={
          <Link href="/(auth)/login?returning=1" asChild>
            <Pressable>
              <Text style={{ color: BrandOpsTheme.colors.muted, fontSize: 14, textAlign: "center" }}>
                Already have an account? <Text style={{ color: BrandOpsTheme.colors.lime, fontWeight: "800" }}>Sign in</Text>
              </Text>
            </Pressable>
          </Link>
        }
      >
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 18, paddingBottom: 8 }}>
          <StrategySummary
            strategy={saved.strategy}
            workspace={saved.profile.workspace === "creator" ? "creator" : "brand"}
          />

          <AuthModuleErrorBoundary>
            {socialAuthAvailable ? (
              <SocialAuthButtons
                loading={loading || provisioning}
                disabled={loading || provisioning}
                onGoogleIdToken={handleGoogle}
                onAppleCredentials={handleApple}
                onGoogleError={(message) => Toast.show({ type: "error", text1: "Google sign-in failed", text2: message })}
                onAppleError={(message) => Toast.show({ type: "error", text1: "Apple sign-in failed", text2: message })}
              />
            ) : null}
          </AuthModuleErrorBoundary>

          {!showEmail ? (
            <BrandOpsButton label="Continue with Email" variant="secondary" onPress={() => setShowEmail(true)} disabled={loading || provisioning} />
          ) : (
            <View style={{ gap: 14 }}>
              <AuthTextField label="Full name" value={name} onChangeText={setName} placeholder="Your name" autoComplete="name" />
              <AuthTextField label="Work email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="you@brand.com" autoComplete="email" />
              <AuthTextField label="Password" value={password} onChangeText={setPassword} secureTextEntry placeholder="At least 6 characters" autoComplete="new-password" />
              <BrandOpsButton
                label={loading ? "Creating account…" : "Create account"}
                loading={loading || provisioning}
                onPress={async () => {
                  const trimmedEmail = email.trim();
                  const trimmedName = name.trim() || "BrandOps User";
                  if (!trimmedEmail) return Toast.show({ type: "error", text1: "Enter your email" });
                  if (password.length < 6) return Toast.show({ type: "error", text1: "Password too short", text2: "Use at least 6 characters." });
                  try {
                    setLoading(true);
                    await signUpWithEmail(trimmedEmail, password, trimmedName);
                    sendWelcomeEmailFromMobile({ to: trimmedEmail, name: trimmedName });
                    await finishAndEnterApp();
                  } catch (e: unknown) {
                    provisionedRef.current = false;
                    const message = e instanceof Error ? e.message : "Try again.";
                    Toast.show({ type: "error", text1: "Signup failed", text2: message.replace("Firebase: ", "").trim() });
                  } finally {
                    setLoading(false);
                  }
                }}
              />
            </View>
          )}

        </ScrollView>
      </AccountAuthShell>

      <WorkspaceProvisioning steps={provisionSteps} active={provisioning} />
    </View>
  );
}
