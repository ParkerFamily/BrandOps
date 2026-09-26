#!/usr/bin/env node

/**
 * BrandOps Mobile - Google Sign-In Configuration Checker
 * This script helps diagnose Google Sign-In setup issues on Android
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const projectDir = path.join(__dirname, '..');

// Colors
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  reset: '\x1b[0m',
};

function checkmark(condition) {
  return condition ? `${colors.green}✓${colors.reset}` : `${colors.red}✗${colors.reset}`;
}

function warn(text) {
  return `${colors.yellow}⚠${colors.reset} ${text}`;
}

function error(text) {
  return `${colors.red}✗${colors.reset} ${text}`;
}

function success(text) {
  return `${colors.green}✓${colors.reset} ${text}`;
}

console.log('========================================');
console.log('Google Sign-In Configuration Checker');
console.log('========================================');
console.log('');

let missingItems = 0;

// 1. Check google-services.json
console.log('1. Checking google-services.json...');
const googleServicesPath = path.join(projectDir, 'google-services.json');
if (fs.existsSync(googleServicesPath)) {
  console.log(success('google-services.json exists'));
  
  try {
    const googleServices = JSON.parse(fs.readFileSync(googleServicesPath, 'utf8'));
    const packageName = googleServices.client?.[0]?.client_info?.android_client_info?.package_name;
    
    if (packageName) {
      console.log(`  Package name: ${packageName}`);
      
      if (packageName === 'com.parkerfamily.brandopsmobile') {
        console.log(success('Package name matches'));
      } else {
        console.log(error('Package name mismatch!'));
        console.log('  Expected: com.parkerfamily.brandopsmobile');
        console.log(`  Found: ${packageName}`);
      }
    }
    
    if (googleServices.client?.[0]?.oauth_client) {
      console.log(success('OAuth client configuration found'));
    } else {
      console.log(warn('No OAuth client configuration found'));
    }
  } catch (e) {
    console.log(warn(`Could not parse google-services.json: ${e.message}`));
  }
} else {
  console.log(error('google-services.json NOT FOUND'));
  console.log('  Download it from Firebase Console and place it at:');
  console.log(`  ${googleServicesPath}`);
  missingItems++;
}

console.log('');

// 2. Check GoogleService-Info.plist
console.log('2. Checking GoogleService-Info.plist (iOS)...');
const plistPath = path.join(projectDir, 'GoogleService-Info.plist');
if (fs.existsSync(plistPath)) {
  console.log(success('GoogleService-Info.plist exists'));
} else {
  console.log(warn('GoogleService-Info.plist NOT FOUND'));
}

console.log('');

// 3. Check .env file
console.log('3. Checking .env configuration...');
const envPath = path.join(projectDir, '.env');
if (fs.existsSync(envPath)) {
  console.log(success('.env file exists'));
  
  const envContent = fs.readFileSync(envPath, 'utf8');
  
  // Check Web Client ID
  const webClientMatch = envContent.match(/EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=(.+)/);
  if (webClientMatch && webClientMatch[1].trim()) {
    const webClientId = webClientMatch[1].trim();
    console.log(success('EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID is set'));
    console.log(`  Value: ${webClientId.substring(0, 30)}...`);
  } else {
    console.log(error('EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID not set or empty'));
  }
  
  // Check Firebase Project ID
  const projectIdMatch = envContent.match(/EXPO_PUBLIC_FIREBASE_PROJECT_ID=(.+)/);
  if (projectIdMatch && projectIdMatch[1].trim()) {
    console.log(success('EXPO_PUBLIC_FIREBASE_PROJECT_ID is set'));
    console.log(`  Value: ${projectIdMatch[1].trim()}`);
  } else {
    console.log(error('EXPO_PUBLIC_FIREBASE_PROJECT_ID not set or empty'));
  }
  
  // Check Firebase API Key
  const apiKeyMatch = envContent.match(/EXPO_PUBLIC_FIREBASE_API_KEY=(.+)/);
  if (apiKeyMatch && apiKeyMatch[1].trim()) {
    console.log(success('EXPO_PUBLIC_FIREBASE_API_KEY is set'));
  } else {
    console.log(error('EXPO_PUBLIC_FIREBASE_API_KEY not set or empty'));
  }
} else {
  console.log(error('.env file NOT FOUND'));
  console.log('  Copy .env.example to .env and fill in the values');
  missingItems++;
}

console.log('');

// 4. Check SHA-1 fingerprints
console.log('4. Getting SHA-1 fingerprints...');
console.log('');

const homeDir = process.env.HOME || process.env.USERPROFILE;
const debugKeystore = path.join(homeDir, '.android', 'debug.keystore');

if (fs.existsSync(debugKeystore)) {
  console.log('Debug keystore SHA-1:');
  try {
    const keytoolCmd = process.platform === 'win32'
      ? `keytool -list -v -keystore "${debugKeystore}" -alias androiddebugkey -storepass android -keypass android`
      : `keytool -list -v -keystore "${debugKeystore}" -alias androiddebugkey -storepass android -keypass android`;
    
    const output = execSync(keytoolCmd, { encoding: 'utf8', stdio: 'pipe' });
    const sha1Match = output.match(/SHA1: ([A-F0-9:]+)/i);
    if (sha1Match) {
      console.log(`  ${sha1Match[1]}`);
      console.log('');
      console.log(`${colors.yellow}⚠ Add this SHA-1 to Firebase Console:${colors.reset}`);
      console.log(`  https://console.firebase.google.com/project/rareswap-ec574/settings/general/android:com.parkerfamily.brandopsmobile`);
    } else {
      console.log('  (unable to extract SHA-1)');
    }
  } catch (e) {
    console.log(warn('Unable to read debug keystore'));
  }
} else {
  console.log(warn(`Debug keystore not found at ${debugKeystore}`));
}

console.log('');

// EAS credentials check
console.log('To get EAS build SHA-1 fingerprints, run:');
console.log(`  ${colors.yellow}eas credentials -p android${colors.reset}`);
console.log('');

// Summary
console.log('========================================');
console.log('Summary');
console.log('========================================');
console.log('');

if (missingItems === 0) {
  console.log(success('All basic configuration files are present!'));
  console.log('');
  console.log('If you\'re still getting DEVELOPER_ERROR on device:');
  console.log('1. Add ALL SHA-1 fingerprints to Firebase Console');
  console.log('   (debug keystore + EAS development + EAS preview + EAS production)');
  console.log('2. Rebuild the app:');
  console.log('   npx expo prebuild --clean && npx expo run:android');
  console.log('3. Wait 5-10 minutes for Google servers to propagate changes');
  console.log('4. Uninstall old app and install new build on device');
} else {
  console.log(error('Configuration incomplete. Check the items above.'));
}

console.log('');
console.log('For detailed troubleshooting, see:');
console.log(`  ${path.join(projectDir, 'GOOGLE_SIGNIN_ANDROID_FIX.md')}`);
console.log('');

console.log('Quick links:');
console.log(`  • Firebase Console: ${colors.green}https://console.firebase.google.com/project/rareswap-ec574/settings/general${colors.reset}`);
console.log(`  • Google Cloud Console: ${colors.green}https://console.cloud.google.com/apis/credentials?project=rareswap-ec574${colors.reset}`);
console.log('');
