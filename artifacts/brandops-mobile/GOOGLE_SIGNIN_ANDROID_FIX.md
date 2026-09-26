# Fixing Google Sign-In DEVELOPER_ERROR on Android Devices

## Why This Happens

The `DEVELOPER_ERROR: Follow troubleshooting instructio...` error occurs on **real Android devices but not emulators** because:

1. **Different signing keys**: Your development builds use different SHA-1 certificate fingerprints
2. **Emulator vs. Device**: The emulator might use a debug keystore that's already registered
3. **Missing Firebase configuration**: Your Firebase project doesn't have the SHA-1 fingerprint from your actual device build

## Solution: Add SHA-1 Fingerprints to Firebase

### Step 1: Get Your SHA-1 Fingerprints

You need to add **all** SHA-1 fingerprints that might sign your app:

#### Option A: Using EAS Build (Recommended if using Expo)

```bash
# Get credentials for your project
eas credentials

# Select Android → Production/Preview → Keystore
# Copy the SHA-1 fingerprint shown
```

Or check your EAS credentials:

```bash
eas credentials -p android
```

#### Option B: Using Local Debug Keystore

If you're building locally or testing with debug builds:

```bash
# On macOS/Linux
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android

# On Windows
keytool -list -v -keystore %USERPROFILE%\.android\debug.keystore -alias androiddebugkey -storepass android -keypass android
```

Look for the **SHA-1 fingerprint** in the output (looks like `A1:B2:C3:...`).

#### Option C: From Your Release Keystore

If you have a production/release keystore:

```bash
keytool -list -v -keystore /path/to/your/release.keystore -alias your-key-alias
```

#### Option D: From Your Installed APK

If you already have the APK installed on the device:

```bash
# Get the APK from your device
adb pull $(adb shell pm path com.parkerfamily.brandopsmobile | cut -d: -f2) app.apk

# Extract the certificate
unzip -p app.apk META-INF/*.RSA | keytool -printcert | grep SHA1
```

### Step 2: Add SHA-1 to Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **rareswap-ec574**
3. Click the gear icon ⚙️ → **Project Settings**
4. Scroll down to **Your apps**
5. Find or add the Android app with package name: `com.parkerfamily.brandopsmobile`

   If the Android app doesn't exist:
   - Click **Add app** → Android
   - Package name: `com.parkerfamily.brandopsmobile`
   - Download the `google-services.json` file (see Step 3)

6. In the Android app settings, scroll to **SHA certificate fingerprints**
7. Click **Add fingerprint**
8. Paste your SHA-1 fingerprint(s)
9. Click **Save**

**Important:** Add ALL fingerprints you collected:
- Debug keystore (for local development)
- EAS development profile keystore
- EAS preview profile keystore  
- EAS production profile keystore
- Any release keystores

### Step 3: Download google-services.json (If Missing)

After adding your Android app to Firebase:

1. In Firebase Console → Project Settings → Your Apps
2. Find your Android app (`com.parkerfamily.brandopsmobile`)
3. Click the **Download google-services.json** button
4. Save it to: `artifacts/brandops-mobile/google-services.json`
5. The `app.config.js` will automatically pick it up

### Step 4: Verify OAuth 2.0 Client Configuration

Your Google Sign-In needs a **Web client ID** (already configured in your `.env`):

```env
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=1041255855912-5ttvd5natbopeb8l6gjbjltdk88boq9n.apps.googleusercontent.com
```

Verify this client ID exists:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select project: **rareswap-ec574**
3. Go to **APIs & Services** → **Credentials**
4. Verify the Web client ID matches your `.env` file
5. Ensure **Authorized redirect URIs** are configured (usually handled by Firebase)

### Step 5: Rebuild Your App

After making these changes:

```bash
cd artifacts/brandops-mobile

# For local development build
npx expo prebuild --clean
npx expo run:android

# For EAS build
eas build --platform android --profile preview
```

**Important:** You MUST rebuild the native app. Hot reload or OTA updates will NOT apply these changes.

### Step 6: Test on Device

1. Uninstall the old app from your device
2. Install the newly built app
3. Try Google Sign-In again

## Common Issues

### Issue: "DEVELOPER_ERROR" still appears

**Solutions:**
- Wait 5-10 minutes after adding SHA-1 fingerprints (Google servers need to propagate)
- Verify you added the CORRECT SHA-1 for the keystore that signed the installed APK
- Make sure the package name matches exactly: `com.parkerfamily.brandopsmobile`
- Clear app data/cache on your device
- Uninstall and reinstall the app

### Issue: "API key not valid" or "API_KEY_INVALID"

**Solution:**
- Verify your Firebase API key is correct in `.env`
- In Firebase Console → Project Settings → check the **Web API Key**
- Ensure the Android app is registered with the correct package name

### Issue: Works on emulator but not device

**Solution:**
- This confirms it's an SHA-1 issue
- The emulator uses `~/.android/debug.keystore` by default
- Your device build uses a different keystore (EAS, release, or different debug key)
- Add SHA-1 fingerprints for BOTH keystores

### Issue: "Error 10" or "SIGN_IN_FAILED"

**Solution:**
- Check if `google-services.json` exists in `artifacts/brandops-mobile/`
- Verify the package name in `google-services.json` matches `app.json` (android.package)
- Rebuild the app after adding `google-services.json`

## Quick Checklist

- [ ] Firebase project has Android app registered with package `com.parkerfamily.brandopsmobile`
- [ ] SHA-1 fingerprint(s) added to Firebase Android app
- [ ] `google-services.json` downloaded and placed in `artifacts/brandops-mobile/`
- [ ] `.env` file has `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` set
- [ ] App rebuilt with `npx expo prebuild --clean` or `eas build`
- [ ] Old app uninstalled and new one installed on device
- [ ] Waited 5-10 minutes after Firebase configuration changes

## Testing Commands

```bash
# Check if google-services.json exists
ls -la artifacts/brandops-mobile/google-services.json

# Verify package name in google-services.json
grep package_name artifacts/brandops-mobile/google-services.json

# Get SHA-1 from debug keystore
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android | grep SHA1

# Build and install on connected device
cd artifacts/brandops-mobile
npx expo run:android --device
```

## Reference Links

- [React Native Google Sign-In Docs](https://github.com/react-native-google-signin/google-signin)
- [Firebase Android Setup](https://firebase.google.com/docs/android/setup)
- [Google Sign-In Android Integration](https://developers.google.com/identity/sign-in/android/start-integrating)
- [EAS Build Credentials](https://docs.expo.dev/app-signing/app-credentials/)

## Need More Help?

If you're still having issues after following all steps:

1. Check the full error message in logcat:
   ```bash
   adb logcat | grep -i "google"
   ```

2. Verify your Firebase configuration:
   ```bash
   # In your mobile app directory
   cat google-services.json | grep -A 2 "client_id"
   ```

3. Confirm the OAuth client in Google Cloud Console has the correct package name and SHA-1
