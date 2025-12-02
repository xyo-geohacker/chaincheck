#!/bin/bash

# Quick cURL test for archive-based routes
# Tests if the "chaincheck" archive can be created and accessed

ARCHIVIST_URL="https://beta.api.archivist.xyo.network"
ARCHIVE_NAME="chaincheck"
API_KEY="${XYO_API_KEY:-481bbd0c-78ee-4907-b739-512af99aa195}"

# Test payload
TEST_PAYLOAD='{
  "schema": "network.xyo.chaincheck",
  "timestamp": '$(date +%s000)',
  "message": "Archive route test - '$(date -Iseconds)'",
  "data": {
    "name": "ChainCheck",
    "schema": "network.xyo.chaincheck",
    "status": "TEST",
    "orderId": "ARCHIVE-CURL-TEST-'$(date +%s)'",
    "driverId": "archive-curl-test",
    "latitude": 37.7749,
    "longitude": -122.4194,
    "timestamp": "'$(date -Iseconds)'",
    "deliveryId": "archive-curl-test-'$(date +%s)'",
    "recipientName": "Archive Test",
    "destinationLat": 37.7749,
    "destinationLon": -122.4194,
    "recipientPhone": "555-9999",
    "deliveryAddress": "Archive Test Address",
    "altitude": 100.5,
    "barometricPressure": 1013.25,
    "accelerometer": {"x": 0.1, "y": 0.2, "z": 9.8},
    "xyoNfcUserRecord": null,
    "xyoNfcSerialNumber": null,
    "photoHash": "test-photo-hash",
    "signatureHash": "test-signature-hash"
  }
}'

echo "=========================================="
echo "Quick Archive Route Test (cURL)"
echo "=========================================="
echo ""
echo "Archivist URL: $ARCHIVIST_URL"
echo "Archive Name: $ARCHIVE_NAME"
echo ""

# Test 1: Archive-based /dataLake/insert
echo "=== Test 1: POST to /$ARCHIVE_NAME/dataLake/insert ==="
echo ""

RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST "$ARCHIVIST_URL/$ARCHIVE_NAME/dataLake/insert" \
  -H "Content-Type: application/json; charset=utf-8" \
  -H "x-api-key: $API_KEY" \
  -d "[$TEST_PAYLOAD]")

HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS/d')

echo "HTTP Status: $HTTP_STATUS"
echo "Response: $BODY"
echo ""

if [ "$HTTP_STATUS" = "200" ]; then
  echo "✓ SUCCESS: Archive-based /dataLake/insert endpoint works!"
  echo "  This indicates the '$ARCHIVE_NAME' archive can be created/accessed"
else
  echo "✗ FAILED: Status $HTTP_STATUS"
  echo "  Archive route may not be supported or there was an error"
fi

echo ""
echo "=== Test 2: Check Archive Manifest ==="
echo ""

# Try to get archive info
MANIFEST_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X GET "$ARCHIVIST_URL/$ARCHIVE_NAME" \
  -H "Content-Type: application/json" \
  -H "x-api-key: $API_KEY")

MANIFEST_STATUS=$(echo "$MANIFEST_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
MANIFEST_BODY=$(echo "$MANIFEST_RESPONSE" | sed '/HTTP_STATUS/d')

echo "HTTP Status: $MANIFEST_STATUS"
if [ "$MANIFEST_STATUS" = "200" ]; then
  echo "Response: $MANIFEST_BODY" | jq '.' 2>/dev/null || echo "$MANIFEST_BODY"
  echo ""
  echo "✓ SUCCESS: Archive manifest accessible"
else
  echo "  (Manifest endpoint may not be available - this is normal)"
fi

echo ""
echo "=========================================="
echo "Summary"
echo "=========================================="
echo ""
if [ "$HTTP_STATUS" = "200" ]; then
  echo "✓ Archive route test: PASSED"
  echo "  The '$ARCHIVE_NAME' archive route is working!"
  echo ""
  echo "Note: To retrieve the payload, you'll need to:"
  echo "  1. Compute the payload hash (requires XYO SDK)"
  echo "  2. Use QueryBoundWitness format to query"
  echo "  3. Or use the backend script: ./test-archive-production.sh"
else
  echo "✗ Archive route test: FAILED"
  echo "  Status: $HTTP_STATUS"
  echo "  The archive route may not be supported on this Archivist"
fi
echo ""

