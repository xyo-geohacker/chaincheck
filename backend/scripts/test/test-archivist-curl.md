# Testing Archivist POST with ChainCheck Data

## Quick Test Command (Simplest - /dataLake/insert)

This endpoint accepts payloads directly without QueryBoundWitness signing:

```bash
curl -X POST "https://beta.api.archivist.xyo.network/dataLake/insert" \
  -H "Content-Type: application/json; charset=utf-8" \
  -H "x-api-key: YOUR_API_KEY_HERE" \
  -d '[
    {
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
    }
  ]'
```

**Note:** Replace `YOUR_API_KEY_HERE` with your actual API key, or remove the `-H "x-api-key: ..."` line if not required.

## Production Format (QueryBoundWitness - Requires SDK Signing)

The production code uses QueryBoundWitness format which requires cryptographic signing. The format is:

```
POST /node/{archivistAddress}
Body: [boundWitness, payloads[]]
```

Where:
- `boundWitness` is a signed witness object
- `payloads[]` includes both the ArchivistInsertQuery payload and the chaincheck payload

**Archivist Module Address:** `e95a6c70c8848a8e8773244fb39d701f3097ef8f` (from `/Archivist` redirect)

**Example structure (NOT valid without proper signing):**
```json
[
  {
    "_hash": "...",
    "addresses": ["..."],
    "payload_hashes": ["...", "..."],
    "previous_hashes": [],
    "schema": "network.xyo.boundwitness",
    "timestamp": 1704067200000
  },
  [
    {
      "schema": "network.xyo.archivist.insert.query",
      // ... query fields
    },
    {
      "schema": "network.xyo.chaincheck",
      // ... chaincheck payload (same as above)
    }
  ]
]
```

## Archive-Based Endpoint (Alternative)

Production Archivist also supports archive-based routes:

```bash
curl -X POST "https://beta.api.archivist.xyo.network/chaincheck/block/post" \
  -H "Content-Type: application/json; charset=utf-8" \
  -H "x-api-key: YOUR_API_KEY_HERE" \
  -d '[boundWitness, payloads[]]'
```

This creates the archive automatically if it doesn't exist.

## Testing the /dataLake/insert Endpoint

The `/dataLake/insert` endpoint is simpler for testing because:
- ✅ No cryptographic signing required
- ✅ Accepts payloads array directly
- ✅ Works immediately

**Limitation:** This endpoint does NOT create bound witnesses, only stores payloads. For full functionality matching production code, use the QueryBoundWitness format with proper signing.

