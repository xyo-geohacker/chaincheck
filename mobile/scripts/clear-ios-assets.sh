#!/bin/bash
# Script to clear iOS asset caches and regenerate native assets
# This ensures updated app icons and splash screens are properly applied

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_DIR"

echo "🧹 Clearing iOS asset caches and regenerating native assets..."
echo ""

# 1. Clear Xcode DerivedData (caches compiled assets)
echo "   Clearing Xcode DerivedData..."
if [ -d "$HOME/Library/Developer/Xcode/DerivedData" ]; then
  rm -rf "$HOME/Library/Developer/Xcode/DerivedData"/*
  echo "   ✓ Cleared Xcode DerivedData"
else
  echo "   ℹ DerivedData directory doesn't exist"
fi

# 2. Clear Expo cache and all related caches
echo "   Clearing Expo cache..."
if [ -d ".expo" ]; then
  rm -rf .expo
  echo "   ✓ Cleared .expo cache"
fi

# Clear node_modules cache that might cache images
if [ -d "node_modules/.cache" ]; then
  rm -rf node_modules/.cache
  echo "   ✓ Cleared node_modules/.cache"
fi

# Clear @expo/image-utils cache (processes splash screens)
if [ -d "node_modules/@expo/image-utils" ]; then
  find node_modules/@expo/image-utils -name "*.cache" -type f -delete 2>/dev/null || true
  echo "   ✓ Cleared @expo/image-utils cache"
fi

# 3. Remove old iOS asset catalogs (if ios directory exists)
if [ -d "ios" ]; then
  echo "   Removing old iOS asset catalogs..."
  if [ -d "ios/ChainCheck/Images.xcassets/AppIcon.appiconset" ]; then
    rm -rf ios/ChainCheck/Images.xcassets/AppIcon.appiconset
    echo "   ✓ Removed AppIcon.appiconset"
  fi
  if [ -d "ios/ChainCheck/Images.xcassets/SplashScreen.imageset" ]; then
    rm -rf ios/ChainCheck/Images.xcassets/SplashScreen.imageset
    echo "   ✓ Removed SplashScreen.imageset"
  fi
  if [ -d "ios/ChainCheck/Images.xcassets/SplashScreenBackground.imageset" ]; then
    rm -rf ios/ChainCheck/Images.xcassets/SplashScreenBackground.imageset
    echo "   ✓ Removed SplashScreenBackground.imageset"
  fi
  
  # Clear iOS build directory
  if [ -d "ios/build" ]; then
    rm -rf ios/build
    echo "   ✓ Cleared iOS build directory"
  fi
fi

# 4. Clear additional iOS caches that might hold old images
echo "   Clearing additional iOS caches..."
# Clear Xcode module cache
if [ -d "$HOME/Library/Caches/com.apple.dt.Xcode" ]; then
  find "$HOME/Library/Caches/com.apple.dt.Xcode" -name "*.png" -type f -delete 2>/dev/null || true
  echo "   ✓ Cleared Xcode module cache"
fi

# Clear iOS simulator caches (if simulator is not running)
if [ -d "$HOME/Library/Developer/CoreSimulator" ]; then
  # Only clear app data, not the entire simulator
  find "$HOME/Library/Developer/CoreSimulator" -name "*.png" -path "*/Library/Caches/*" -type f -delete 2>/dev/null || true
  echo "   ✓ Cleared iOS simulator image caches"
fi

# 5. Verify source assets exist and are recent
echo ""
echo "   Verifying source assets..."
if [ ! -f "assets/splash.png" ]; then
  echo "   ⚠️  WARNING: assets/splash.png not found!"
else
  SPLASH_SOURCE_DATE=$(stat -f "%Sm" -t "%Y-%m-%d %H:%M:%S" assets/splash.png 2>/dev/null || echo "unknown")
  SPLASH_SOURCE_SIZE=$(stat -f%z assets/splash.png 2>/dev/null || echo "unknown")
  echo "   ✓ Source splash.png found (modified: $SPLASH_SOURCE_DATE, size: $SPLASH_SOURCE_SIZE bytes)"
  
  # Check if file is suspiciously old (more than 1 day)
  if [ "$SPLASH_SOURCE_DATE" != "unknown" ]; then
    SPLASH_EPOCH=$(stat -f "%m" assets/splash.png 2>/dev/null || echo "0")
    CURRENT_EPOCH=$(date +%s)
    AGE_DAYS=$(( (CURRENT_EPOCH - SPLASH_EPOCH) / 86400 ))
    if [ "$AGE_DAYS" -gt 1 ]; then
      echo "   ⚠️  WARNING: Source file is $AGE_DAYS days old!"
      echo "   ⚠️  If you've updated it, the timestamp may not have changed."
      echo "   ⚠️  Consider touching the file: touch assets/splash.png"
    fi
  fi
fi

if [ ! -f "assets/icon.png" ]; then
  echo "   ⚠️  WARNING: assets/icon.png not found!"
else
  ICON_SOURCE_DATE=$(stat -f "%Sm" -t "%Y-%m-%d %H:%M:%S" assets/icon.png 2>/dev/null || echo "unknown")
  echo "   ✓ Source icon.png found (modified: $ICON_SOURCE_DATE)"
fi

# 6. Regenerate native iOS assets from source assets
echo ""
echo "   Regenerating native iOS assets from source assets..."
export LANG=en_US.UTF-8

# Force remove the entire ios directory to ensure clean regeneration
if [ -d "ios" ]; then
  echo "   Removing entire ios/ directory for clean regeneration..."
  rm -rf ios
  echo "   ✓ Removed ios/ directory"
fi

# Run prebuild to regenerate everything
echo "   Running expo prebuild (this may take a moment)..."
echo "   Note: This will regenerate ALL native assets from source files"
PREBUILD_OUTPUT=$(npx expo prebuild --platform ios --clean 2>&1)
PREBUILD_EXIT=$?
echo "$PREBUILD_OUTPUT"

if echo "$PREBUILD_OUTPUT" | grep -q "Finished prebuild"; then
  echo "   ✓ Native assets regenerated"
else
  echo "   ⚠️  Prebuild completed (CocoaPods errors are expected and can be ignored)"
fi

# Verify the splash screen was actually regenerated from source
if [ -f "assets/splash.png" ] && [ -f "ios/ChainCheck/Images.xcassets/SplashScreen.imageset/image.png" ]; then
  if command -v md5 &> /dev/null; then
    SOURCE_MD5=$(md5 -q assets/splash.png 2>/dev/null || echo "")
    NATIVE_MD5=$(md5 -q ios/ChainCheck/Images.xcassets/SplashScreen.imageset/image.png 2>/dev/null || echo "")
    if [ -n "$SOURCE_MD5" ] && [ -n "$NATIVE_MD5" ] && [ "$SOURCE_MD5" != "$NATIVE_MD5" ]; then
      echo ""
      echo "   ⚠️  WARNING: Source and native splash screens don't match!"
      echo "   ⚠️  This suggests the source file may not have been updated properly."
      echo "   ⚠️  Please verify assets/splash.png is the correct file."
    fi
  fi
fi

# 7. Verify new assets were created
echo ""
echo "   Verifying regenerated assets..."
if [ -d "ios/ChainCheck/Images.xcassets/AppIcon.appiconset" ]; then
  ASSET_DATE=$(stat -f "%Sm" -t "%Y-%m-%d %H:%M:%S" ios/ChainCheck/Images.xcassets/AppIcon.appiconset/*.png 2>/dev/null | head -1)
  echo "   ✓ AppIcon regenerated ($ASSET_DATE)"
else
  echo "   ⚠️  AppIcon not found - may need to run 'npm run ios' to complete"
fi

if [ -d "ios/ChainCheck/Images.xcassets/SplashScreen.imageset" ]; then
  SPLASH_DATE=$(stat -f "%Sm" -t "%Y-%m-%d %H:%M:%S" ios/ChainCheck/Images.xcassets/SplashScreen.imageset/*.png 2>/dev/null | head -1)
  echo "   ✓ SplashScreen regenerated ($SPLASH_DATE)"
else
  echo "   ⚠️  SplashScreen not found - may need to run 'npm run ios' to complete"
fi

echo ""
echo "✅ iOS asset cache cleared and assets regenerated!"
echo ""
echo "Next steps:"
echo "  1. Uninstall the app from your iOS simulator/device"
echo "  2. Run: npm run ios"
echo "  3. The new app icon and splash screen should now appear"
echo ""
echo "Note: If images still don't update, try:"
echo "  - Reset iOS Simulator: Device → Erase All Content and Settings"
echo "  - Or delete and reinstall the app on your physical device"

