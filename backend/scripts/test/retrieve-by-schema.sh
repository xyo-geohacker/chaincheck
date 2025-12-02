#!/bin/bash

# Script to retrieve payloads from Archivist by schema
# This queries for all payloads with schema "network.xyo.chaincheck"
# 
# NOTE: This requires QueryBoundWitness format with proper signing
# For a simpler approach, use the backend API endpoint if available

ARCHIVIST_URL="https://beta.api.archivist.xyo.network"
ARCHIVIST_ADDRESS="e95a6c70c8848a8e8773244fb39d701f3097ef8f"
API_KEY="${XYO_API_KEY:-481bbd0c-78ee-4907-b739-512af99aa195}"

echo "=== Retrieving Payloads by Schema ==="
echo "Archivist URL: $ARCHIVIST_URL"
echo "Schema: network.xyo.chaincheck"
echo ""

echo "NOTE: Querying by schema requires QueryBoundWitness format with cryptographic signing."
echo "This cannot be done with a simple cURL command - it requires the XYO SDK."
echo ""
echo "=== Alternative: Use Backend API ==="
echo "If your backend is running, you can use:"
echo "  GET http://localhost:3001/api/payloads/{hash}"
echo ""
echo "To get the hash, you would need to:"
echo "1. Compute it using PayloadBuilder.hash(payload) from XYO SDK"
echo "2. Or query all payloads and filter by schema"
echo ""

echo "=== QueryBoundWitness Format (for reference) ==="
cat << 'EOF'
POST /node/{archivistAddress}
Body: [boundWitness, payloads[]]

Where:
- boundWitness is a signed witness with query payload
- payloads[] includes ArchivistQueryPayload with schema filter

Example query payload structure:
{
  "schema": "network.xyo.archivist.query",
  "hashes": [],  // Empty to query all
  "schemas": ["network.xyo.chaincheck"]  // Filter by schema
}

However, this requires:
1. Creating an Account using XYO SDK
2. Building QueryBoundWitness with proper signing
3. POSTing to /node/{archivistAddress}
EOF

echo ""
echo "=== Recommended Approach ==="
echo "Use the backend API endpoint which handles all this complexity:"
echo "  GET http://localhost:3001/api/payloads/{hash}"
echo ""
echo "Or use the backend's XYO service methods directly from your application."

