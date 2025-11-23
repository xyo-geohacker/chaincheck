#!/bin/bash
# Script to launch the ChainCheck app on Android device
# Usage: ./scripts/launch-app.sh

set -e

PACKAGE_NAME="com.chaincheck.app"
ACTIVITY_NAME="com.chaincheck.app.MainActivity"

echo "Launching ChainCheck app..."
echo "Package: $PACKAGE_NAME"
echo "Activity: $ACTIVITY_NAME"
echo ""

# Check if device is connected
if ! adb devices | grep -q "device$"; then
  echo "❌ No Android device connected!"
  echo "Please connect your device and enable USB debugging."
  exit 1
fi

echo "✓ Device connected"
echo ""

# Launch the app
adb shell am start -n "$PACKAGE_NAME/$ACTIVITY_NAME"

if [ $? -eq 0 ]; then
  echo "✓ App launched successfully!"
else
  echo "❌ Failed to launch app"
  echo ""
  echo "Troubleshooting:"
  echo "  1. Ensure app is installed: adb shell pm list packages | grep chaincheck"
  echo "  2. Rebuild app: npm run android"
  exit 1
fi

