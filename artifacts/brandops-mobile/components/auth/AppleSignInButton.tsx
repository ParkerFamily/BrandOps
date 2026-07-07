import { useEffect, useState } from "react";
import { ActivityIndicator, Platform, View } from "react-native";
import * as AppleAuthentication from "expo-apple-authentication";
import {
  isAppleSignInAvailable,
  signInWithAppleNative,
  type AppleAuthCredentials,
} from "@/lib/appleSignIn";

type Props = {
  loading?: boolean;
  disabled?: boolean;
  onCredentials: (credentials: AppleAuthCredentials) => void | Promise<void>;
  onError?: (message: string) => void;
};

export function AppleSignInButton({ loading, disabled, onCredentials, onError }: Props) {
  const [available, setAvailable] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void isAppleSignInAvailable().then(setAvailable);
  }, []);

  if (Platform.OS !== "ios" || !available) return null;

  const isDisabled = disabled || busy || loading;

  const handlePress = async () => {
    if (isDisabled) return;
    setBusy(true);
    try {
      const credentials = await signInWithAppleNative();
      await onCredentials(credentials);
    } catch (e: unknown) {
      const code = typeof e === "object" && e && "code" in e ? String((e as { code?: string }).code) : "";
      if (code === "ERR_REQUEST_CANCELED") return;
      const message = e instanceof Error ? e.message : "Apple sign-in failed.";
      if (message.toLowerCase().includes("cancel")) return;
      onError?.(message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View
      pointerEvents={isDisabled ? "none" : "auto"}
      style={{ width: "100%", minHeight: 52, opacity: isDisabled ? 0.55 : 1 }}
    >
      {busy || loading ? (
        <View
          style={{
            height: 52,
            borderRadius: 14,
            backgroundColor: "#000000",
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.14)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ActivityIndicator color="#FFFFFF" />
        </View>
      ) : (
        <AppleAuthentication.AppleAuthenticationButton
          buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
          buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
          cornerRadius={14}
          style={{ width: "100%", height: 52 }}
          onPress={() => void handlePress()}
        />
      )}
    </View>
  );
}
