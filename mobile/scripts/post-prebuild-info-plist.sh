#!/bin/bash
# Post-prebuild script to ensure Info.plist permissions are always present
# This runs after Expo prebuild to add required permission descriptions if they're missing

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
IOS_DIR="$PROJECT_DIR/ios"
INFO_PLIST="$IOS_DIR/ChainCheck/Info.plist"

# Only run if ios directory and Info.plist exist
if [ ! -d "$IOS_DIR" ] || [ ! -f "$INFO_PLIST" ]; then
  exit 0
fi

# Check if permissions are already present
HAS_CAMERA=$(grep -q "NSCameraUsageDescription" "$INFO_PLIST" && echo "yes" || echo "no")
HAS_LOCATION=$(grep -q "NSLocationWhenInUseUsageDescription" "$INFO_PLIST" && echo "yes" || echo "no")

if [ "$HAS_CAMERA" = "yes" ] && [ "$HAS_LOCATION" = "yes" ]; then
  echo "✓ Info.plist permissions already present"
  exit 0
fi

echo "🔧 Adding missing Info.plist permissions..."

# Find the line with "</true>" after "LSRequiresIPhoneOS" and add permissions after it
# We match the pattern: <key>LSRequiresIPhoneOS</key> followed by <true/>
if [[ "$OSTYPE" == "darwin"* ]]; then
  # macOS - insert after the <true/> tag that follows LSRequiresIPhoneOS
  if [ "$HAS_CAMERA" = "no" ]; then
    sed -i '' '/<key>LSRequiresIPhoneOS<\/key>/,/<true\/>/{
      /<true\/>/a\
	<key>NSCameraUsageDescription</key>\
	<string>Allow ChainCheck to access your camera to capture delivery proof photos.</string>
    }' "$INFO_PLIST"
  fi
  
  if [ "$HAS_LOCATION" = "no" ]; then
    # Add location permission after camera (or after LSRequiresIPhoneOS if camera wasn't added)
    if [ "$HAS_CAMERA" = "yes" ]; then
      sed -i '' '/<string>Allow ChainCheck to access your camera/a\
	<key>NSLocationWhenInUseUsageDescription</key>\
	<string>Allow ChainCheck to access your location for delivery verification.</string>
' "$INFO_PLIST"
    else
      sed -i '' '/<key>LSRequiresIPhoneOS<\/key>/,/<true\/>/{
        /<true\/>/a\
	<key>NSLocationWhenInUseUsageDescription</key>\
	<string>Allow ChainCheck to access your location for delivery verification.</string>
      }' "$INFO_PLIST"
    fi
  fi
else
  # Linux - insert after the <true/> tag that follows LSRequiresIPhoneOS
  if [ "$HAS_CAMERA" = "no" ]; then
    sed -i '/<key>LSRequiresIPhoneOS<\/key>/,/<true\/>/{
      /<true\/>/a\
	<key>NSCameraUsageDescription</key>\
	<string>Allow ChainCheck to access your camera to capture delivery proof photos.</string>
    }' "$INFO_PLIST"
  fi
  
  if [ "$HAS_LOCATION" = "no" ]; then
    if [ "$HAS_CAMERA" = "yes" ]; then
      sed -i '/<string>Allow ChainCheck to access your camera/a\
	<key>NSLocationWhenInUseUsageDescription</key>\
	<string>Allow ChainCheck to access your location for delivery verification.</string>
' "$INFO_PLIST"
    else
      sed -i '/<key>LSRequiresIPhoneOS<\/key>/,/<true\/>/{
        /<true\/>/a\
	<key>NSLocationWhenInUseUsageDescription</key>\
	<string>Allow ChainCheck to access your location for delivery verification.</string>
      }' "$INFO_PLIST"
    fi
  fi
fi

echo "✓ Info.plist permissions added"

