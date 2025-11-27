#!/bin/bash
# Script to help generate app icons from a source image
# Usage: ./scripts/generate-icons.sh <source-image.png>

set -e

SOURCE_IMAGE="$1"
ASSETS_DIR="assets"

if [ -z "$SOURCE_IMAGE" ]; then
  echo "Usage: ./scripts/generate-icons.sh <source-image.png>"
  echo ""
  echo "This script helps generate app icons from a source image."
  echo "You'll need ImageMagick installed: brew install imagemagick"
  echo ""
  echo "Alternatively, use online tools:"
  echo "  - https://appicon.co"
  echo "  - https://icon.kitchen"
  echo "  - https://makeappicon.com"
  exit 1
fi

if [ ! -f "$SOURCE_IMAGE" ]; then
  echo "Error: Source image not found: $SOURCE_IMAGE"
  exit 1
fi

# Check if ImageMagick is installed
if ! command -v magick &> /dev/null; then
  echo "Error: ImageMagick not found. Install with: brew install imagemagick"
  echo ""
  echo "Or use online tools instead:"
  echo "  - https://appicon.co (recommended)"
  echo "  - https://icon.kitchen"
  exit 1
fi

echo "Generating app icons from: $SOURCE_IMAGE"
echo ""

# Create assets directory if it doesn't exist
mkdir -p "$ASSETS_DIR"

# Generate icon.png (1024x1024, iOS)
echo "Generating icon.png (1024x1024)..."
magick "$SOURCE_IMAGE" -resize 1024x1024^ -gravity center -extent 1024x1024 -background white -alpha remove "$ASSETS_DIR/icon.png"

# Generate icon.png (512x512, iOS)
# echo "Generating icon.png (512x512)..."
# magick "$SOURCE_IMAGE" -resize 512x512^ -gravity center -extent 512x512 -background white -alpha remove "$ASSETS_DIR/icon.png"

# Generate adaptive-icon.png (1024x1024, Android foreground)
# Android adaptive icons only show the center 66% (safe zone), so we need to add padding
# Resize to fit within 60% of canvas (614px) to ensure full logo is visible with extra margin
# Maintain aspect ratio: resize to fit within bounds, then center with transparent padding
echo "Generating adaptive-icon.png (1024x1024) with safe zone padding..."
magick "$SOURCE_IMAGE" \
  -resize '614x614>' \
  -gravity center \
  -extent 1024x1024 \
  -background transparent \
  "$ASSETS_DIR/adaptive-icon.png"

# Generate adaptive-icon.png (512x512, Android foreground)
# echo "Generating adaptive-icon.png (512x512)..."
# magick "$SOURCE_IMAGE" -resize 512x512^ -gravity center -extent 512x512 "$ASSETS_DIR/adaptive-icon.png"

# Generate favicon.png (512x512, web)
echo "Generating favicon.png (512x512)..."
magick "$SOURCE_IMAGE" -resize 512x512^ -gravity center -extent 512x512 "$ASSETS_DIR/favicon.png"

echo ""
echo "✓ Icons generated successfully!"
echo ""
echo "Files created:"
echo "  - $ASSETS_DIR/icon.png (1024x1024)"
echo "  - $ASSETS_DIR/adaptive-icon.png (1024x1024)"
echo "  - $ASSETS_DIR/favicon.png (512x512)"
echo ""
echo "Next steps:"
echo "  1. Review the generated icons"
echo "  2. Adjust if needed (ensure content is in center 66-80%)"
echo "  3. Rebuild app: npm run android"
echo ""

