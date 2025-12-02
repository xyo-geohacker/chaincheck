#!/bin/bash

# Simple script to retrieve payload using backend API
# This is the easiest method if the backend is running

BACKEND_URL="${BACKEND_URL:-http://localhost:3001}"
PAYLOAD_HASH="${1}"

if [ -z "$PAYLOAD_HASH" ]; then
  echo "Usage: $0 <payload-hash>"
  echo ""
  echo "To get the hash, you need to compute it using PayloadBuilder.hash(payload)"
  echo "from the XYO SDK. See compute-and-retrieve-payload.mjs for an example."
  echo ""
  echo "Example:"
  echo "  node compute-and-retrieve-payload.mjs"
  echo "  # This will compute the hash and retrieve the payload"
  exit 1
fi

echo "=== Retrieving Payload from Backend API ==="
echo "Backend URL: $BACKEND_URL"
echo "Payload Hash: $PAYLOAD_HASH"
echo ""

curl -X GET "$BACKEND_URL/api/payloads/$PAYLOAD_HASH" \
  -H "Content-Type: application/json" \
  -w "\n\nHTTP Status: %{http_code}\n"

echo ""
echo "Note: The backend API handles QueryBoundWitness complexity internally."
echo "If the payload is not found, it may need a few seconds to be indexed."

