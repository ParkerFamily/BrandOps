import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { env } from "@/lib/env";

let configured = false;

export function configureGoogleSignIn() {
  if (configured) return;
  const webClientId = env.googleWebClientId?.trim();
  const iosClientId = env.googleIosClientId?.trim();
  if (!webClientId) return;

  GoogleSignin.configure({
    webClientId,
    iosClientId: iosClientId || undefined,
    offlineAccess: false,
  });
  configured = true;
}

export async function signInWithGoogleIdToken(): Promise<string> {
  configureGoogleSignIn();
  const result = await GoogleSignin.signIn();
  if (result.type !== "success") {
    throw new Error("Google sign-in was cancelled.");
  }
  const { idToken } = await GoogleSignin.getTokens();
  if (!idToken) {
    throw new Error("Google sign-in did not return an ID token.");
  }
  return idToken;
}
