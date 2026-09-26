# Quick Reference: Google Sign-In Android Fix

## 🚨 The Problem

**Symptom:** "Google sign-in failed - DEVELOPER_ERROR" on real Android devices but works fine on emulator

**Root Cause:** SHA-1 certificate fingerprint not registered in Firebase Console

**Why it works on emulator:** Emulator uses a different (possibly already registered) debug keystore

---

## ⚡ Quick Fix (5 steps)

### 1️⃣ Get SHA-1 fingerprint

```bash
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android | grep SHA1
```

**Copy the output** (looks like: `A1:B2:C3:D4:...`)

### 2️⃣ Add to Firebase

1. Go to: https://console.firebase.google.com/project/rareswap-ec574/settings/general
2. Scroll to "Your apps" → Find Android app (`com.parkerfamily.brandopsmobile`)
3. If Android app doesn't exist: Click "Add app" → Android → Package: `com.parkerfamily.brandopsmobile`
4. Scroll to "SHA certificate fingerprints"
5. Click "Add fingerprint"
6. Paste SHA-1 and Save

### 3️⃣ Download google-services.json

1. In Firebase Console → Android app settings
2. Click "Download google-services.json"
3. Save to: `artifacts/brandops-mobile/google-services.json`

### 4️⃣ Rebuild app

```bash
cd artifacts/brandops-mobile
npx expo prebuild --clean
npx expo run:android
```

### 5️⃣ Test

1. Uninstall old app from device
2. Install new build
3. Wait 5-10 minutes (Google propagation)
4. Test Google Sign-In

---

## 🛠️ Useful Commands

### Check configuration
```bash
cd artifacts/brandops-mobile
pnpm check:google-signin
```

### Get SHA-1 from debug keystore (macOS/Linux)
```bash
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android | grep SHA1
```

### Get SHA-1 from debug keystore (Windows)
```cmd
keytool -list -v -keystore %USERPROFILE%\.android\debug.keystore -alias androiddebugkey -storepass android -keypass android | findstr SHA1
```

### Get SHA-1 from EAS credentials
```bash
eas credentials -p android
# Select: Android → [Profile] → Keystore
```

### Check if google-services.json exists
```bash
ls -la artifacts/brandops-mobile/google-services.json
```

### Verify package name in google-services.json
```bash
grep package_name artifacts/brandops-mobile/google-services.json
```

### Get SHA-1 from installed APK on device
```bash
adb shell pm path com.parkerfamily.brandopsmobile
adb pull [path-from-above] /tmp/app.apk
unzip -p /tmp/app.apk META-INF/*.RSA | keytool -printcert | grep SHA1
```

### View detailed Google errors in logcat
```bash
adb logcat | grep -i "google"
```

### Uninstall app from device
```bash
adb uninstall com.parkerfamily.brandopsmobile
```

### Clean rebuild
```bash
cd artifacts/brandops-mobile
rm -rf android ios
npx expo prebuild --clean
npx expo run:android
```

---

## 🔗 Quick Links

| Resource | URL |
|----------|-----|
| **Firebase Console** | https://console.firebase.google.com/project/rareswap-ec574 |
| **Firebase Android App** | https://console.firebase.google.com/project/rareswap-ec574/settings/general/android:com.parkerfamily.brandopsmobile |
| **Google Cloud Credentials** | https://console.cloud.google.com/apis/credentials?project=rareswap-ec574 |
| **React Native Google Sign-In Docs** | https://github.com/react-native-google-signin/google-signin |
| **Firebase Android Setup** | https://firebase.google.com/docs/android/setup |

---

## 📋 Full Documentation

- **Detailed troubleshooting:** [`GOOGLE_SIGNIN_ANDROID_FIX.md`](./GOOGLE_SIGNIN_ANDROID_FIX.md)
- **Step-by-step checklist:** [`GOOGLE_SIGNIN_CHECKLIST.md`](./GOOGLE_SIGNIN_CHECKLIST.md)

---

## 💡 Pro Tips

1. **Add ALL keystores**: Debug + EAS Development + EAS Preview + EAS Production
2. **Wait for propagation**: Google servers need 5-10 minutes to update
3. **Uninstall before testing**: Always uninstall the old app first
4. **Check the right keystore**: Make sure the SHA-1 matches the one that signed your APK
5. **Multiple Google accounts**: If one fails, try a different Google account

---

## ❓ Still Not Working?

1. ✅ Verify SHA-1 in Firebase matches your keystore
2. ✅ Verify package name: `com.parkerfamily.brandopsmobile`
3. ✅ Verify `google-services.json` is in the correct location
4. ✅ Wait 15 minutes after adding SHA-1
5. ✅ Clear app data on device
6. ✅ Try with a different Google account
7. ✅ Check logcat for detailed errors

---

**Package name:** `com.parkerfamily.brandopsmobile`  
**Firebase project:** `rareswap-ec574`  
**Required files:** `google-services.json`, `.env`
