/**
 * Fails EAS cloud builds early when required EXPO_PUBLIC_* vars are missing.
 * Set the same names as project secrets: eas secret:create --scope project --name EXPO_PUBLIC_... --value ...
 */
const required = [
  "EXPO_PUBLIC_FIREBASE_API_KEY",
  "EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN",
  "EXPO_PUBLIC_FIREBASE_PROJECT_ID",
  "EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET",
  "EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
  "EXPO_PUBLIC_FIREBASE_APP_ID",
  "EXPO_PUBLIC_API_BASE_URL",
  "EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID",
  "EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID",
  "EXPO_PUBLIC_WEB_APP_URL",
];

const missing = required.filter((key) => !process.env[key]?.trim());

if (process.env.EAS_BUILD === "true" && missing.length > 0) {
  console.error(
    [
      "BrandOps Mobile EAS build is missing required environment variables:",
      ...missing.map((key) => `  - ${key}`),
      "",
      "Add them as EAS project secrets (same names) or in an EAS Environment for this profile.",
      "Example: eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_API_KEY --value <value>",
    ].join("\n")
  );
  process.exit(1);
}
