import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { AppleSignInButton } from "@/components/auth/AppleSignInButton";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { BrandOpsTheme } from "@/constants/brandopsTheme";
import { isAppleSignInAvailable, type AppleAuthCredentials } from "@/lib/appleSignIn";
import { isGoogleSignInConfigured } from "@/lib/env";

type Props = {
  loading?: boolean;
  disabled?: boolean;
  onGoogleIdToken: (idToken: string) => void | Promise<void>;
  onAppleCredentials: (credentials: AppleAuthCredentials) => void | Promise<void>;
  onGoogleError?: (message: string) => void;
  onAppleError?: (message: string) => void;
};

export function SocialAuthButtons({
  loading,
  disabled,
  onGoogleIdToken,
  onAppleCredentials,
  onGoogleError,
  onAppleError,
}: Props) {
  const googleConfigured = isGoogleSignInConfigured();
  const [appleAvailable, setAppleAvailable] = useState(false);

  useEffect(() => {
    void isAppleSignInAvailable().then(setAppleAvailable);
  }, []);

  if (!googleConfigured && !appleAvailable) return null;

  return (
    <View style={{ gap: 12 }}>
      {googleConfigured ? (
        <GoogleSignInButton
          loading={loading}
          disabled={disabled}
          onIdToken={onGoogleIdToken}
          onError={onGoogleError}
        />
      ) : null}

      {appleAvailable ? (
        <AppleSignInButton
          loading={loading}
          disabled={disabled}
          onCredentials={onAppleCredentials}
          onError={onAppleError}
        />
      ) : null}

      <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginTop: 2 }}>
        <View style={{ flex: 1, height: 1, backgroundColor: "rgba(255,255,255,0.08)" }} />
        <Text style={{ color: BrandOpsTheme.colors.subtle, fontSize: 11, fontWeight: "700", letterSpacing: 1 }}>
          OR EMAIL
        </Text>
        <View style={{ flex: 1, height: 1, backgroundColor: "rgba(255,255,255,0.08)" }} />
      </View>
    </View>
  );
}

export function useSocialAuthAvailable(): boolean {
  const googleConfigured = isGoogleSignInConfigured();
  const [appleAvailable, setAppleAvailable] = useState(false);

  useEffect(() => {
    void isAppleSignInAvailable().then(setAppleAvailable);
  }, []);

  return googleConfigured || appleAvailable;
}
