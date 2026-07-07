import { useState } from "react";
import { Alert, Platform, Text, View } from "react-native";
import Toast from "react-native-toast-message";
import { useRouter } from "expo-router";
import { sendPasswordResetEmail } from "firebase/auth";
import { BrandOpsScreen } from "@/components/ui/BrandOpsScreen";
import { BrandOpsButton } from "@/components/ui/BrandOpsButton";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { SettingsRow } from "@/components/settings/SettingsRow";
import { useAuth } from "@/contexts/AuthContext";
import { AccountDeletionRequiresRecentLogin } from "@/lib/deleteAccount";
import { getFirebase } from "@/lib/firebase";
import { BrandOpsTheme } from "@/constants/brandopsTheme";

export default function SecuritySettingsScreen() {
  const router = useRouter();
  const { authEmail, deleteAccount } = useAuth();
  const [deleting, setDeleting] = useState(false);

  const resetPassword = async () => {
    const email = authEmail?.trim();
    if (!email) {
      Toast.show({ type: "error", text1: "No email on account", text2: "Use the sign-in method you registered with." });
      return;
    }
    const firebase = getFirebase();
    if (!firebase) return;

    try {
      await sendPasswordResetEmail(firebase.auth, email);
      Alert.alert("Check your email", `We sent a password reset link to ${email}.`);
    } catch (err) {
      Toast.show({
        type: "error",
        text1: "Could not send reset email",
        text2: err instanceof Error ? err.message : "Try again later.",
      });
    }
  };

  const runDelete = async (password?: string) => {
    setDeleting(true);
    try {
      await deleteAccount(password);
      Toast.show({ type: "success", text1: "Account deleted", text2: "Your BrandOps account has been removed." });
      router.replace("/(auth)/login" as never);
    } catch (err) {
      if (err instanceof AccountDeletionRequiresRecentLogin) {
        if (Platform.OS === "ios" && authEmail) {
          Alert.prompt(
            "Confirm your password",
            "For security, enter your password to permanently delete your account.",
            [
              { text: "Cancel", style: "cancel" },
              {
                text: "Delete account",
                style: "destructive",
                onPress: (value) => {
                  if (!value?.trim()) {
                    Toast.show({ type: "error", text1: "Password required" });
                    return;
                  }
                  void runDelete(value.trim());
                },
              },
            ],
            "secure-text"
          );
        } else {
          Alert.alert(
            "Sign in again required",
            "For security, sign out, sign back in, then return to Settings → Security → Delete account."
          );
        }
        return;
      }
      Toast.show({
        type: "error",
        text1: "Could not delete account",
        text2: err instanceof Error ? err.message : "Try again or contact support@brandopsapp.com.",
      });
    } finally {
      setDeleting(false);
    }
  };

  const confirmDeleteAccount = () => {
    Alert.alert(
      "Delete account?",
      "This permanently deletes your BrandOps account and removes your profile from our platform. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete account",
          style: "destructive",
          onPress: () => void runDelete(),
        },
      ]
    );
  };

  return (
    <BrandOpsScreen scroll tabBarInset={false}>
      <SettingsSection title="Security">
        <SettingsRow
          icon="key-outline"
          title="Change password"
          subtitle="Send a reset link to your email"
          onPress={() => void resetPassword()}
        />
      </SettingsSection>

      <SettingsSection
        title="Delete account"
        description="Permanently remove your BrandOps account and associated profile data from our platform."
      >
        <View style={{ paddingHorizontal: 4, paddingBottom: 8, gap: 12 }}>
          <Text style={{ color: BrandOpsTheme.colors.muted, fontSize: 13, lineHeight: 20 }}>
            Account deletion is immediate and cannot be undone. Approved campaign work already licensed to brands may be
            retained per our Terms of Service.
          </Text>
          <BrandOpsButton
            label={deleting ? "Deleting…" : "Delete my account"}
            variant="secondary"
            loading={deleting}
            onPress={confirmDeleteAccount}
          />
        </View>
      </SettingsSection>
    </BrandOpsScreen>
  );
}
