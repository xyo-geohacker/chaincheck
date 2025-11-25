# Extracting XYO Services for Integration

This guide explains how to extract the XYO Network services from ChainCheck for integration into your existing system.

## Overview

ChainCheck's XYO integration is modular and self-contained. All XYO functionality is located in:

- **Services**: `backend/src/services/xyo/`
- **Types**: `shared/types/xyo.types.ts`
- **Dependencies**: XYO SDK packages (listed below)

## Step-by-Step Extraction

### Step 1: Copy XYO Services

```bash
# From ChainCheck repository root
mkdir -p your-project/src/services/xyo
cp -r backend/src/services/xyo/* your-project/src/services/xyo/

# Copy types
mkdir -p your-project/src/types
cp shared/types/xyo.types.ts your-project/src/types/
```

### Step 2: Install Dependencies

Add to your `package.json`:

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

### Step 3: Update Imports

The XYO services use relative imports that reference ChainCheck's structure. Update imports:

**Before:**
```typescript
import { env } from '../../lib/env.js';
import { prisma } from '../../lib/prisma.js';
```

**After:**
```typescript
// Create your own config module
import { xyoConfig } from '../config/xyo.config.js';

// Remove Prisma dependencies (services don't actually need it)
// Only xl1-transaction-service.ts uses Prisma for driver chains
```

### Step 4: Create Configuration Module

Create `src/config/xyo.config.ts`:

```typescript
import dotenv from 'dotenv';

dotenv.config();

export const xyoConfig = {
  apiKey: process.env.XYO_API_KEY!,
  archivistUrl: process.env.XYO_ARCHIVIST_URL || 'https://api.archivist.xyo.network',
  divinerUrl: process.env.XYO_DIVINER_URL || 'https://api.location.diviner.xyo.network',
  chainRpcUrl: process.env.XYO_CHAIN_RPC_URL || 'https://beta.api.chain.xyo.network/rpc',
  chainId: process.env.XYO_CHAIN_ID || 'dd381fbb392c85160d8b0453e446757b12384046',
  walletMnemonic: process.env.XYO_WALLET_MNEMONIC!,
  mockMode: process.env.MOCK_XL1_TRANSACTIONS === 'true',
  archive: process.env.XYO_ARCHIVE || 'your-archive-name',
  archivistDisabled: process.env.XYO_ARCHIVIST_DISABLED === 'true',
  divinerDisabled: process.env.XYO_DIVINER_DISABLED === 'true'
};
```

### Step 5: Update Service Imports

Update each service file to use your config:

**In `xl1-transaction-service.ts`:**
```typescript
// Replace
import { env } from '../../lib/env.js';

// With
import { xyoConfig } from '../config/xyo.config.js';

// Then replace all `env.` references with `xyoConfig.`
```

### Step 6: Remove ChainCheck-Specific Dependencies

**Remove Prisma dependency** (if you don't use Prisma):

The `xl1-transaction-service.ts` uses Prisma for driver chain linking. You have two options:

**Option A: Remove driver chain feature**
- Remove `getPreviousDeliveryProofHash()` method
- Remove `updateBoundWitnessWithDriverChain()` method
- Remove Prisma import

**Option B: Adapt to your database**
- Replace Prisma queries with your ORM/database client
- Keep the driver chain functionality

### Step 7: Update Type Imports

Update type imports in service files:

**Before:**
```typescript
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - Shared types outside rootDir
import type { LocationProofDetails } from '../../../../shared/types/xyo.types.js';
```

**After:**
```typescript
import type { LocationProofDetails } from '../../types/xyo.types.js';
```

## Minimal Integration Package

### Directory Structure

```
your-project/
├── src/
│   ├── services/
│   │   └── xyo/
│   │       ├── xyo-service.ts          # Main facade
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
│   ├── types/
│   │   └── xyo.types.ts
│   └── config/
│       └── xyo.config.ts
├── package.json
└── .env
```

### Required Files

**Core Services (Required):**
- `xyo-service.ts` - Main facade
- `xl1-transaction-service.ts` - Blockchain transactions
- `xl1-wallet-manager.ts` - Wallet management
- `xl1-transaction-builder.ts` - Payload construction
- `xl1-transaction-submitter.ts` - Transaction submission
- `sdk-loader.ts` - SDK module loading

**Optional Services:**
- `archivist-service.ts` - Off-chain storage (optional)
- `diviner-service.ts` - Location verification (optional)
- `xl1-viewer-service.ts` - Blockchain reading (optional)
- `network-service.ts` - Network statistics (optional)
- `xl1-datalake-service.ts` - Data lake access (optional)
- `xl1-rpc-logger.ts` - RPC logging (optional)

## Usage Example

After extraction:

```typescript
import { XyoService } from './services/xyo/xyo-service.js';

const xyoService = new XyoService();

// Create proof
const proof = await xyoService.createLocationProofXL1({
  latitude: 37.7749,
  longitude: -122.4194,
  timestamp: Date.now(),
  deliveryId: 'delivery-123',
  driverId: 'driver-456',
  metadata: {
    orderId: 'order-789'
  }
});

console.log('Proof hash:', proof.proofHash);
console.log('XL1 Transaction:', proof.xl1TransactionHash);
```

## Dependencies to Remove

If you extract services, you can remove these ChainCheck-specific dependencies:

- `@prisma/client` (unless you use Prisma)
- Express-specific utilities (if any)
- ChainCheck-specific types

## Testing Extraction

1. **Test with mock mode:**
   ```env
   MOCK_XL1_TRANSACTIONS=true
   ```

2. **Test proof creation:**
   ```typescript
   const proof = await xyoService.createLocationProofXL1({...});
   console.log('Mock proof:', proof.proofHash);
   ```

3. **Test with real XL1:**
   ```env
   MOCK_XL1_TRANSACTIONS=false
   XYO_WALLET_MNEMONIC=your mnemonic
   ```

## Common Issues

### Issue: Missing Environment Variables

**Solution:** Ensure all required environment variables are set. Use the validation script:
```bash
npm run validate-env
```

### Issue: SDK Module Loading Errors

**Solution:** Ensure all XYO SDK packages are installed:
```bash
npm install @xyo-network/sdk-js @xyo-network/xl1-protocol-sdk ...
```

### Issue: Type Errors

**Solution:** Ensure TypeScript can resolve types:
```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

## Next Steps

1. Review [Integration Guide](./INTEGRATION_GUIDE.md) for usage examples
2. Check [Code Examples](../examples/) for integration templates
3. Test with mock mode first
4. Test with real XL1 transactions
5. Integrate into your delivery verification flow

---

**Note:** The XYO services are designed to be framework-agnostic. They can work with Express, Next.js, Fastify, or any Node.js framework.

