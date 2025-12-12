#!/usr/bin/env bash

# Build script for shared TypeScript types
# Compiles TypeScript files in shared/types/ to JavaScript

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
SHARED_TYPES_DIR="${PROJECT_ROOT}/shared/types"

echo "Building shared types..."

# Check for TypeScript in backend, web, or mobile node_modules
cd "${PROJECT_ROOT}"
TSC_CMD=""
if [ -f "backend/node_modules/.bin/tsc" ]; then
  TSC_CMD="backend/node_modules/.bin/tsc"
elif [ -f "web/node_modules/.bin/tsc" ]; then
  TSC_CMD="web/node_modules/.bin/tsc"
elif [ -f "mobile/node_modules/.bin/tsc" ]; then
  TSC_CMD="mobile/node_modules/.bin/tsc"
elif command -v tsc &> /dev/null; then
  TSC_CMD="tsc"
else
  echo "Error: TypeScript not found."
  echo ""
  echo "Please install TypeScript in one of the following ways:"
  echo "  1. Run 'npm install' in the backend, web, or mobile directory"
  echo "  2. Install TypeScript globally: npm install -g typescript"
  echo "  3. Install TypeScript in this directory: npm install --save-dev typescript"
  echo ""
  exit 1
fi

# Compile each TypeScript file
cd "${SHARED_TYPES_DIR}"

for ts_file in *.ts; do
  if [ -f "$ts_file" ]; then
    echo "Compiling ${ts_file}..."
    "${PROJECT_ROOT}/${TSC_CMD}" "$ts_file" \
      --module commonjs \
      --target ES2020 \
      --moduleResolution node \
      --esModuleInterop \
      --declaration \
      --sourceMap \
      --outDir . \
      --skipLibCheck
  fi
done

echo "Shared types build complete!"

