#!/bin/bash
# Post-prebuild script to ensure expo-modules-core and expo-image-loader are included as projects
# This runs after Expo prebuild to add required Expo module project inclusions if they're missing
# Required for expo-crypto, expo-image-manipulator, and other Expo modules that use expo-module-gradle-plugin

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
ANDROID_DIR="$PROJECT_DIR/android"
SETTINGS_GRADLE="$ANDROID_DIR/settings.gradle"

# Only run if android directory exists
if [ ! -d "$ANDROID_DIR" ]; then
  exit 0
fi

# Check if settings.gradle exists
if [ ! -f "$SETTINGS_GRADLE" ]; then
  exit 0
fi

# Note: expo-modules-core and expo-image-loader are handled by Expo's autolinking (useExpoModules()),
# so we don't manually include them here to avoid conflicts
echo "ℹ expo-modules-core and expo-image-loader are handled by Expo's autolinking"

