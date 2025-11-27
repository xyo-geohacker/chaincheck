#!/bin/bash
# Script to clear Expo image cache
# This clears all caches that might be storing old images

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_DIR"

echo "🧹 Clearing Expo image caches..."

# 1. Clear Metro bundler cache
echo "   Clearing Metro bundler cache..."
if [ -d "$HOME/.metro" ]; then
  rm -rf "$HOME/.metro"
  echo "   ✓ Cleared Metro cache"
fi

# 2. Clear Expo cache (.expo directory)
echo "   Clearing Expo cache..."
if [ -d ".expo" ]; then
  rm -rf .expo
  echo "   ✓ Cleared .expo cache"
fi

# 3. Clear node_modules cache
echo "   Clearing node_modules cache..."
if [ -d "node_modules/.cache" ]; then
  rm -rf node_modules/.cache
  echo "   ✓ Cleared node_modules/.cache"
fi

# 4. Clear @expo/image-utils cache
echo "   Clearing @expo/image-utils cache..."
if [ -d "node_modules/@expo/image-utils" ]; then
  find node_modules/@expo/image-utils -name "*.cache" -type f -delete 2>/dev/null || true
  echo "   ✓ Cleared @expo/image-utils cache"
fi

# 5. Clear jimp-compact cache
echo "   Clearing jimp-compact cache..."
if [ -d "node_modules/jimp-compact" ]; then
  find node_modules/jimp-compact -name "*.cache" -type f -delete 2>/dev/null || true
  echo "   ✓ Cleared jimp-compact cache"
fi

# 6. Clear iOS build cache (if exists)
if [ -d "ios" ]; then
  echo "   Clearing iOS build cache..."
  if [ -d "ios/build" ]; then
    rm -rf ios/build
    echo "   ✓ Cleared iOS build cache"
  fi
  if [ -d "ios/Pods" ]; then
    # Clear Pods cache but keep Podfile.lock
    find ios/Pods -name "*.cache" -type f -delete 2>/dev/null || true
    echo "   ✓ Cleared iOS Pods cache"
  fi
fi

# 7. Clear Android build cache (if exists)
if [ -d "android" ]; then
  echo "   Clearing Android build cache..."
  if [ -d "android/app/build" ]; then
    rm -rf android/app/build
    echo "   ✓ Cleared Android app build cache"
  fi
  if [ -d "android/.gradle" ]; then
    # Note: .gradle can be large, so we'll just clear the cache subdirectory
    if [ -d "android/.gradle/caches" ]; then
      rm -rf android/.gradle/caches
      echo "   ✓ Cleared Android Gradle cache"
    fi
  fi
fi

# 8. Clear watchman cache (if installed)
if command -v watchman &> /dev/null; then
  echo "   Clearing Watchman cache..."
  watchman watch-del-all 2>/dev/null || true
  echo "   ✓ Cleared Watchman cache"
fi

echo ""
echo "✅ Image cache cleared!"
echo ""
echo "Next steps:"
echo "  1. Restart Metro bundler: npm start -- --reset-cache"
echo "  2. Rebuild the app: npm run ios or npm run android"
echo "  3. If images still don't update, uninstall and reinstall the app on your device/simulator"

