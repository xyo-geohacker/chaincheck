#!/bin/bash
# Script to capture crash logs from Android device
# Usage: ./scripts/capture-crash-logs.sh

set -e

TIMESTAMP=$(date +%Y%m%d-%H%M%S)
LOG_FILE="crash-logs-${TIMESTAMP}.txt"
ERROR_LOG="crash-errors-${TIMESTAMP}.txt"

echo "=== ChainCheck Crash Log Capture ==="
echo ""
echo "This script will capture logs from your Android device."
echo "Press Ctrl+C to stop capturing."
echo ""
echo "Logs will be saved to:"
echo "  - ${LOG_FILE} (all logs)"
echo "  - ${ERROR_LOG} (errors only)"
echo ""

# Check if device is connected
if ! adb devices | grep -q "device$"; then
  echo "❌ No Android device connected!"
  echo "Please connect your device and enable USB debugging."
  exit 1
fi

echo "✓ Device connected"
echo ""

# Clear old logs
echo "Clearing old logs..."
adb logcat -c

echo ""
echo "Starting log capture..."
echo "1. Launch the app on your device"
echo "2. Reproduce the crash"
echo "3. Press Ctrl+C to stop capturing"
echo ""

# Capture all logs
adb logcat -v time | tee "${LOG_FILE}" &
LOGCAT_PID=$!

# Also capture errors separately in background
adb logcat -v time *:E *:F *:S > "${ERROR_LOG}" &
ERROR_PID=$!

# Wait for user interrupt
trap "kill $LOGCAT_PID $ERROR_PID 2>/dev/null; exit" INT TERM

wait $LOGCAT_PID

echo ""
echo "=== Log Capture Complete ==="
echo ""
echo "Logs saved:"
echo "  - ${LOG_FILE}"
echo "  - ${ERROR_LOG}"
echo ""
echo "To view errors:"
echo "  cat ${ERROR_LOG}"
echo ""
echo "To search for specific errors:"
echo "  grep -i 'error\\|exception\\|fatal' ${LOG_FILE}"
echo ""

