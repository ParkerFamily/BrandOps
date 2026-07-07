# BrandOps Mobile (Companion App)

Mobile is the **fast creator workflow + quick approvals companion**. The web app remains the HQ command center.

> **Important:** Run commands from **`artifacts/brandops-mobile`** (this folder). Do **not** use the nested `brandops/` subfolder — that is an accidental Expo template (different app id `com.parkerfamily.brandops`) and will crash with missing native modules / no API wiring.

## Push notifications (OneSignal)

1. Create a OneSignal app and configure iOS (APNs) + Android (FCM) for bundle `com.parkerfamily.brandops-mobile`.
2. Add to `.env`:
   ```bash
   EXPO_PUBLIC_ONESIGNAL_APP_ID=your-onesignal-app-id
   ```
3. **Rebuild native** (OneSignal does not work in Expo Go):
   ```bash
   npx expo prebuild --clean
   npx expo run:ios
   ```

Server-side send helpers live in `@workspace/onesignal` (uses `ONESIGNAL_APP_ID` + `ONESIGNAL_REST_API_KEY` on the API server only).

## Run on iOS Simulator

From the repo root:

```bash
cd artifacts/brandops-mobile
pnpm install
pnpm ios
```

If `pnpm ios` opens the Expo dev server, press `i` to launch iOS Simulator.

## Environment variables

Edit `artifacts/brandops-mobile/.env` (already git-ignored).

Expo only exposes variables prefixed with `EXPO_PUBLIC_`.

Required for production data:

- `EXPO_PUBLIC_API_BASE_URL` — e.g. `http://localhost:8080/api` (simulator) or your deployed API URL

Required for Firebase auth + video uploads:

- `EXPO_PUBLIC_FIREBASE_API_KEY`
- `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `EXPO_PUBLIC_FIREBASE_PROJECT_ID`
- `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `EXPO_PUBLIC_FIREBASE_APP_ID`

Optional:

- `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `EXPO_PUBLIC_OPENAI_ROUTE_BASE_URL`

Without Firebase, sign-in uses a local session (email from login). Without `EXPO_PUBLIC_API_BASE_URL`, screens show a configuration prompt instead of placeholder data.

Start the API from the repo root:

```bash
pnpm --filter @workspace/api-server run dev
```

