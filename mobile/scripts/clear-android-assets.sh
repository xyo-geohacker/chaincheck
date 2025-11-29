#!/bin/bash
# Script to clear Android asset caches and regenerate native assets
# This ensures updated app icons and splash screens are properly applied

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_DIR"

echo "🧹 Clearing Android asset caches and regenerating native assets..."
echo ""

# 1. Clear Expo cache
echo "   Clearing Expo cache..."
if [ -d ".expo" ]; then
  rm -rf .expo
  echo "   ✓ Cleared .expo cache"
fi

# 2. Clear Android build caches
if [ -d "android" ]; then
  echo "   Clearing Android build caches..."
  
  # Clear Gradle cache
  if [ -d "android/.gradle" ]; then
    rm -rf android/.gradle
    echo "   ✓ Cleared .gradle cache"
  fi
  
  # Clear build directories
  if [ -d "android/build" ]; then
    rm -rf android/build
    echo "   ✓ Cleared android/build"
  fi
  
  if [ -d "android/app/build" ]; then
    rm -rf android/app/build
    echo "   ✓ Cleared android/app/build"
  fi
  
  # Remove old icon assets (all mipmap directories)
  echo "   Removing old Android icon assets..."
  for density in mdpi hdpi xhdpi xxhdpi xxxhdpi; do
    if [ -d "android/app/src/main/res/mipmap-${density}" ]; then
      rm -f android/app/src/main/res/mipmap-${density}/ic_launcher*.png 2>/dev/null || true
    fi
  done
  
  # Remove adaptive icon assets
  if [ -d "android/app/src/main/res/mipmap-anydpi-v26" ]; then
    # Keep the XML files, they'll be regenerated
    echo "   ✓ Removed old icon PNGs (keeping XML configs)"
  fi
  
  # Remove old splash screen assets
  echo "   Removing old splash screen assets..."
  for density in mdpi hdpi xhdpi xxhdpi xxxhdpi; do
    if [ -d "android/app/src/main/res/drawable-${density}" ]; then
      rm -f android/app/src/main/res/drawable-${density}/splashscreen_image.png 2>/dev/null || true
    fi
  done
  echo "   ✓ Removed old splash screen images"
fi

# 3. Regenerate native Android assets from source assets
echo ""
echo "   Regenerating native Android assets from source assets..."
if npx expo prebuild --platform android --clean 2>&1 | grep -q "Finished prebuild"; then
  echo "   ✓ Native assets regenerated"
else
  echo "   ⚠️  Prebuild may have completed (check output above)"
fi

# 4. Verify new assets were created
echo ""
echo "   Verifying regenerated assets..."
if [ -d "android/app/src/main/res/mipmap-xxhdpi" ]; then
  if [ -f "android/app/src/main/res/mipmap-xxhdpi/ic_launcher_foreground.png" ]; then
    ASSET_DATE=$(stat -f "%Sm" -t "%Y-%m-%d %H:%M:%S" android/app/src/main/res/mipmap-xxhdpi/ic_launcher_foreground.png 2>/dev/null | head -1)
    echo "   ✓ App icon regenerated ($ASSET_DATE)"
  else
    echo "   ⚠️  App icon not found - may need to run 'npm run android' to complete"
  fi
else
  echo "   ⚠️  Android res directory not found - may need to run 'npm run android' to complete"
fi

if [ -d "android/app/src/main/res/drawable-xxhdpi" ]; then
  if [ -f "android/app/src/main/res/drawable-xxhdpi/splashscreen_image.png" ]; then
    SPLASH_DATE=$(stat -f "%Sm" -t "%Y-%m-%d %H:%M:%S" android/app/src/main/res/drawable-xxhdpi/splashscreen_image.png 2>/dev/null | head -1)
    echo "   ✓ Splash screen regenerated ($SPLASH_DATE)"
  else
    echo "   ⚠️  Splash screen not found - may need to run 'npm run android' to complete"
  fi
fi

echo ""
echo "✅ Android asset cache cleared and assets regenerated!"
echo ""
echo "Next steps:"
echo "  1. Uninstall the app from your Android device/emulator:"
echo "     adb uninstall com.chaincheck.app"
echo "  2. Run: npm run android"
echo "  3. The new app icon and splash screen should now appear"
echo ""
echo "Note: If images still don't update, try:"
echo "  - Clear app data: Settings → Apps → ChainCheck → Storage → Clear Data"
echo "  - Or uninstall and reinstall the app completely"

