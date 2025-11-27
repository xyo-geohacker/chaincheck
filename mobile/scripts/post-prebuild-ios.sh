#!/bin/bash
# Post-prebuild script to ensure Mapbox pod is always in Podfile
# This runs after Expo prebuild to add the Mapbox pod if it's missing

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
IOS_DIR="$PROJECT_DIR/ios"
PODFILE="$IOS_DIR/Podfile"

# Only run if ios directory exists
if [ ! -d "$IOS_DIR" ]; then
  exit 0
fi

# Check if Podfile exists
if [ ! -f "$PODFILE" ]; then
  exit 0
fi

# Check if Mapbox pod is already in Podfile
if grep -q "rnmapbox-maps" "$PODFILE"; then
  echo "✓ Mapbox pod already in Podfile"
  exit 0
fi

echo "🔧 Adding Mapbox pod to Podfile..."

# Find the line with "config = use_native_modules!" and add Mapbox pod after it
if [[ "$OSTYPE" == "darwin"* ]]; then
  # macOS
  sed -i '' '/config = use_native_modules!/a\
\
  # Manually add @rnmapbox/maps pod\
  # Note: The @rnmapbox/maps Expo plugin is configured in app.config.js, but this manual\
  # pod declaration ensures Mapbox is linked even if prebuild doesn'\''t run or fails.\
  # This is necessary because Mapbox requires native SDK downloads via .netrc authentication.\
  pod '\''rnmapbox-maps'\'', :path => '\''../node_modules/@rnmapbox/maps'\''
' "$PODFILE"
else
  # Linux
  sed -i '/config = use_native_modules!/a\
\
  # Manually add @rnmapbox/maps pod\
  # Note: The @rnmapbox/maps Expo plugin is configured in app.config.js, but this manual\
  # pod declaration ensures Mapbox is linked even if prebuild doesn'\''t run or fails.\
  # This is necessary because Mapbox requires native SDK downloads via .netrc authentication.\
  pod '\''rnmapbox-maps'\'', :path => '\''../node_modules/@rnmapbox/maps'\''
' "$PODFILE"
fi

echo "✓ Mapbox pod added to Podfile"

