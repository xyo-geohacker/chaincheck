#!/bin/bash
# Script to stop all running Expo/Metro/Node processes
# Usage: ./scripts/stop-expo.sh

set -e

echo "=== Stopping Expo/Metro Processes ==="
echo ""

# Find and kill processes on Metro port (8081)
PORT=8081
PID=$(lsof -ti:$PORT 2>/dev/null || echo "")

if [ -n "$PID" ]; then
  echo "Found process on port $PORT (PID: $PID)"
  kill -9 $PID 2>/dev/null || true
  echo "✓ Killed process on port $PORT"
else
  echo "No process found on port $PORT"
fi

# Find and kill Expo CLI processes
echo ""
echo "Searching for Expo processes..."
EXPO_PIDS=$(ps aux | grep -i "expo\|metro" | grep -v grep | awk '{print $2}' | sort -u)

if [ -n "$EXPO_PIDS" ]; then
  echo "Found Expo/Metro processes:"
  ps aux | grep -i "expo\|metro" | grep -v grep
  echo ""
  for PID in $EXPO_PIDS; do
    echo "Killing process $PID..."
    kill -9 $PID 2>/dev/null || true
  done
  echo "✓ Killed Expo/Metro processes"
else
  echo "No Expo/Metro processes found"
fi

# Find and kill Node processes in mobile directory
echo ""
echo "Searching for Node processes in mobile directory..."
NODE_PIDS=$(ps aux | grep -i "node.*mobile\|node.*expo" | grep -v grep | awk '{print $2}' | sort -u)

if [ -n "$NODE_PIDS" ]; then
  echo "Found Node processes:"
  ps aux | grep -i "node.*mobile\|node.*expo" | grep -v grep
  echo ""
  for PID in $NODE_PIDS; do
    echo "Killing process $PID..."
    kill -9 $PID 2>/dev/null || true
  done
  echo "✓ Killed Node processes"
else
  echo "No Node processes found in mobile directory"
fi

# Wait a moment for processes to terminate
sleep 1

# Verify all processes are stopped
echo ""
echo "=== Verification ==="
REMAINING=$(ps aux | grep -i "expo\|metro" | grep -v grep | wc -l | tr -d ' ')
if [ "$REMAINING" -eq 0 ]; then
  echo "✓ All Expo/Metro processes stopped"
else
  echo "⚠ Warning: Some processes may still be running:"
  ps aux | grep -i "expo\|metro" | grep -v grep
fi

PORT_CHECK=$(lsof -ti:$PORT 2>/dev/null || echo "")
if [ -z "$PORT_CHECK" ]; then
  echo "✓ Port $PORT is now free"
else
  echo "⚠ Warning: Port $PORT is still in use (PID: $PORT_CHECK)"
fi

echo ""
echo "Done!"

