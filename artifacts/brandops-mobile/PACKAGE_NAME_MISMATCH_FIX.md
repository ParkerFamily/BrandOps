# IMPORTANT: Package Name Mismatch Detected!

## The Issue

You have TWO different Android apps in Firebase:

### App 1: com.brandops.app (What you're currently running)
- App ID: 1:1041255855912:android:79b9e934f8966602c0021d
- SHA-1: f4bcacff8915c7578fc27823ebf642d4d221217c ✅ REGISTERED
- This is the app shown in your screenshot

### App 2: com.parkerfamily.brandopsmobile (What's in your code)
- App ID: 1:1041255855912:android:2467fe274e1cc678c0021d
- Has 3 SHA-1s registered
- This is what app.json is configured for (line 41)

## Why Google Sign-In is Failing

The app you're testing (`com.brandops.app`) doesn't have a `google-services.json` file in your project!

## Solution: Pick ONE Package Name

### Option A: Use com.brandops.app (The one you're currently using)

1. Copy the correct google-services.json:
   ```bash
   cp google-services-com.brandops.app.json google-services.json
   ```

2. Update app.json to match:
   ```json
   "android": {
     "package": "com.brandops.app"
   }
   ```

3. Rebuild:
   ```bash
   npx expo prebuild --clean
   npx expo run:android
   ```

### Option B: Use com.parkerfamily.brandopsmobile (Recommended - matches your code)

1. Copy the correct google-services.json:
   ```bash
   cp google-services-com.parkerfamily.brandopsmobile.json google-services.json
   ```

2. Keep app.json as is (already set to com.parkerfamily.brandopsmobile)

3. Add your device's SHA-1 to Firebase for THIS package:
   - Go to: https://console.firebase.google.com/project/rareswap-ec574/settings/general/android:com.parkerfamily.brandopsmobile
   - Add SHA-1: F4:BC:AC:FF:89:15:C7:57:8F:C2:78:23:EB:F6:42:D4:D2:21:21:7C
   - Wait 10 minutes
   
4. Rebuild:
   ```bash
   npx expo prebuild --clean
   npx expo run:android
   ```

5. Uninstall OLD app (com.brandops.app) from device
6. Install NEW app (com.parkerfamily.brandopsmobile)

## What I Created

- `google-services-com.brandops.app.json` - For com.brandops.app
- `google-services-com.parkerfamily.brandopsmobile.json` - For com.parkerfamily.brandopsmobile

## Recommendation

Use **Option B** (com.parkerfamily.brandopsmobile) because:
- It matches your codebase
- It's the "official" package name
- Less confusion long-term

## After You Choose

1. Copy the correct file to `google-services.json`
2. Add your SHA-1 to the correct Firebase app
3. Rebuild the app
4. Uninstall old app from device
5. Install new app
6. Wait 10 minutes
7. Test Google Sign-In
