#!/bin/bash

# Simple script to retrieve payload using backend API
# This is the easiest method if the backend is running

BACKEND_URL="${BACKEND_URL:-http://localhost:3001}"

echo "=== Retrieving Payload from Archivist ==="
echo ""
echo "This script will:"
echo "  1. Compute the payload hash using the backend's XYO SDK"
echo "  2. Retrieve the payload from Archivist"
echo ""
echo "Make sure the backend dependencies are installed:"
echo "  cd backend && npm install"
echo ""

# Check if we're in the right directory
if [ ! -d "backend" ]; then
  echo "Error: Must be run from project root (where 'backend' directory exists)"
  exit 1
fi

# Run the TypeScript script from backend directory
cd backend
npm run retrieve-payload

