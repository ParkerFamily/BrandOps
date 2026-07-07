import Constants from "expo-constants";
import { Platform } from "react-native";

type FirebaseExtra = {
  apiKey?: string;
  authDomain?: string;
  projectId?: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
};

function firebaseFromExtra(): FirebaseExtra | null {
  const extra = Constants.expoConfig?.extra?.firebase as FirebaseExtra | undefined;
  return extra ?? null;
}

function pickEnv(primary: string | undefined, fallback: string | undefined): string | undefined {
  const value = primary?.trim() || fallback?.trim();
  return value || undefined;
}

const embeddedFirebase = firebaseFromExtra();

export type BrandOpsEnv = {
  firebase: {
    apiKey?: string;
    authDomain?: string;
    projectId?: string;
    storageBucket?: string;
    messagingSenderId?: string;
    appId?: string;
  };
  stripePublishableKey?: string;
  apiBaseUrl?: string;
  /** BrandOps web dashboard — https://brandopsapp.com */
  webAppUrl?: string;
  openaiRouteBaseUrl?: string;
  googleWebClientId?: string;
  googleIosClientId?: string;
  googleAndroidClientId?: string;
  onesignalAppId?: string;
};

export const env: BrandOpsEnv = {
  firebase: {
    apiKey: pickEnv(process.env.EXPO_PUBLIC_FIREBASE_API_KEY, embeddedFirebase?.apiKey),
    authDomain: pickEnv(process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN, embeddedFirebase?.authDomain),
    projectId: pickEnv(process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID, embeddedFirebase?.projectId),
    storageBucket: pickEnv(process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET, embeddedFirebase?.storageBucket),
    messagingSenderId: pickEnv(
      process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      embeddedFirebase?.messagingSenderId
    ),
    appId: pickEnv(process.env.EXPO_PUBLIC_FIREBASE_APP_ID, embeddedFirebase?.appId),
  },
  stripePublishableKey: process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY,
  apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL,
  webAppUrl: process.env.EXPO_PUBLIC_WEB_APP_URL,
  openaiRouteBaseUrl: process.env.EXPO_PUBLIC_OPENAI_ROUTE_BASE_URL,
  googleWebClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  googleIosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  googleAndroidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
  onesignalAppId: process.env.EXPO_PUBLIC_ONESIGNAL_APP_ID,
};

export function isFirebaseConfigured() {
  const f = env.firebase;
  return Boolean(f.apiKey && f.authDomain && f.projectId && f.storageBucket && f.messagingSenderId && f.appId);
}

export function isGoogleSignInConfigured() {
  const webClientId = env.googleWebClientId?.trim();
  if (!webClientId) return false;
  if (Platform.OS === "ios") {
    return Boolean(env.googleIosClientId?.trim());
  }
  // Android uses the Firebase web client ID; optional android client ID for advanced setups.
  return true;
}

export function isOneSignalConfigured() {
  return Boolean(env.onesignalAppId?.trim());
}

/** Simulator/local API — used for API URL hints only, not auth bypass. */
export function isLocalDevApi() {
  const base = env.apiBaseUrl?.toLowerCase() ?? "";
  return base.includes("localhost") || base.includes("127.0.0.1") || base.includes("10.0.2.2");
}

const PRODUCTION_WEB_APP_URL = "https://brandopsapp.com";

/** Public BrandOps web app (dashboard, billing, team). */
export function getWebAppUrl(path = ""): string {
  const base = (env.webAppUrl?.trim() || PRODUCTION_WEB_APP_URL).replace(/\/+$/, "");
  if (!path) return base;
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}
