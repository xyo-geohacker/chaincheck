# Retrieving Posted Data from Archivist

## The Challenge

When you POST data to `/dataLake/insert`, the response is an empty array `[]`. The payload is stored, but retrieving it requires:

1. **Payload Hash**: The hash of the payload (computed using XYO SDK)
2. **QueryBoundWitness Format**: Cryptographic signing (requires XYO SDK)

## Solution Options

### Option 1: Use Backend Script (Easiest - Recommended)

Run the TypeScript script from the backend directory:

```bash
# From project root:
./retrieve-payload-using-backend.sh

# Or from backend directory:
cd backend
npm run retrieve-payload
```

This script will:
1. Compute the payload hash using the backend's XYO SDK
2. Retrieve the payload from Archivist using QueryBoundWitness

### Option 2: Use Backend API (If Backend Server is Running)

If your ChainCheck backend is running, use the built-in endpoint that handles all the complexity:

```bash
# First, compute the payload hash (requires XYO SDK or backend)
# Then retrieve:
curl -X GET "http://localhost:3001/api/payloads/{hash}" \
  -H "Content-Type: application/json"
```

**To compute the hash**, you can use the backend's XYO service or create a small Node.js script with the XYO SDK.

### Option 2: Query by Schema (Requires SDK)

Query for all payloads with schema `network.xyo.chaincheck`:

```javascript
// This requires XYO SDK - cannot be done with simple cURL
const queryPayload = {
  schema: "network.xyo.archivist.query",
  schemas: ["network.xyo.chaincheck"]
};
// Build QueryBoundWitness and POST to /node/{address}
```

### Option 3: Compute Hash and Query Directly

#### Step 1: Compute Payload Hash

The hash is computed using `PayloadBuilder.hash(payload)` from the XYO SDK. Here's a Node.js example:

```javascript
const { XyoSdkLoader } = require('./backend/src/services/xyo/sdk-loader.js');

async function computeHash(payload) {
  const { PayloadBuilder } = await XyoSdkLoader.payloadBuilder();
  const hash = await PayloadBuilder.hash(payload);
  return hash;
}

const payload = {
  "schema": "network.xyo.chaincheck",
  // ... your payload data
};

const hash = await computeHash(payload);
console.log('Payload hash:', hash);
```

#### Step 2: Retrieve Using QueryBoundWitness

Once you have the hash, you need to build a QueryBoundWitness:

```javascript
const { XyoSdkLoader } = require('./backend/src/services/xyo/sdk-loader.js');

async function retrievePayload(hash) {
  const [
    { PayloadBuilder },
    { QueryBoundWitnessBuilder },
    { ArchivistGetQuerySchema },
    { Account }
  ] = await Promise.all([
    XyoSdkLoader.payloadBuilder(),
    XyoSdkLoader.boundWitnessBuilder(),
    XyoSdkLoader.archivistModel(),
    XyoSdkLoader.account()
  ]);

  // Create account for signing
  const account = await Account.random();
  
  // Build query payload
  const queryPayload = new PayloadBuilder({ schema: ArchivistGetQuerySchema })
    .fields({ hashes: [hash] })
    .build();
  
  // Build QueryBoundWitness
  const query = await new QueryBoundWitnessBuilder()
    .signer(account)
    .query(queryPayload)
    .build();
  
  // Format: [boundWitness, payloads[]]
  const queryData = [query[0], query[1]];
  
  // POST to Archivist
  const response = await axios.post(
    `https://beta.api.archivist.xyo.network/node/e95a6c70c8848a8e8773244fb39d701f3097ef8f`,
    queryData,
    {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': 'YOUR_API_KEY'
      }
    }
  );
  
  // Response format: [boundWitness, payloads[], errors[]]
  const [, payloads] = response.data;
  return payloads.find(p => p._hash === hash);
}
```

## Quick Test: Using Backend API

If your backend is running, the easiest way is to:

1. **Compute hash** using backend service (or create a small script)
2. **Query via backend API**:

```bash
# Replace {hash} with the computed hash
curl -X GET "http://localhost:3001/api/payloads/{hash}" \
  -H "Content-Type: application/json"
```

The backend's `/api/payloads/:hash` endpoint (in `backend/src/routes/deliveries-routes.ts`) handles all the QueryBoundWitness complexity internally.

## Why `/dataLake/insert` Returns `[]`

The `/dataLake/insert` endpoint returns an empty array `[]` on success. This is the expected behavior - it indicates the payloads were inserted successfully. The actual inserted payloads are not returned in the response.

To retrieve them, you need:
- The payload hash (computed from the payload)
- QueryBoundWitness format (requires SDK signing)

## Alternative: Check Archivist Directly

If you have access to the Archivist's MongoDB database, you can query the `payloads` collection directly:

```javascript
// MongoDB query
db.payloads.find({
  "schema": "network.xyo.chaincheck",
  "data.orderId": "TEST-ORDER-001"
})
```

But for API access, QueryBoundWitness is required.

