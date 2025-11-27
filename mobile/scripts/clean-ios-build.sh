#!/bin/bash
# Script to clean iOS build artifacts and test first-time build process
# This mimics what a first-time user would experience

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_DIR"

echo "🧹 Cleaning iOS build artifacts for fresh build test..."
echo ""

# Remove generated iOS directory
if [ -d "ios" ]; then
  echo "  Removing ios/ directory..."
  rm -rf ios
  echo "  ✓ Removed ios/"
else
  echo "  ℹ ios/ directory doesn't exist (already clean)"
fi

# Remove node_modules to test npm install and patch application
if [ -d "node_modules" ]; then
  echo "  Removing node_modules/ directory..."
  rm -rf node_modules
  echo "  ✓ Removed node_modules/"
else
  echo "  ℹ node_modules/ directory doesn't exist (already clean)"
fi

# Remove Expo cache
if [ -d ".expo" ]; then
  echo "  Removing .expo/ cache directory..."
  rm -rf .expo
  echo "  ✓ Removed .expo/"
else
  echo "  ℹ .expo/ directory doesn't exist (already clean)"
fi

# Remove package-lock.json to test fresh install
if [ -f "package-lock.json" ]; then
  echo "  Removing package-lock.json..."
  rm -f package-lock.json
  echo "  ✓ Removed package-lock.json"
else
  echo "  ℹ package-lock.json doesn't exist (already clean)"
fi

echo ""
echo "✅ Clean complete! Ready for fresh build test."
echo ""
echo "⚠️  Known Issue: First 'npm run ios' may show a CRC error from jimp-compact."
echo "   This is a known Expo prebuild issue with image processing."
echo "   Simply run 'npm run ios' again - it will work on the second attempt."
echo ""
echo "Next steps:"
echo "  1. npm install          # Install dependencies and apply patches"
echo "  2. npm run ios          # Generate iOS project and build (may need to run twice)"
echo ""

