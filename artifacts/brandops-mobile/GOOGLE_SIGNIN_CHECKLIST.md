# Google Sign-In Android Setup Checklist

Use this checklist to fix the `DEVELOPER_ERROR` when signing in with Google on Android devices.

## ✅ Pre-Flight Checks

- [ ] Run diagnostic: `pnpm check:google-signin`
- [ ] Verify you can access [Firebase Console](https://console.firebase.google.com/project/rareswap-ec574)
- [ ] Verify you can access [Google Cloud Console](https://console.cloud.google.com/apis/credentials?project=rareswap-ec574)

## ✅ Firebase Configuration

### Android App Registration

- [ ] Firebase project has Android app registered with package: `com.parkerfamily.brandopsmobile`
  - If not, go to Firebase Console → Add app → Android
  - Package name: `com.parkerfamily.brandopsmobile`

### Download google-services.json

- [ ] `google-services.json` downloaded from Firebase Console
- [ ] `google-services.json` placed in `artifacts/brandops-mobile/` directory
- [ ] Package name in `google-services.json` matches: `com.parkerfamily.brandopsmobile`

```bash
# Verify package name
grep package_name artifacts/brandops-mobile/google-services.json
```

## ✅ SHA-1 Certificate Fingerprints

You need to add ALL SHA-1 fingerprints for different build types.

### Debug Keystore (Local Development)

- [ ] Extract SHA-1 from debug keystore:
  ```bash
  keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android | grep SHA1
  ```
- [ ] Copy the SHA-1 fingerprint (format: `A1:B2:C3:...`)
- [ ] Add to Firebase Console → Android app → SHA certificate fingerprints

### EAS Development Build

- [ ] Run `eas credentials -p android`
- [ ] Select: Android → Development → Keystore
- [ ] Copy SHA-1 fingerprint
- [ ] Add to Firebase Console → Android app → SHA certificate fingerprints

### EAS Preview Build

- [ ] Run `eas credentials -p android`
- [ ] Select: Android → Preview → Keystore
- [ ] Copy SHA-1 fingerprint
- [ ] Add to Firebase Console → Android app → SHA certificate fingerprints

### EAS Production Build

- [ ] Run `eas credentials -p android`
- [ ] Select: Android → Production → Keystore
- [ ] Copy SHA-1 fingerprint
- [ ] Add to Firebase Console → Android app → SHA certificate fingerprints

## ✅ Environment Variables

### .env File

- [ ] `.env` file exists in `artifacts/brandops-mobile/`
  - If not, copy from `.env.example`

- [ ] `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` is set
  ```
  EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=1041255855912-5ttvd5natbopeb8l6gjbjltdk88boq9n.apps.googleusercontent.com
  ```

- [ ] `EXPO_PUBLIC_FIREBASE_PROJECT_ID` is set
  ```
  EXPO_PUBLIC_FIREBASE_PROJECT_ID=rareswap-ec574
  ```

- [ ] `EXPO_PUBLIC_FIREBASE_API_KEY` is set
- [ ] `EXPO_PUBLIC_FIREBASE_APP_ID` is set (Android version if different from iOS)

## ✅ Google Cloud Console

### OAuth 2.0 Client

- [ ] Go to [Google Cloud Console Credentials](https://console.cloud.google.com/apis/credentials?project=rareswap-ec574)
- [ ] Verify Web Client ID exists and matches `.env` file
- [ ] Android OAuth client exists for package `com.parkerfamily.brandopsmobile`
- [ ] Android OAuth client has all SHA-1 fingerprints registered

## ✅ Rebuild & Deploy

### Clean Rebuild

- [ ] Clean prebuild:
  ```bash
  cd artifacts/brandops-mobile
  npx expo prebuild --clean
  ```

- [ ] Build for Android:
  ```bash
  npx expo run:android
  ```
  OR for EAS build:
  ```bash
  eas build --platform android --profile preview
  ```

### Device Testing

- [ ] Uninstall old app from device:
  ```bash
  adb uninstall com.parkerfamily.brandopsmobile
  ```

- [ ] Install new build on device

- [ ] Wait 5-10 minutes after Firebase configuration changes (for propagation)

- [ ] Test Google Sign-In on physical device

## ✅ Verification

- [ ] Google Sign-In works on physical device
- [ ] Google Sign-In works on emulator
- [ ] No `DEVELOPER_ERROR` appears
- [ ] User is successfully authenticated

## 🐛 Still Not Working?

### Get More Debug Info

```bash
# Check logcat for detailed error
adb logcat | grep -i "google"

# Verify app signature
adb shell pm list packages -f | grep brandops
adb pull $(adb shell pm path com.parkerfamily.brandopsmobile | cut -d: -f2) /tmp/app.apk
unzip -p /tmp/app.apk META-INF/*.RSA | keytool -printcert | grep SHA1
```

### Common Issues

1. **Wrong SHA-1**: Verify the SHA-1 in Firebase matches the one from your installed APK
2. **Package name mismatch**: Double-check `google-services.json` package name
3. **Propagation delay**: Wait 10-15 minutes after adding SHA-1
4. **Cached credentials**: Clear app data on device
5. **Multiple Google accounts**: Try with a different Google account

### Get Help

- [ ] Read [`GOOGLE_SIGNIN_ANDROID_FIX.md`](./GOOGLE_SIGNIN_ANDROID_FIX.md) for detailed troubleshooting
- [ ] Check [React Native Google Sign-In docs](https://github.com/react-native-google-signin/google-signin)
- [ ] Check [Firebase Android setup docs](https://firebase.google.com/docs/android/setup)

## 📝 Notes

Add any notes or findings here:

```
(Your notes)
```
