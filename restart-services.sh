#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
pids=()

stop_process() {
  local pattern="$1"
  if pgrep -f "$pattern" >/dev/null 2>&1; then
    echo "Stopping existing process matching '${pattern}'..."
    pkill -f "$pattern" || true
    sleep 1
  fi
}

start_service() {
  local dir="$1"
  shift
  local cmd=("$@")

  pushd "${ROOT_DIR}/${dir}" >/dev/null
  npm install
  "${cmd[@]}" &
  pids+=("$!")
  popd >/dev/null
}

cleanup() {
  echo
  echo "Stopping dev servers..."
  for pid in "${pids[@]:-}"; do
    if ps -p "$pid" >/dev/null 2>&1; then
      kill "$pid" >/dev/null 2>&1 || true
    fi
  done
  wait || true
  exit 0
}

trap cleanup INT TERM

echo "Shutting down existing dev servers (if any)..."
stop_process "tsx watch src/index.ts"
stop_process "next dev"
stop_process "expo start"

echo "Starting backend..."
start_service "backend" npm run dev

echo "Starting web dashboard..."
start_service "web" npm run dev

echo "Starting mobile app..."
start_service "mobile" npm start

echo "All services restarted."
echo "Backend:    http://localhost:4000"
echo "Web app:    http://localhost:3000"
echo "Expo CLI:   running (scan QR or use simulator)."
echo "Press Ctrl+C to stop all services."

wait

