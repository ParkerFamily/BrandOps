#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
# shellcheck source=/dev/null
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
nvm use 20 >/dev/null 2>&1 || true

node ./scripts/kill-dev-ports.js
node ./scripts/ensure-local-node-modules.js

echo "Cleaning Metro + iOS build caches…"
rm -rf .expo node_modules/.cache ios/build
watchman watch-del-all 2>/dev/null || true

echo "Reinstalling pods (new architecture disabled)…"
cd ios && pod install && cd ..

PORT="${RCT_METRO_PORT:-8081}"
export RCT_METRO_PORT="$PORT"
export EXPO_DEV_SERVER_PORT="$PORT"
echo "Building BrandOps + starting Metro on port ${PORT}…"
npx expo run:ios --port "$PORT"

echo "Opening BrandOps in simulator…"
node ./scripts/open-ios-dev.js

echo "Done."
