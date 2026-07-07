/** @type {import('expo/config').ExpoConfig} */
const appJson = require("./app.json");
const fs = require("fs");
const path = require("path");

try {
  require("dotenv").config({ path: path.join(__dirname, ".env") });
} catch {
  // dotenv optional — EAS injects env at build time
}

function plistValue(plistPath, key) {
  if (!fs.existsSync(plistPath)) return undefined;
  const content = fs.readFileSync(plistPath, "utf8");
  const match = content.match(new RegExp(`<key>${key}</key>\\s*<string>([^<]+)</string>`));
  return match?.[1]?.trim();
}

const plistPath = path.join(__dirname, "GoogleService-Info.plist");
const plistFirebase = {
  apiKey: plistValue(plistPath, "API_KEY"),
  projectId: plistValue(plistPath, "PROJECT_ID"),
  storageBucket: plistValue(plistPath, "STORAGE_BUCKET"),
  messagingSenderId: plistValue(plistPath, "GCM_SENDER_ID"),
  appId: plistValue(plistPath, "GOOGLE_APP_ID"),
  iosClientId: plistValue(plistPath, "CLIENT_ID"),
};

function embeddedFirebaseConfig() {
  const projectId = process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID?.trim() || plistFirebase.projectId;
  return {
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY?.trim() || plistFirebase.apiKey,
    authDomain:
      process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN?.trim() ||
      (projectId ? `${projectId}.firebaseapp.com` : undefined),
    projectId,
    storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET?.trim() || plistFirebase.storageBucket,
    messagingSenderId:
      process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID?.trim() || plistFirebase.messagingSenderId,
    appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID?.trim() || plistFirebase.appId,
  };
}

const embeddedFirebase = embeddedFirebaseConfig();

const EAS_PROJECT_ID = "8e617290-c31a-484d-8aba-971a4a94f15c";
const buildProfile = process.env.EAS_BUILD_PROFILE ?? "development";
const isProductionBuild = buildProfile === "production";

function iosUrlSchemeFromClientId(clientId) {
  const trimmed = clientId?.trim();
  if (!trimmed?.endsWith(".apps.googleusercontent.com")) return undefined;
  const id = trimmed.replace(".apps.googleusercontent.com", "");
  return `com.googleusercontent.apps.${id}`;
}

const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim() || plistFirebase.iosClientId;
const iosUrlScheme = iosUrlSchemeFromClientId(iosClientId);

const plugins = appJson.expo.plugins
  .filter((entry) => {
    if (entry === "@react-native-google-signin/google-signin") return false;
    if (Array.isArray(entry) && entry[0] === "@react-native-google-signin/google-signin") return false;
    return true;
  })
  .map((entry) => {
    if (Array.isArray(entry) && entry[0] === "onesignal-expo-plugin") {
      return [
        "onesignal-expo-plugin",
        {
          ...entry[1],
          mode: isProductionBuild ? "production" : "development",
        },
      ];
    }
    return entry;
  });

if (iosUrlScheme) {
  plugins.push(["@react-native-google-signin/google-signin", { iosUrlScheme }]);
} else {
  plugins.push("@react-native-google-signin/google-signin");
}

plugins.push("expo-apple-authentication");
plugins.push([
  "expo-build-properties",
  {
    ios: {
      useFrameworks: "static",
      extraPods: [
        { name: "GoogleUtilities", modular_headers: true },
        { name: "RecaptchaInterop", modular_headers: true },
      ],
    },
  },
]);

const googleServicesPath = path.join(__dirname, "google-services.json");
const android = { ...appJson.expo.android };
if (fs.existsSync(googleServicesPath)) {
  android.googleServicesFile = "./google-services.json";
}

const { displayName: _iosDisplayName, ...ios } = appJson.expo.ios ?? {};

module.exports = {
  expo: {
    ...appJson.expo,
    owner: "parkerfamily",
    runtimeVersion: {
      policy: "appVersion",
    },
    updates: {
      url: `https://u.expo.dev/${EAS_PROJECT_ID}`,
      checkAutomatically: "ON_LOAD",
      fallbackToCacheTimeout: 0,
    },
    ios: {
      ...ios,
      usesAppleSignIn: true,
      entitlements: {
        ...ios.entitlements,
        "aps-environment": isProductionBuild ? "production" : "development",
        "com.apple.developer.applesignin": ["Default"],
      },
    },
    android,
    plugins,
    extra: {
      ...appJson.expo.extra,
      eas: {
        ...(appJson.expo.extra?.eas ?? {}),
        projectId: EAS_PROJECT_ID,
      },
      firebase: embeddedFirebase,
    },
  },
};
