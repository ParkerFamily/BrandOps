#!/bin/bash

# BrandOps Mobile - Google Sign-In Configuration Checker
# This script helps diagnose Google Sign-In setup issues on Android

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_DIR="$SCRIPT_DIR/.."

echo "========================================"
echo "Google Sign-In Configuration Checker"
echo "========================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check google-services.json
echo "1. Checking google-services.json..."
if [ -f "$PROJECT_DIR/google-services.json" ]; then
    echo -e "${GREEN}✓ google-services.json exists${NC}"
    
    # Extract package name
    PACKAGE_NAME=$(grep -o '"package_name": "[^"]*"' "$PROJECT_DIR/google-services.json" | head -1 | cut -d'"' -f4)
    echo "  Package name: $PACKAGE_NAME"
    
    if [ "$PACKAGE_NAME" != "com.parkerfamily.brandopsmobile" ]; then
        echo -e "${RED}✗ Package name mismatch!${NC}"
        echo "  Expected: com.parkerfamily.brandopsmobile"
        echo "  Found: $PACKAGE_NAME"
    else
        echo -e "${GREEN}✓ Package name matches${NC}"
    fi
    
    # Check OAuth client
    if grep -q "oauth_client" "$PROJECT_DIR/google-services.json"; then
        echo -e "${GREEN}✓ OAuth client configuration found${NC}"
    else
        echo -e "${YELLOW}⚠ No OAuth client configuration found${NC}"
    fi
else
    echo -e "${RED}✗ google-services.json NOT FOUND${NC}"
    echo "  Download it from Firebase Console and place it at:"
    echo "  $PROJECT_DIR/google-services.json"
fi

echo ""

# Check GoogleService-Info.plist
echo "2. Checking GoogleService-Info.plist (iOS)..."
if [ -f "$PROJECT_DIR/GoogleService-Info.plist" ]; then
    echo -e "${GREEN}✓ GoogleService-Info.plist exists${NC}"
else
    echo -e "${YELLOW}⚠ GoogleService-Info.plist NOT FOUND${NC}"
fi

echo ""

# Check .env file
echo "3. Checking .env configuration..."
if [ -f "$PROJECT_DIR/.env" ]; then
    echo -e "${GREEN}✓ .env file exists${NC}"
    
    # Check required variables
    if grep -q "EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=" "$PROJECT_DIR/.env"; then
        WEB_CLIENT_ID=$(grep "EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=" "$PROJECT_DIR/.env" | cut -d'=' -f2 | tr -d ' ')
        if [ -n "$WEB_CLIENT_ID" ]; then
            echo -e "${GREEN}✓ EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID is set${NC}"
            echo "  Value: ${WEB_CLIENT_ID:0:30}..."
        else
            echo -e "${RED}✗ EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID is empty${NC}"
        fi
    else
        echo -e "${RED}✗ EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID not found${NC}"
    fi
    
    if grep -q "EXPO_PUBLIC_FIREBASE_PROJECT_ID=" "$PROJECT_DIR/.env"; then
        PROJECT_ID=$(grep "EXPO_PUBLIC_FIREBASE_PROJECT_ID=" "$PROJECT_DIR/.env" | cut -d'=' -f2 | tr -d ' ')
        if [ -n "$PROJECT_ID" ]; then
            echo -e "${GREEN}✓ EXPO_PUBLIC_FIREBASE_PROJECT_ID is set${NC}"
            echo "  Value: $PROJECT_ID"
        else
            echo -e "${RED}✗ EXPO_PUBLIC_FIREBASE_PROJECT_ID is empty${NC}"
        fi
    else
        echo -e "${RED}✗ EXPO_PUBLIC_FIREBASE_PROJECT_ID not found${NC}"
    fi
else
    echo -e "${RED}✗ .env file NOT FOUND${NC}"
    echo "  Copy .env.example to .env and fill in the values"
fi

echo ""

# Check SHA-1 fingerprints
echo "4. Getting SHA-1 fingerprints..."
echo ""

# Debug keystore
DEBUG_KEYSTORE="$HOME/.android/debug.keystore"
if [ -f "$DEBUG_KEYSTORE" ]; then
    echo "Debug keystore SHA-1:"
    keytool -list -v -keystore "$DEBUG_KEYSTORE" -alias androiddebugkey -storepass android -keypass android 2>/dev/null | grep -i "SHA1:" | head -1 || echo "  (unable to extract)"
else
    echo -e "${YELLOW}⚠ Debug keystore not found at $DEBUG_KEYSTORE${NC}"
fi

echo ""

# EAS credentials check
echo "To get EAS build SHA-1 fingerprints, run:"
echo "  ${YELLOW}eas credentials -p android${NC}"
echo ""

echo "========================================"
echo "Summary"
echo "========================================"
echo ""

# Summary
MISSING_ITEMS=0

if [ ! -f "$PROJECT_DIR/google-services.json" ]; then
    echo -e "${RED}• Missing google-services.json${NC}"
    MISSING_ITEMS=$((MISSING_ITEMS + 1))
fi

if [ ! -f "$PROJECT_DIR/.env" ]; then
    echo -e "${RED}• Missing .env file${NC}"
    MISSING_ITEMS=$((MISSING_ITEMS + 1))
fi

if [ $MISSING_ITEMS -eq 0 ]; then
    echo -e "${GREEN}All basic configuration files are present!${NC}"
    echo ""
    echo "If you're still getting DEVELOPER_ERROR on device:"
    echo "1. Add ALL SHA-1 fingerprints to Firebase Console"
    echo "2. Rebuild the app: npx expo prebuild --clean && npx expo run:android"
    echo "3. Wait 5-10 minutes for Google servers to propagate changes"
else
    echo -e "${RED}Configuration incomplete. Check the items above.${NC}"
fi

echo ""
echo "For detailed troubleshooting, see:"
echo "  $PROJECT_DIR/GOOGLE_SIGNIN_ANDROID_FIX.md"
echo ""
