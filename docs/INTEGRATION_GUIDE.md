# XYO Network Integration Guide

This guide shows how to integrate XYO Network and XL1 blockchain functionality into your existing supply chain or delivery system. ChainCheck serves as a **reference implementation** demonstrating how to add cryptographic proof-of-location to any delivery verification system.

## Table of Contents

1. [Overview](#overview)
2. [Integration Approaches](#integration-approaches)
3. [Quick Start: Minimal Integration](#quick-start-minimal-integration)
4. [Full Integration Examples](#full-integration-examples)
5. [API Integration](#api-integration)
6. [Extracting XYO Services](#extracting-xyo-services)
7. [Integration Templates](#integration-templates)
8. [Best Practices](#best-practices)

## Overview

ChainCheck provides a complete reference implementation of XYO Network integration for delivery verification. The core XYO functionality is modular and can be integrated into existing systems with minimal changes.

### What You Get

- **XL1 Blockchain Integration**: Immutable proof storage on XYO's XL1 blockchain
- **Archivist Integration**: Off-chain payload storage for efficient data management
- **Diviner Integration**: Location verification queries with witness node consensus
- **Sensor Data Support**: GPS, altitude, barometric pressure, accelerometer
- **NFC Driver Verification**: Physical driver authentication via NFC cards
- **Proof Chain Linking**: Driver-specific proof chains for enhanced verification

### Core Components

The XYO integration consists of these modular services:

- **`XyoService`**: Main facade coordinating all XYO operations
- **`XL1TransactionService`**: Creates and submits XL1 blockchain transactions
- **`ArchivistService`**: Manages off-chain payload storage
- **`DivinerService`**: Performs location verification queries
- **`Xl1ViewerService`**: Reads XL1 blockchain data
- **`NetworkService`**: Retrieves XYO Network statistics

## Integration Approaches

### Approach 1: Extract XYO Services (Recommended)

Extract the XYO services from `backend/src/services/xyo/` into your existing codebase.

**Pros:**
- Full control over integration
- Minimal dependencies
- Customizable to your needs

**Cons:**
- Requires copying code
- Need to manage dependencies

### Approach 2: API Integration

Use ChainCheck's backend API as a microservice for XYO functionality.

**Pros:**
- No code changes to your system
- Easy to deploy and scale
- Automatic updates

**Cons:**
- External dependency
- Network latency
- Requires API management

### Approach 3: Standalone Package (Future)

Install XYO services as an npm package (when available).

**Pros:**
- Clean integration
- Version management
- Easy updates

**Cons:**
- Requires package publication
- Less customization

## Quick Start: Minimal Integration

### Step 1: Copy XYO Services

Copy the XYO services directory to your project:

```bash
# From ChainCheck repository
cp -r backend/src/services/xyo your-project/src/services/xyo
cp -r shared/types your-project/src/types
```

### Step 2: Install Dependencies

Add XYO SDK dependencies to your `package.json`:

```json
{
  "dependencies": {
    "@xyo-network/sdk-js": "^5.2.10",
    "@xyo-network/xl1-protocol-sdk": "^1.16.25",
    "@xyo-network/xl1-rpc": "^1.16.25",
    "@xyo-network/boundwitness-builder": "^5.2.10",
    "@xyo-network/payload-builder": "^5.2.10",
    "@xyo-network/wallet": "^5.2.10",
    "@xyo-network/archivist-wrapper": "^5.2.10",
    "@xyo-network/api": "^5.2.10",
    "@xylabs/object": "^5.0.42"
  }
}
```

### Step 3: Configure Environment

Add XYO configuration to your environment:

```env
# XYO Network Configuration
XYO_API_KEY=your_xyo_api_key
XYO_ARCHIVIST_URL=https://api.archivist.xyo.network
XYO_DIVINER_URL=https://api.location.diviner.xyo.network
XYO_CHAIN_RPC_URL=https://beta.api.chain.xyo.network/rpc
XYO_CHAIN_ID=dd381fbb392c85160d8b0453e446757b12384046
XYO_WALLET_MNEMONIC=your twelve word mnemonic phrase
MOCK_XL1_TRANSACTIONS=false
```

### Step 4: Initialize XYO Service

```typescript
import { XyoService } from './services/xyo/xyo-service.js';

const xyoService = new XyoService();
```

### Step 5: Create Location Proof

```typescript
// In your delivery verification endpoint
const proof = await xyoService.createLocationProofXL1({
  latitude: deliveryLocation.lat,
  longitude: deliveryLocation.lon,
  timestamp: Date.now(),
  altitude: sensorData?.altitude,
  barometricPressure: sensorData?.pressure,
  accelerometer: sensorData?.accelerometer,
  deliveryId: delivery.id,
  driverId: driver.id,
  metadata: {
    orderId: delivery.orderId,
    recipientName: delivery.recipientName,
    // ... your custom metadata
  }
});

// Store proof hash in your database
await db.deliveries.update({
  where: { id: delivery.id },
  data: {
    proofHash: proof.proofHash,
    xl1TransactionHash: proof.xl1TransactionHash,
    verifiedAt: new Date()
  }
});
```

That's it! Your delivery is now cryptographically verified on the XL1 blockchain.

## Full Integration Examples

### Example 1: Express.js Integration

```typescript
import express from 'express';
import { XyoService } from './services/xyo/xyo-service.js';

const app = express();
const xyoService = new XyoService();

// Your existing delivery verification endpoint
app.post('/api/deliveries/:id/verify', async (req, res) => {
  const { id } = req.params;
  const { latitude, longitude, timestamp } = req.body;

  try {
    // Your existing delivery lookup
    const delivery = await getDeliveryById(id);

    // Add XYO proof creation
    const proof = await xyoService.createLocationProofXL1({
      latitude,
      longitude,
      timestamp: timestamp || Date.now(),
      deliveryId: delivery.id,
      driverId: delivery.driverId,
      metadata: {
        orderId: delivery.orderId,
        // Your custom metadata
      }
    });

    // Update your delivery record
    await updateDelivery(id, {
      proofHash: proof.proofHash,
      xl1TransactionHash: proof.xl1TransactionHash,
      status: 'VERIFIED'
    });

    res.json({
      success: true,
      proofHash: proof.proofHash,
      xl1TransactionHash: proof.xl1TransactionHash
    });
  } catch (error) {
    res.status(500).json({ error: 'Verification failed' });
  }
});
```

### Example 2: Next.js API Route Integration

```typescript
// app/api/deliveries/[id]/verify/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { XyoService } from '@/services/xyo/xyo-service';

const xyoService = new XyoService();

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { latitude, longitude, timestamp } = await request.json();
  const deliveryId = params.id;

  try {
    // Your existing delivery logic
    const delivery = await getDelivery(deliveryId);

    // Add XYO proof
    const proof = await xyoService.createLocationProofXL1({
      latitude,
      longitude,
      timestamp: timestamp || Date.now(),
      deliveryId: delivery.id,
      driverId: delivery.driverId,
      metadata: {
        orderId: delivery.orderId,
      }
    });

    // Update delivery
    await updateDelivery(deliveryId, {
      proofHash: proof.proofHash,
      xl1TransactionHash: proof.xl1TransactionHash
    });

    return NextResponse.json({
      success: true,
      proofHash: proof.proofHash
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Verification failed' },
      { status: 500 }
    );
  }
}
```

### Example 3: Background Job Integration

```typescript
// For async processing (e.g., Bull, BullMQ, Agenda)
import { XyoService } from './services/xyo/xyo-service.js';

const xyoService = new XyoService();

async function processDeliveryVerification(job) {
  const { deliveryId, latitude, longitude, timestamp } = job.data;

  try {
    // Create XYO proof
    const proof = await xyoService.createLocationProofXL1({
      latitude,
      longitude,
      timestamp,
      deliveryId,
      driverId: job.data.driverId,
      metadata: {
        orderId: job.data.orderId,
      }
    });

    // Update delivery asynchronously
    await updateDelivery(deliveryId, {
      proofHash: proof.proofHash,
      xl1TransactionHash: proof.xl1TransactionHash,
      status: 'VERIFIED'
    });

    return { success: true, proofHash: proof.proofHash };
  } catch (error) {
    throw new Error(`XYO verification failed: ${error.message}`);
  }
}
```

## API Integration

If you prefer not to integrate XYO services directly, you can use ChainCheck's API as a microservice.

### Setup

1. Deploy ChainCheck backend (see [Production Deployment Guide](./PRODUCTION_DEPLOYMENT.md))
2. Get API endpoint URL (e.g., `https://xyo-api.yourcompany.com`)

### Integration

```typescript
import axios from 'axios';

const XYO_API_URL = process.env.XYO_API_URL;

async function verifyDeliveryWithXYO(deliveryId: string, location: {
  latitude: number;
  longitude: number;
  timestamp: number;
}) {
  const response = await axios.post(
    `${XYO_API_URL}/api/deliveries/${deliveryId}/verify`,
    {
      latitude: location.latitude,
      longitude: location.longitude,
      timestamp: location.timestamp
    },
    {
      headers: {
        'Authorization': `Bearer ${process.env.XYO_API_TOKEN}`
      }
    }
  );

  return {
    proofHash: response.data.proof.proofHash,
    xl1TransactionHash: response.data.proof.xl1TransactionHash,
    blockNumber: response.data.proof.blockNumber
  };
}
```

## Extracting XYO Services

### Directory Structure

```
your-project/
├── src/
│   ├── services/
│   │   └── xyo/              # Copy from ChainCheck
│   │       ├── xyo-service.ts
│   │       ├── xl1-transaction-service.ts
│   │       ├── archivist-service.ts
│   │       ├── diviner-service.ts
│   │       ├── xl1-viewer-service.ts
│   │       ├── network-service.ts
│   │       ├── xl1-wallet-manager.ts
│   │       ├── xl1-transaction-builder.ts
│   │       ├── xl1-transaction-submitter.ts
│   │       ├── xl1-datalake-service.ts
│   │       ├── sdk-loader.ts
│   │       └── xl1-rpc-logger.ts
│   └── types/
│       └── xyo.types.ts      # Copy from ChainCheck
```

### Required Dependencies

```json
{
  "dependencies": {
    "@xyo-network/sdk-js": "^5.2.10",
    "@xyo-network/xl1-protocol-sdk": "^1.16.25",
    "@xyo-network/xl1-rpc": "^1.16.25",
    "@xyo-network/boundwitness-builder": "^5.2.10",
    "@xyo-network/payload-builder": "^5.2.10",
    "@xyo-network/wallet": "^5.2.10",
    "@xyo-network/archivist-wrapper": "^5.2.10",
    "@xyo-network/api": "^5.2.10",
    "@xylabs/object": "^5.0.42",
    "axios": "^1.13.2",
    "dotenv": "^17.2.3"
  }
}
```

### Environment Configuration

Create a configuration module:

```typescript
// src/config/xyo.config.ts
export const xyoConfig = {
  apiKey: process.env.XYO_API_KEY!,
  archivistUrl: process.env.XYO_ARCHIVIST_URL || 'https://api.archivist.xyo.network',
  divinerUrl: process.env.XYO_DIVINER_URL || 'https://api.location.diviner.xyo.network',
  chainRpcUrl: process.env.XYO_CHAIN_RPC_URL || 'https://beta.api.chain.xyo.network/rpc',
  chainId: process.env.XYO_CHAIN_ID || 'dd381fbb392c85160d8b0453e446757b12384046',
  walletMnemonic: process.env.XYO_WALLET_MNEMONIC!,
  mockMode: process.env.MOCK_XL1_TRANSACTIONS === 'true',
  archive: process.env.XYO_ARCHIVE || 'your-archive-name'
};
```

## Integration Templates

### Template 1: Minimal Express Endpoint

```typescript
import express from 'express';
import { XyoService } from './services/xyo/xyo-service.js';

const router = express.Router();
const xyoService = new XyoService();

router.post('/verify', async (req, res) => {
  const { deliveryId, latitude, longitude, timestamp, metadata } = req.body;

  try {
    const proof = await xyoService.createLocationProofXL1({
      latitude,
      longitude,
      timestamp: timestamp || Date.now(),
      deliveryId,
      driverId: req.user.id, // Your auth system
      metadata: metadata || {}
    });

    res.json({
      success: true,
      proofHash: proof.proofHash,
      xl1TransactionHash: proof.xl1TransactionHash
    });
  } catch (error) {
    res.status(500).json({
      error: 'XYO verification failed',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;
```

### Template 2: Verification Middleware

```typescript
import { XyoService } from './services/xyo/xyo-service.js';

const xyoService = new XyoService();

export async function verifyWithXYO(
  deliveryId: string,
  location: { latitude: number; longitude: number },
  metadata?: Record<string, unknown>
) {
  const proof = await xyoService.createLocationProofXL1({
    latitude: location.latitude,
    longitude: location.longitude,
    timestamp: Date.now(),
    deliveryId,
    driverId: metadata?.driverId as string,
    metadata: metadata || {}
  });

  return {
    proofHash: proof.proofHash,
    xl1TransactionHash: proof.xl1TransactionHash,
    blockNumber: proof.blockNumber
  };
}
```

### Template 3: Proof Verification

```typescript
import { XyoService } from './services/xyo/xyo-service.js';

const xyoService = new XyoService();

export async function verifyProof(proofHash: string) {
  const result = await xyoService.verifyLocationProof(proofHash);
  
  if (!result.isValid) {
    throw new Error('Proof verification failed');
  }

  return {
    isValid: true,
    boundWitness: result.data,
    // Extract your custom data from boundWitness
  };
}
```

## Best Practices

### 1. Error Handling

Always handle XYO service errors gracefully:

```typescript
try {
  const proof = await xyoService.createLocationProofXL1(payload);
  // Success - update your database
} catch (error) {
  // Log error but don't fail delivery if XYO is optional
  logger.error('XYO verification failed', error);
  
  // Option A: Fail delivery (strict mode)
  throw new Error('Delivery verification failed');
  
  // Option B: Continue without XYO proof (lenient mode)
  // Continue with delivery verification without blockchain proof
}
```

### 2. Async Processing

For high-volume systems, process XYO verification asynchronously:

```typescript
// Queue XYO verification job
await jobQueue.add('xyo-verification', {
  deliveryId,
  location,
  metadata
});

// Update delivery status immediately
await updateDelivery(deliveryId, { status: 'VERIFYING' });

// Process job asynchronously
// On success: Update with proofHash
// On failure: Retry or mark as failed
```

### 3. Proof Storage

Store proof hashes in your database:

```sql
ALTER TABLE deliveries ADD COLUMN proof_hash VARCHAR(64);
ALTER TABLE deliveries ADD COLUMN xl1_transaction_hash VARCHAR(64);
ALTER TABLE deliveries ADD COLUMN verified_at TIMESTAMP;
```

### 4. Verification Endpoints

Expose proof verification endpoints:

```typescript
// GET /api/proofs/:proofHash
router.get('/proofs/:proofHash', async (req, res) => {
  const { proofHash } = req.params;
  const result = await xyoService.verifyLocationProof(proofHash);
  res.json(result);
});
```

### 5. Monitoring

Monitor XYO service health:

```typescript
// Health check endpoint
router.get('/health/xyo', async (req, res) => {
  try {
    // Test XYO connectivity
    const stats = await xyoService.getNetworkStatistics();
    res.json({ status: 'healthy', network: stats });
  } catch (error) {
    res.status(503).json({ status: 'unhealthy', error: error.message });
  }
});
```

## Integration Checklist

- [ ] Copy XYO services to your project
- [ ] Install XYO SDK dependencies
- [ ] Configure environment variables
- [ ] Initialize XyoService in your code
- [ ] Add proof creation to delivery verification
- [ ] Store proof hashes in database
- [ ] Add proof verification endpoints
- [ ] Implement error handling
- [ ] Add monitoring/health checks
- [ ] Test with mock mode first
- [ ] Test with real XL1 transactions
- [ ] Document integration in your codebase

## Next Steps

1. Review [ChainCheck Implementation](./DEVELOPMENT_GUIDE.md) for detailed examples
2. Check [API Documentation](./API_DOCUMENTATION.md) for API integration
3. See [Production Deployment](./PRODUCTION_DEPLOYMENT.md) for deployment options
4. Review [Code Examples](../examples/) for integration templates

---

**Need Help?** Open an issue on GitHub or refer to the ChainCheck codebase as a reference implementation.

