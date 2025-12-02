#!/bin/bash

# Test script to verify archive creation and retrieval on production Archivist
# 
# This tests:
# 1. POST to /chaincheck/block/post (archive-based route)
# 2. POST to /chaincheck/dataLake/insert (archive-based route)
# 3. Verify archive was created
# 4. Retrieve data using archive-based query routes

echo "=========================================="
echo "Testing Archive Routes on Production Archivist"
echo "=========================================="
echo ""

# Check if we're in the right directory
if [ ! -d "backend" ]; then
  echo "Error: Must be run from project root (where 'backend' directory exists)"
  exit 1
fi

# Make sure backend dependencies are installed
if [ ! -d "backend/node_modules" ]; then
  echo "Installing backend dependencies..."
  cd backend && npm install && cd ..
fi

# Run the test script
cd backend
npm run test-archive

