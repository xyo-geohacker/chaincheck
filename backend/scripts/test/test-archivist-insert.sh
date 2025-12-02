#!/bin/bash

# Test script for posting to production Archivist at https://beta.api.archivist.xyo.network
# Based on ChainCheck implementation in backend/src/services/xyo/archivist-service.ts

# Archivist module address (from /Archivist redirect)
ARCHIVIST_ADDRESS="e95a6c70c8848a8e8773244fb39d701f3097ef8f"
ARCHIVIST_URL="https://beta.api.archivist.xyo.network"
ARCHIVE_NAME="chaincheck"  # Default archive name from code

# API Key (if required - set your key here or pass as environment variable)
API_KEY="${XYO_API_KEY:-}"

# Mock ChainCheck payload (based on network.xyo.chaincheck schema from xl1-transaction-builder.ts)
MOCK_PAYLOAD='{
  "schema": "network.xyo.chaincheck",
  "timestamp": 1704067200000,
  "message": "successfully delivered order ID TEST-ORDER-001",
  "data": {
    "name": "ChainCheck",
    "schema": "network.xyo.chaincheck",
    "status": "VERIFIED",
    "orderId": "TEST-ORDER-001",
    "driverId": "test-driver-001",
    "latitude": 37.7749,
    "longitude": -122.4194,
    "timestamp": "2024-01-01T00:00:00.000Z",
    "deliveryId": "test-delivery-001",
    "recipientName": "Test Recipient",
    "destinationLat": 37.7749,
    "destinationLon": -122.4194,
    "recipientPhone": "555-0100",
    "deliveryAddress": "123 Test Street, San Francisco, CA 94102",
    "altitude": 100.5,
    "barometricPressure": 1013.25,
    "accelerometer": {
      "x": 0.1,
      "y": 0.2,
      "z": 9.8
    },
    "xyoNfcUserRecord": null,
    "xyoNfcSerialNumber": null,
    "photoHash": "a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456",
    "signatureHash": "f6e5d4c3b2a1987654321098765432109876543210fedcba0987654321fedcba09"
  }
}'

echo "=== Testing Archivist Insert ==="
echo "Archivist URL: $ARCHIVIST_URL"
echo "Archivist Address: $ARCHIVIST_ADDRESS"
echo ""

# Option 1: Archive-based block post (preferred for production Archivist)
# This endpoint creates archive automatically and supports archive isolation
echo "--- Option 1: Archive-based block post (Recommended) ---"
echo "Endpoint: $ARCHIVIST_URL/$ARCHIVE_NAME/block/post"
echo "Note: This endpoint expects QueryBoundWitness format [boundWitness, payloads[]]"
echo "      which requires cryptographic signing. For testing, use Option 2 below."
echo ""

# Option 2: /dataLake/insert (simpler - accepts payloads array directly)
# WARNING: This does NOT create bound witnesses, only stores payloads
echo "--- Option 2: /dataLake/insert (Simpler for testing) ---"
echo "Endpoint: $ARCHIVIST_URL/dataLake/insert"
echo "Format: Array of payloads (no QueryBoundWitness wrapper needed)"
echo ""

if [ -n "$API_KEY" ]; then
  HEADER_ARG="-H \"x-api-key: $API_KEY\""
  echo "Using API Key: ${API_KEY:0:10}..."
else
  HEADER_ARG=""
  echo "No API Key provided (may not be required)"
fi

echo "cURL Command:"
echo "curl -X POST \"$ARCHIVIST_URL/dataLake/insert\" \\"
echo "  -H \"Content-Type: application/json; charset=utf-8\" \\"
if [ -n "$API_KEY" ]; then
  echo "  -H \"x-api-key: $API_KEY\" \\"
fi
echo "  -d '["
echo "$MOCK_PAYLOAD" | sed 's/^/    /'
echo "  ]'"
echo ""

# Execute the command
echo "Executing request..."
RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST "$ARCHIVIST_URL/dataLake/insert" \
  -H "Content-Type: application/json; charset=utf-8" \
  $([ -n "$API_KEY" ] && echo "-H \"x-api-key: $API_KEY\"") \
  -d "[$MOCK_PAYLOAD]")

HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS/d')

echo ""
echo "=== Response ==="
echo "HTTP Status: $HTTP_STATUS"
echo "Response Body:"
echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
echo ""

# Option 3: QueryBoundWitness format (requires proper signing - simplified example)
echo "--- Option 3: QueryBoundWitness format (Full implementation) ---"
echo "Endpoint: $ARCHIVIST_URL/node/$ARCHIVIST_ADDRESS"
echo "Format: [boundWitness, payloads[]]"
echo ""
echo "NOTE: QueryBoundWitness requires cryptographic signing with an account."
echo "      The boundWitness must be properly signed using the XYO SDK."
echo "      This is the preferred format as it creates bound witnesses."
echo ""
echo "Simplified structure (NOT valid without proper signing):"
cat << 'EOF'
[
  {
    "_hash": "...",  // Bound witness hash (computed from signed witness)
    "addresses": ["..."],  // Signer addresses
    "payload_hashes": ["..."],  // Hashes of payloads
    "previous_hashes": [],
    "schema": "network.xyo.boundwitness",
    "timestamp": 1704067200000
  },
  [
    {
      "schema": "network.xyo.archivist.insert.query",
      // ... query payload fields
    },
    {
      "schema": "network.xyo.chaincheck",
      // ... chaincheck payload (same as mock payload above)
    }
  ]
]
EOF

echo ""
echo "=== To use QueryBoundWitness format ==="
echo "You would need to:"
echo "1. Create an Account using XYO SDK"
echo "2. Build ArchivistInsertQuery payload"
echo "3. Build QueryBoundWitness with signer, query, and payloads"
echo "4. POST the [boundWitness, payloads[]] array"
echo ""
echo "For testing purposes, Option 2 (/dataLake/insert) is simpler and will work"
echo "but will NOT create bound witnesses (only stores payloads)."

