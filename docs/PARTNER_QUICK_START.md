# Partner Quick Start Guide

**Get XYO Network proof-of-location working in your system in 15 minutes.**

## Prerequisites

- Node.js 18.18.0+
- Existing delivery verification system (Express, Next.js, or any Node.js framework)
- XYO API key ([Get one here](https://xyo.network))

## Quick Integration (3 Steps)

### Step 1: Copy XYO Services

```bash
# From ChainCheck repository
cp -r backend/src/services/xyo your-project/src/services/xyo
cp shared/types/xyo.types.ts your-project/src/types/
```

### Step 2: Install Dependencies

```bash
npm install @xyo-network/sdk-js@^5.2.10 \
  @xyo-network/xl1-protocol-sdk@^1.16.25 \
  @xyo-network/xl1-rpc@^1.16.25 \
  @xyo-network/boundwitness-builder@^5.2.10 \
  @xyo-network/payload-builder@^5.2.10 \
  @xyo-network/wallet@^5.2.10 \
  @xyo-network/archivist-wrapper@^5.2.10 \
  @xyo-network/api@^5.2.10 \
  @xylabs/object@^5.0.42 \
  axios dotenv
```

### Step 3: Add to Your Code

```typescript
import { XyoService } from './services/xyo/xyo-service.js';

const xyoService = new XyoService();

// In your delivery verification endpoint
const proof = await xyoService.createLocationProofXL1({
  latitude: delivery.lat,
  longitude: delivery.lon,
  timestamp: Date.now(),
  deliveryId: delivery.id,
  driverId: driver.id,
  metadata: { orderId: delivery.orderId }
});

// Store proof hash
await updateDelivery(delivery.id, {
  proofHash: proof.proofHash,
  xl1TransactionHash: proof.xl1TransactionHash
});
```

## Environment Setup

Create `.env` file:

```env
XYO_API_KEY=your_xyo_api_key
XYO_WALLET_MNEMONIC=your twelve word mnemonic phrase
XYO_ARCHIVIST_URL=https://api.archivist.xyo.network
XYO_DIVINER_URL=https://api.location.diviner.xyo.network
XYO_CHAIN_RPC_URL=https://beta.api.chain.xyo.network/rpc
XYO_CHAIN_ID=dd381fbb392c85160d8b0453e446757b12384046
MOCK_XL1_TRANSACTIONS=false
```

**For testing**, set `MOCK_XL1_TRANSACTIONS=true` (no wallet needed).

## That's It!

Your deliveries are now cryptographically verified on the XL1 blockchain.

## Next Steps

- See [Integration Guide](./INTEGRATION_GUIDE.md) for detailed instructions
- Check [Code Examples](../examples/) for framework-specific examples
- Review [Extraction Guide](./EXTRACTION_GUIDE.md) for customization

## Need Help?

- **Documentation**: [Integration Guide](./INTEGRATION_GUIDE.md)
- **Examples**: [Code Examples](../examples/)
- **Reference**: ChainCheck codebase as implementation reference

