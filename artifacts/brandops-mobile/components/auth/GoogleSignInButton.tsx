import { useState } from "react";
import { ActivityIndicator, Pressable, Text } from "react-native";
import { isGoogleSignInConfigured } from "@/lib/env";
import { signInWithGoogleIdToken } from "@/lib/googleSignIn";

type Props = {
  loading?: boolean;
  disabled?: boolean;
  onIdToken: (idToken: string) => void | Promise<void>;
  onError?: (message: string) => void;
};

export function GoogleSignInButton({ loading, disabled, onIdToken, onError }: Props) {
  const configured = isGoogleSignInConfigured();
  const [busy, setBusy] = useState(false);

  if (!configured) return null;

  const handlePress = async () => {
    setBusy(true);
    try {
      const idToken = await signInWithGoogleIdToken();
      await onIdToken(idToken);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Google sign-in failed.";
      if (message.toLowerCase().includes("cancel")) return;
      onError?.(message);
    } finally {
      setBusy(false);
    }
  };

  const isDisabled = disabled || busy || loading;

  return (
    <Pressable
      disabled={isDisabled}
      onPress={() => void handlePress()}
      style={({ pressed }) => ({
        height: 52,
        borderRadius: 14,
        backgroundColor: "#FFFFFF",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "row",
        gap: 10,
        opacity: isDisabled ? 0.55 : pressed ? 0.92 : 1,
        transform: [{ scale: pressed ? 0.99 : 1 }],
      })}
    >
      {busy || loading ? (
        <ActivityIndicator color="#111" />
      ) : (
        <>
          <Text style={{ fontSize: 17, fontWeight: "700", color: "#4285F4" }}>G</Text>
          <Text style={{ fontSize: 15, fontWeight: "700", color: "#111111" }}>Continue with Google</Text>
        </>
      )}
    </Pressable>
  );
}
