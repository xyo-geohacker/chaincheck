#!/bin/bash
# Wrapper script to ensure CocoaPods is in PATH when running Expo iOS
# This fixes the issue where Expo CLI doesn't detect CocoaPods installed via Homebrew
# Also fixes Ruby/GEM_PATH conflicts between RVM and Homebrew Ruby

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Clear RVM paths from environment to avoid Ruby version conflicts
# CocoaPods should use system Ruby, not RVM or Homebrew Ruby
unset GEM_PATH
unset GEM_HOME

# Force clear GEM_PATH if it contains RVM paths (even if unset didn't work)
if [[ -n "$GEM_PATH" ]] && echo "$GEM_PATH" | grep -q "rvm"; then
  export GEM_PATH=$(echo "$GEM_PATH" | tr ':' '\n' | grep -v rvm | tr '\n' ':' | sed 's/:$//' | sed 's/^://')
  # If GEM_PATH is now empty, unset it
  [[ -z "$GEM_PATH" ]] && unset GEM_PATH
fi
unset RUBY_VERSION
unset RUBY_ROOT
unset MY_RUBY_HOME
unset IRBRC
unset rvm_path
unset rvm_prefix
unset rvm_version
unset rvm_ruby_string
unset rvm_gemset_name
unset rvm_docs_type
unset rvm_tmp_path
unset rvm_user_path
unset rvm_scripts_path
unset rvm_hook
unset rvm_previous_environment
unset rvm_current_flag
unset rvm_silent_flag
unset rvm_file_cd
unset rvm_auto_flag
unset rvm_bin_path
unset rvm_sdk
unset rvm_wrapper_name
unset rvm_project_rvmrc
unset rvm_architectures
unset rvm_ignore_gemrc_flag
unset rvm_sticky_flag
unset rvm_system_flag
unset rvm_user_flag
unset rvm_rvmrc_file
unset rvm_rvmrc_files
unset rvm_scripts_env_file
unset rvm_scripts_initialize_flag
unset rvm_scripts_rvm_hook
unset rvm_scripts_path_file
unset rvm_scripts_version_file
unset rvm_scripts_version
unset rvm_scripts_remote_server
unset rvm_scripts_remote_path
unset rvm_scripts_remote_repo_url
unset rvm_scripts_remote_repo_branch
unset rvm_scripts_remote_repo_commit
unset rvm_scripts_remote_repo_sha
unset rvm_scripts_remote_repo_ref
unset rvm_scripts_remote_repo_tag
unset rvm_scripts_remote_repo_branch
unset rvm_scripts_remote_repo_commit
unset rvm_scripts_remote_repo_sha
unset rvm_scripts_remote_repo_ref
unset rvm_scripts_remote_repo_tag

# Remove RVM from PATH if present
export PATH=$(echo "$PATH" | tr ':' '\n' | grep -v rvm | tr '\n' ':' | sed 's/:$//')

# Set LANG to UTF-8 (required by CocoaPods)
export LANG=en_US.UTF-8
export LC_ALL=en_US.UTF-8

# Ensure correct Node.js version is available for Expo and CocoaPods
# CocoaPods may use a different PATH, so we need to ensure Node.js 18+ is available
export PATH="$(dirname $(which node)):$PATH"
if [ -d "$HOME/.nvm" ]; then
  export NVM_DIR="$HOME/.nvm"
  [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
fi

# Verify Node.js version
NODE_VERSION=$(node --version 2>&1 | sed 's/v//' | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
  echo "❌ Error: Node.js version must be 18 or higher"
  echo "   Current Node.js: $(node --version)"
  echo "   Please upgrade Node.js: https://nodejs.org/"
  exit 1
fi

# Add Homebrew paths to PATH (for both Intel and Apple Silicon Macs)
export PATH="/usr/local/bin:/opt/homebrew/bin:$PATH"

# Also ensure /usr/local/Cellar paths are available (where Homebrew installs CocoaPods)
if [ -d "/usr/local/Cellar/cocoapods" ]; then
  COCOAPODS_BIN=$(find /usr/local/Cellar/cocoapods -name "pod" -type f 2>/dev/null | head -1)
  if [ -n "$COCOAPODS_BIN" ]; then
    COCOAPODS_DIR=$(dirname "$COCOAPODS_BIN")
    export PATH="$COCOAPODS_DIR:$PATH"
  fi
fi

# Verify CocoaPods is available
if ! command -v pod &> /dev/null; then
  echo "❌ Error: CocoaPods not found in PATH" >&2
  echo "Current PATH: $PATH" >&2
  echo "" >&2
  echo "Please ensure CocoaPods is installed:" >&2
  echo "  brew install cocoapods" >&2
  echo "  OR" >&2
  echo "  sudo gem install cocoapods" >&2
  exit 1
fi

# Test if CocoaPods actually works (not just found in PATH)
POD_VERSION_OUTPUT=$(pod --version 2>&1)
POD_EXIT_CODE=$?

if [ $POD_EXIT_CODE -ne 0 ]; then
  echo "❌ Error: CocoaPods found but cannot run due to Ruby dependency issues" >&2
  echo "" >&2
  echo "This is caused by RVM/Homebrew Ruby conflicts. CocoaPods was installed via" >&2
  echo "Homebrew but is trying to use RVM's gem paths." >&2
  echo "" >&2
  echo "To fix this, reinstall CocoaPods using the system Ruby:" >&2
  echo "  1. brew uninstall cocoapods" >&2
  echo "  2. sudo gem install cocoapods" >&2
  echo "" >&2
  echo "Or if you prefer to keep Homebrew CocoaPods, ensure RVM is completely" >&2
  echo "removed from your shell configuration files (~/.bashrc, ~/.zshrc, etc.)" >&2
  echo "" >&2
  echo "Error details:" >&2
  echo "$POD_VERSION_OUTPUT" | head -3 >&2
  exit 1
fi

echo "✓ CocoaPods found at: $(which pod)"
echo "✓ CocoaPods version: $POD_VERSION_OUTPUT"
echo ""

# Change to project directory
cd "$PROJECT_DIR" || exit 1

# Export NODE_BINARY so CocoaPods can find the correct Node.js
export NODE_BINARY="$(which node)"

# Strategy: If ios/ doesn't exist, run prebuild separately first, add Mapbox pod, then build
# This ensures Mapbox is available on the first build without needing two builds
if [ ! -d "ios" ]; then
  echo "📱 iOS directory doesn't exist - running prebuild first..."
  echo "🚀 Running Expo prebuild..."
  
  # Run prebuild with retry for CRC errors
  # Note: CRC errors are often caused by cached/corrupted files in node_modules or .expo
  # IMPORTANT: If .expo cache exists from a previous failed run, preserve it as it may contain
  # processed images that prevent the CRC error on subsequent runs
  PREBUILD_RETRY=0
  MAX_PREBUILD_RETRIES=3
  PREBUILD_SUCCESS=false
  PRESERVE_EXPO_CACHE=false
  
  # Check if .expo cache exists - if so, this might be a second run and we should preserve it
  if [ -d ".expo" ]; then
    PRESERVE_EXPO_CACHE=true
    echo "ℹ️  Found existing .expo cache - preserving it to avoid CRC errors"
  fi
  
  while [ $PREBUILD_RETRY -lt $MAX_PREBUILD_RETRIES ]; do
    if [ $PREBUILD_RETRY -gt 0 ]; then
      echo "🔄 Retrying prebuild (attempt $((PREBUILD_RETRY + 1))/$MAX_PREBUILD_RETRIES)..."
      # Clean up partially created ios/ directory if it exists
      if [ -d "ios" ]; then
        echo "🧹 Cleaning up partially created ios/ directory..."
        rm -rf ios
      fi
      
      # Clear caches that might be causing CRC errors
      # BUT: Preserve .expo cache if it exists (it may contain processed images that prevent CRC errors)
      echo "🧹 Clearing caches to resolve CRC errors..."
      if [ "$PRESERVE_EXPO_CACHE" = "false" ]; then
        if [ -d ".expo" ]; then
          rm -rf .expo
          echo "   ✓ Cleared .expo cache"
        fi
      else
        echo "   ⚠️  Preserving .expo cache (may contain processed images from previous run)"
      fi
      
      if [ -d "node_modules/.cache" ]; then
        rm -rf node_modules/.cache
        echo "   ✓ Cleared node_modules cache"
      fi
      
      # Clear npm cache on first retry (corrupted npm cache can cause persistent CRC errors)
      if [ $PREBUILD_RETRY -eq 1 ]; then
        echo "   Clearing npm cache..."
        npm cache clean --force 2>&1 | grep -E "(cache|cleared)" || true
        echo "   ✓ Cleared npm cache"
      fi
      
      # Clear jimp-compact cache specifically (this is often the culprit)
      # Note: jimp-compact is nested inside @expo/image-utils
      JIMP_COMPACT_PATH="node_modules/@expo/image-utils/node_modules/jimp-compact"
      if [ -d "$JIMP_COMPACT_PATH" ]; then
        echo "   ✓ Found jimp-compact (CRC error source) at $JIMP_COMPACT_PATH"
        # Try to clear any cached files in jimp-compact
        find "$JIMP_COMPACT_PATH" -name "*.cache" -delete 2>/dev/null || true
      elif [ -d "node_modules/jimp-compact" ]; then
        echo "   ✓ Found jimp-compact (CRC error source) at root level"
        find node_modules/jimp-compact -name "*.cache" -delete 2>/dev/null || true
      fi
      
      # On the last retry, try reinstalling @expo/image-utils (which contains jimp-compact)
      if [ $PREBUILD_RETRY -eq $((MAX_PREBUILD_RETRIES - 1)) ]; then
        echo "🔧 Last retry - attempting to fix jimp-compact..."
        if [ -d "node_modules/@expo/image-utils" ]; then
          echo "   Removing corrupted @expo/image-utils (contains jimp-compact)..."
          rm -rf "node_modules/@expo/image-utils"
          echo "   Reinstalling @expo/image-utils..."
          npm install --force @expo/image-utils 2>&1 | grep -E "(added|removed|up to date)" || true
        elif [ -d "node_modules/jimp-compact" ]; then
          echo "   Reinstalling jimp-compact package..."
          npm install --force jimp-compact@latest 2>&1 | grep -E "(added|removed|up to date)" || true
        fi
      fi
      
      # Longer pause between retries to allow file system to settle
      sleep 3
    fi
    
    # Try prebuild - if it fails with CRC error, we'll try with --no-install to skip some processing
    PREBUILD_OUTPUT=$(npx expo prebuild --platform ios --clean 2>&1)
    PREBUILD_EXIT_CODE=$?
    echo "$PREBUILD_OUTPUT"
    
    # If CRC error detected and this is the last retry, try a workaround: replace minimal images with valid ones
    if [ $PREBUILD_EXIT_CODE -ne 0 ] && echo "$PREBUILD_OUTPUT" | grep -qi "Crc error\|CRC error\|jimp-compact.*error"; then
      if [ $PREBUILD_RETRY -eq $((MAX_PREBUILD_RETRIES - 1)) ]; then
        echo ""
        echo "🔧 Last attempt - trying workaround: creating valid placeholder images..."
        # Check if images are minimal (1x1 pixel) - these trigger the CRC bug
        ICON_SIZE=$(file assets/icon.png 2>/dev/null | grep -oE "[0-9]+ x [0-9]+" | head -1 || echo "")
        if echo "$ICON_SIZE" | grep -qE "^1 x 1$"; then
          echo "   Detected 1x1 placeholder images - creating valid replacements..."
          
          # Backup original images
          if [ -f "assets/icon.png" ]; then
            mv assets/icon.png assets/icon.png.backup
          fi
          if [ -f "assets/splash.png" ]; then
            mv assets/splash.png assets/splash.png.backup
          fi
          
          # Create valid PNG images using a simple approach
          # Use sips (macOS built-in) or ImageMagick to create valid images
          echo "   Creating valid placeholder images..."
          if command -v sips >/dev/null 2>&1; then
            # Use macOS sips to create valid images
            sips -s format png --setProperty formatOptions low -z 1024 1024 --out assets/icon.png /System/Library/CoreServices/DefaultDesktop.heic 2>/dev/null || \
            sips -c 1024 1024 -s format png --out assets/icon.png /System/Library/CoreServices/DefaultDesktop.heic 2>/dev/null || \
            echo "   ⚠️  sips failed, trying alternative..."
          fi
          
          # Fallback: Use Python PIL/Pillow if available
          if ! [ -f "assets/icon.png" ] || [ "$(stat -f%z assets/icon.png 2>/dev/null || echo 0)" -lt 100 ]; then
            python3 << 'PYTHON_EOF' 2>&1 | grep -v "^$" || echo "   ⚠️  Python method failed"
try:
    from PIL import Image
    # Create 1024x1024 black icon
    icon = Image.new('RGB', (1024, 1024), color=(0, 0, 0))
    icon.save('assets/icon.png', 'PNG')
    # Create 2048x2048 dark blue splash
    splash = Image.new('RGB', (2048, 2048), color=(15, 23, 42))
    splash.save('assets/splash.png', 'PNG')
    print('Created valid placeholder images with PIL')
except ImportError:
    print('PIL not available, trying manual PNG creation...')
    # Manual PNG creation as last resort
    import struct
    import zlib
    
    def create_png(width, height):
        png = b'\x89PNG\r\n\x1a\n'
        ihdr_data = struct.pack('>IIBBBBB', width, height, 8, 2, 0, 0, 0)
        ihdr_crc = zlib.crc32(b'IHDR' + ihdr_data) & 0xffffffff
        png += struct.pack('>I', 13) + b'IHDR' + ihdr_data + struct.pack('>I', ihdr_crc)
        png += b'\x00\x00\x00\x00IEND\xaeB`\x82'
        return png
    
    with open('assets/icon.png', 'wb') as f:
        f.write(create_png(1024, 1024))
    with open('assets/splash.png', 'wb') as f:
        f.write(create_png(2048, 2048))
    print('Created minimal valid PNG images')
except Exception as e:
    print(f'Error: {e}')
    raise
PYTHON_EOF
          fi
          
          # If still no valid images, restore originals
          if ! [ -f "assets/icon.png" ] || [ "$(stat -f%z assets/icon.png 2>/dev/null || echo 0)" -lt 100 ]; then
            echo "   ⚠️  Could not create valid images - restoring originals"
            if [ -f "assets/icon.png.backup" ]; then
              mv assets/icon.png.backup assets/icon.png
            fi
            if [ -f "assets/splash.png.backup" ]; then
              mv assets/splash.png.backup assets/splash.png
            fi
          fi
          
          # Try prebuild with new images
          if [ -f "assets/icon.png" ] && [ -f "assets/splash.png" ]; then
            echo "   Attempting prebuild with valid placeholder images..."
            PREBUILD_OUTPUT=$(npx expo prebuild --platform ios --clean 2>&1)
            PREBUILD_EXIT_CODE=$?
            echo "$PREBUILD_OUTPUT"
            
            # If this worked, keep the new images; otherwise restore
            if [ $PREBUILD_EXIT_CODE -eq 0 ] && [ -d "ios" ] && [ -f "ios/Podfile" ]; then
              if ruby -c ios/Podfile >/dev/null 2>&1; then
                PREBUILD_SUCCESS=true
                echo "✓ Prebuild succeeded with valid placeholder images!"
                # Remove backups since new images work
                rm -f assets/icon.png.backup assets/splash.png.backup
                break
              fi
            fi
            
            # If it still failed, restore originals
            if [ "$PREBUILD_SUCCESS" != "true" ]; then
              echo "   Workaround failed - restoring original images"
              if [ -f "assets/icon.png.backup" ]; then
                mv assets/icon.png.backup assets/icon.png
              fi
              if [ -f "assets/splash.png.backup" ]; then
                mv assets/splash.png.backup assets/splash.png
              fi
            fi
          fi
        fi
      fi
    fi
    
    # Check if prebuild actually succeeded (Podfile should exist and be valid)
    if [ $PREBUILD_EXIT_CODE -eq 0 ] && [ -d "ios" ] && [ -f "ios/Podfile" ]; then
      # Verify Podfile is valid by checking syntax
      if ruby -c ios/Podfile >/dev/null 2>&1; then
        PREBUILD_SUCCESS=true
        echo "✓ Prebuild succeeded!"
        break
      else
        echo "⚠️  Prebuild completed but Podfile is invalid"
        if [ $PREBUILD_RETRY -lt $((MAX_PREBUILD_RETRIES - 1)) ]; then
          echo "   Cleaning up and retrying..."
          rm -rf ios
          PREBUILD_RETRY=$((PREBUILD_RETRY + 1))
          sleep 3
          continue
        else
          echo "❌ Prebuild failed: Podfile is invalid after $MAX_PREBUILD_RETRIES attempts"
          rm -rf ios
          exit 1
        fi
      fi
    fi
    
    # Check for CRC error - retry if we haven't exceeded max retries
    if echo "$PREBUILD_OUTPUT" | grep -qi "Crc error\|CRC error\|jimp-compact.*error"; then
      if [ $PREBUILD_RETRY -lt $((MAX_PREBUILD_RETRIES - 1)) ]; then
        echo ""
        echo "⚠️  Detected CRC error (known Expo prebuild issue with jimp-compact)"
        echo "   This is often caused by cached/corrupted files."
        echo "   Cleaning up and retrying with cache clearing..."
        # Clean up corrupted ios/ directory
        if [ -d "ios" ]; then
          rm -rf ios
        fi
        PREBUILD_RETRY=$((PREBUILD_RETRY + 1))
        # Don't sleep here - the cleanup above will happen at the start of next iteration
        continue
      else
        echo ""
        echo "❌ Prebuild failed: CRC error persists after $MAX_PREBUILD_RETRIES attempts"
        echo "   This is a known Expo issue with jimp-compact during image processing."
        echo ""
        echo "   ROOT CAUSE: The placeholder images (1x1 pixel) may be triggering the jimp-compact bug."
        echo ""
        echo "   Recommended solutions (in order):"
        echo ""
        echo "   1. Replace placeholder images with proper images:"
        echo "      - Use scripts/generate-icons.sh to generate proper icon/splash images"
        echo "      - Or download proper images (1024x1024 for icon, appropriate size for splash)"
        echo "      - Then run: npm run ios"
        echo ""
        echo "   2. Run WITHOUT deleting node_modules between runs:"
        echo "      npm run ios  # First run (may fail)"
        echo "      npm run ios  # Second run (may succeed if cache helps)"
        echo ""
        echo "   3. Clear npm cache and reinstall:"
        echo "      npm cache clean --force"
        echo "      rm -rf node_modules/@expo/image-utils node_modules/jimp-compact"
        echo "      npm install"
        echo ""
        echo "   4. Report to Expo: https://github.com/expo/expo/issues (this is a known bug)"
        if [ -d "ios" ]; then
          echo "🧹 Cleaning up corrupted ios/ directory..."
          rm -rf ios
        fi
        exit 1
      fi
    fi
    
    # If we get here, prebuild failed for a non-CRC reason
    if [ $PREBUILD_RETRY -lt $((MAX_PREBUILD_RETRIES - 1)) ]; then
      echo "⚠️  Prebuild failed (non-CRC error), retrying..."
      if [ -d "ios" ]; then
        rm -rf ios
      fi
      PREBUILD_RETRY=$((PREBUILD_RETRY + 1))
      sleep 3
      continue
    else
      echo "❌ Prebuild failed after $MAX_PREBUILD_RETRIES attempts"
      if [ -d "ios" ]; then
        echo "🧹 Cleaning up corrupted ios/ directory..."
        rm -rf ios
      fi
      exit $PREBUILD_EXIT_CODE
    fi
  done
  
  # After prebuild succeeds, add Mapbox pod and Info.plist permissions
  if [ "$PREBUILD_SUCCESS" = "true" ] && [ -d "ios" ] && [ -f "ios/Podfile" ]; then
    echo ""
    echo "🔧 Adding Mapbox pod and Info.plist permissions after prebuild..."
    bash scripts/post-prebuild-ios.sh
    bash scripts/post-prebuild-info-plist.sh
    
    # Verify Podfile is still valid after adding Mapbox pod
    if ! ruby -c ios/Podfile >/dev/null 2>&1; then
      echo "❌ Error: Podfile is invalid after adding Mapbox pod"
      echo "   Checking Podfile syntax..."
      ruby -c ios/Podfile 2>&1 | head -10
      exit 1
    fi
    
    # Run pod install to include Mapbox
    echo "📦 Installing pods (including Mapbox)..."
    cd ios
    
    # Ensure correct Node.js version is used by CocoaPods
    # The Podfile uses `node` commands that must use the correct version
    NODE_PATH=$(which node)
    NODE_VERSION=$(node --version)
    NODE_MAJOR=$(echo "$NODE_VERSION" | sed 's/v\([0-9]*\).*/\1/')
    
    echo "   Detected Node.js: $NODE_PATH ($NODE_VERSION)"
    
    # Verify Node.js version is >= 18
    if [ "$NODE_MAJOR" -lt 18 ]; then
      echo "❌ Error: Node.js version $NODE_VERSION is too old. React Native requires >= 18."
      echo "   Current Node.js: $NODE_PATH"
      echo "   Please upgrade Node.js or use nvm to switch to a newer version."
      cd ..
      exit 1
    fi
    
    # Set environment variables for CocoaPods
    export LC_ALL=en_US.UTF-8
    export LANG=en_US.UTF-8
    export PATH="/usr/local/Cellar/cocoapods/1.16.2_1/bin:$PATH"
    # CRITICAL: Remove /usr/local/bin from PATH (it contains old Node.js v16.14.0)
    # Then ensure correct Node.js is first in PATH so CocoaPods uses it
    # This is important because the Podfile uses backtick `node` commands
    export PATH=$(echo "$PATH" | tr ':' '\n' | grep -v "^/usr/local/bin$" | grep -v "^/opt/local/bin$" | tr '\n' ':' | sed 's/:$//' | sed 's/^://')
    export PATH="$(dirname "$NODE_PATH"):$PATH"
    export NODE_BINARY="$NODE_PATH"
    # Also ensure NVM paths are set if using NVM
    if [[ "$NODE_PATH" == *".nvm"* ]]; then
      export NVM_DIR="$HOME/.nvm"
      [ -s "$NVM_DIR/nvm.sh" ] && source "$NVM_DIR/nvm.sh" 2>/dev/null || true
    fi
    unset GEM_PATH GEM_HOME
    
    # Verify Node.js in PATH is correct
    ACTUAL_NODE=$(which node)
    ACTUAL_VERSION=$(node --version)
    if [ "$ACTUAL_NODE" != "$NODE_PATH" ]; then
      echo "⚠️  Warning: PATH has different Node.js: $ACTUAL_NODE ($ACTUAL_VERSION)"
      echo "   Expected: $NODE_PATH ($NODE_VERSION)"
    fi
    echo "   Using Node.js: $(which node) ($(node --version))"
    
    # Verify Podfile syntax before running pod install
    if ! ruby -c Podfile >/dev/null 2>&1; then
      echo "❌ Error: Podfile has syntax errors"
      ruby -c Podfile 2>&1 | head -10
      cd ..
      exit 1
    fi
    
    pod install || {
      echo "❌ Pod install failed"
      cd ..
      exit 1
    }
    cd ..
    echo "✓ Pods installed successfully"
  elif [ ! -d "ios" ] || [ ! -f "ios/Podfile" ]; then
    echo "❌ Prebuild did not create valid ios/ directory"
    exit 1
  fi
fi

# If ios/ already exists, ensure Mapbox pod and Info.plist are configured before build
PODS_INSTALLED=false
if [ -d "ios" ] && [ -f "ios/Podfile" ]; then
  echo "🔧 Ensuring Mapbox pod and Info.plist are configured..."
  bash scripts/post-prebuild-ios.sh
  bash scripts/post-prebuild-info-plist.sh
  
  # If Mapbox pod was just added, we need to run pod install before building
  MAPBOX_IN_PODFILE=$(grep -q "rnmapbox-maps" "ios/Podfile" && echo "yes" || echo "no")
  MAPBOX_IN_LOCK=$(grep -q "rnmapbox-maps" "ios/Podfile.lock" 2>/dev/null && echo "yes" || echo "no")
  
  if [ "$MAPBOX_IN_PODFILE" = "yes" ] && [ "$MAPBOX_IN_LOCK" = "no" ]; then
    echo "📦 Installing Mapbox pods before build..."
    cd ios
    
    # Ensure correct Node.js version is used (same fix as above)
    NODE_PATH=$(which node)
    NODE_VERSION=$(node --version)
    NODE_MAJOR=$(echo "$NODE_VERSION" | sed 's/v\([0-9]*\).*/\1/')
    
    if [ "$NODE_MAJOR" -lt 18 ]; then
      echo "❌ Error: Node.js version $NODE_VERSION is too old. React Native requires >= 18."
      cd ..
      exit 1
    fi
    
    export LC_ALL=en_US.UTF-8
    export LANG=en_US.UTF-8
    export PATH="/usr/local/Cellar/cocoapods/1.16.2_1/bin:$PATH"
    # CRITICAL: Remove /usr/local/bin from PATH (it contains old Node.js v16.14.0)
    export PATH=$(echo "$PATH" | tr ':' '\n' | grep -v "^/usr/local/bin$" | grep -v "^/opt/local/bin$" | tr '\n' ':' | sed 's/:$//' | sed 's/^://')
    export PATH="$(dirname "$NODE_PATH"):$PATH"
    export NODE_BINARY="$NODE_PATH"
    if [[ "$NODE_PATH" == *".nvm"* ]]; then
      export NVM_DIR="$HOME/.nvm"
      [ -s "$NVM_DIR/nvm.sh" ] && source "$NVM_DIR/nvm.sh" 2>/dev/null || true
    fi
    unset GEM_PATH GEM_HOME
    
    echo "   Using Node.js: $(which node) ($(node --version))"
    
    pod install || {
      echo "⚠️  Pod install failed - build may fail"
    }
    cd ..
    PODS_INSTALLED=true
  fi
fi

# Run Expo iOS build and launch
# Note: If ios/ already exists, expo run:ios will skip prebuild and just build
# Use build cache by default for faster incremental builds
# Only disable cache if pods were just installed or user explicitly requests it
echo "🚀 Starting Expo iOS build and launch..."

# Check if user explicitly requested --no-build-cache
USE_BUILD_CACHE=true
if echo "$@" | grep -q -- "--no-build-cache"; then
  USE_BUILD_CACHE=false
  echo "ℹ️  Build cache disabled (--no-build-cache flag detected)"
elif [ "$PODS_INSTALLED" = "true" ]; then
  USE_BUILD_CACHE=false
  echo "ℹ️  Build cache disabled (pods were just installed, ensuring fresh build)"
else
  echo "ℹ️  Using build cache for faster incremental builds"
  echo "   Use --no-build-cache flag if you need a clean build"
fi

# Track if this is a retry attempt
RETRY_ATTEMPT=0
MAX_RETRIES=2

while [ $RETRY_ATTEMPT -lt $MAX_RETRIES ]; do
  if [ $RETRY_ATTEMPT -gt 0 ]; then
    echo ""
    echo "🔄 Retrying build (attempt $((RETRY_ATTEMPT + 1))/$MAX_RETRIES)..."
  fi
  
  # Run the build and capture output to check for CRC errors
  # Use a temp file to capture output while still displaying it
  TEMP_OUTPUT=$(mktemp)
  # Use build cache unless pods were just installed or user requested --no-build-cache
  if [ "$USE_BUILD_CACHE" = "true" ]; then
    npx expo run:ios "$@" 2>&1 | tee "$TEMP_OUTPUT"
  else
    # Remove --no-build-cache from args if present (we'll add it ourselves)
    CLEAN_ARGS=$(echo "$@" | sed 's/--no-build-cache//g')
    npx expo run:ios --no-build-cache $CLEAN_ARGS 2>&1 | tee "$TEMP_OUTPUT"
  fi
  BUILD_EXIT_CODE=${PIPESTATUS[0]}
  BUILD_OUTPUT=$(cat "$TEMP_OUTPUT")
  rm -f "$TEMP_OUTPUT"
  
  # Check if the output contains CRC error (known Expo prebuild issue)
  if echo "$BUILD_OUTPUT" | grep -qi "Crc error\|CRC error\|jimp-compact.*error"; then
    if [ $RETRY_ATTEMPT -eq 0 ]; then
      echo ""
      echo "⚠️  Detected CRC error (known Expo prebuild issue with jimp-compact)"
      echo "   This is a known issue on first build. Retrying automatically..."
      RETRY_ATTEMPT=$((RETRY_ATTEMPT + 1))
      sleep 1  # Brief pause before retry
      continue
    fi
  fi
  
  # If build succeeded, break out of loop
  if [ $BUILD_EXIT_CODE -eq 0 ]; then
    EXPO_EXIT_CODE=""
    break
  else
    # Build failed - check if it's a CRC error we should retry
    if echo "$BUILD_OUTPUT" | grep -qi "Crc error\|CRC error\|jimp-compact.*error" && [ $RETRY_ATTEMPT -eq 0 ]; then
      echo ""
      echo "⚠️  Build failed with CRC error. This is a known Expo prebuild issue."
      echo "   Retrying automatically..."
      RETRY_ATTEMPT=$((RETRY_ATTEMPT + 1))
      sleep 1  # Brief pause before retry
      continue
    else
      # Other error or already retried - exit with error
      EXPO_EXIT_CODE=$BUILD_EXIT_CODE
      break
    fi
  fi
done

# If Expo succeeded but app didn't launch, provide helpful message
if [ -z "${EXPO_EXIT_CODE:-}" ]; then
  # Check if simulator is booted and app might be installed
  sleep 2  # Give it a moment for the app to launch
  BOOTED_SIM=$(xcrun simctl list devices booted 2>/dev/null | head -1 | grep -o "iPhone [^ ]*" || echo "")
  if [ -n "$BOOTED_SIM" ]; then
    echo "✓ Simulator $BOOTED_SIM is running"
  fi
fi

# After build succeeds, only verify configuration (don't run pod install if app already launched)
# Running pod install after the app launches can cause "App entry not found" errors
# because it interferes with Metro bundler serving the app
if [ -z "${EXPO_EXIT_CODE:-}" ] && [ -d "ios" ] && [ -f "ios/Podfile" ]; then
  # Just verify configuration - don't run pod install if app is already running
  # The Mapbox pod should have been installed during Expo's prebuild/pod install phase
  MAPBOX_IN_PODFILE=$(grep -q "rnmapbox-maps" "ios/Podfile" && echo "yes" || echo "no")
  MAPBOX_IN_LOCK=$(grep -q "rnmapbox-maps" "ios/Podfile.lock" 2>/dev/null && echo "yes" || echo "no")
  
  if [ "$MAPBOX_IN_PODFILE" = "no" ]; then
    echo ""
    echo "⚠️  Warning: Mapbox pod not found in Podfile after build"
    echo "   This should have been added during prebuild. It will be added on next build."
    # Don't run post-prebuild scripts here - they'll run before the next build
  fi
  
  # Silently ensure Info.plist permissions (quick check, doesn't disrupt app)
  bash scripts/post-prebuild-info-plist.sh >/dev/null 2>&1
fi

# Exit with Expo's exit code if it failed
if [ -n "${EXPO_EXIT_CODE:-}" ]; then
  echo ""
  echo "❌ Expo iOS build/launch failed with exit code $EXPO_EXIT_CODE"
  echo "   Check the build output above for errors."
  echo "   Common issues:"
  echo "   - Build errors in Xcode"
  echo "   - Simulator not booted"
  echo "   - Missing dependencies"
  echo ""
  echo "   Try running: npm run ios-direct (to bypass wrapper script)"
  exit $EXPO_EXIT_CODE
else
  echo ""
  echo "✅ iOS build process completed!"
  
  # Check if app was actually installed on simulator
  BOOTED_SIMULATORS=$(xcrun simctl list devices booted 2>/dev/null | grep -c "Booted" || echo "0")
  if [ "$BOOTED_SIMULATORS" -eq 0 ]; then
    echo "⚠️  Warning: No simulator is currently booted."
    echo "   The build completed but the app may not have launched."
    echo "   Try: npx expo run:ios --device (to explicitly launch on a device)"
  else
    echo "✓ Simulator is running"
    echo "   If the app didn't open, try:"
    echo "   1. Check Xcode for build errors: open ios/ChainCheck.xcworkspace"
    echo "   2. Manually launch: npx expo run:ios --device"
    echo "   3. Check Metro bundler is running: npm start"
  fi
fi
