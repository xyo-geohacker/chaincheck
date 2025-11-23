# XYO Services

This directory contains refactored XYO Network services, organized by responsibility.

## Structure

### Core Services

- **`xyo.service.ts`** (main facade) - Coordinates all XYO operations
- **`sdk-loader.ts`** - Utility for safely loading XYO SDK modules

### Specialized Services

- **`archivist.service.ts`** - Archivist API interactions
  - Proof verification
  - Bound witness validation
  - Proof retrieval

- **`xl1-transaction.service.ts`** - XL1 blockchain transactions
  - Coordinates wallet, builder, and submitter
  - Handles mock mode for development

- **`xl1-wallet-manager.ts`** - Wallet and account management
  - Mnemonic generation/loading
  - Account derivation

- **`xl1-transaction-builder.ts`** - Transaction payload construction
  - On-chain payloads (hash references)
  - Off-chain payloads (delivery data)

- **`xl1-transaction-submitter.ts`** - Transaction submission and confirmation
  - RPC connection management
  - Transaction submission
  - Confirmation waiting
  - Detailed logging

- **`diviner.service.ts`** - Diviner network queries
  - Location verification queries
  - Consensus calculation
  - Mock verification for development

## Benefits of Refactoring

1. **Separation of Concerns** - Each service has a single, clear responsibility
2. **Maintainability** - Easier to find and modify specific functionality
3. **Testability** - Services can be tested independently
4. **Reusability** - Services can be used independently if needed
5. **Type Safety** - Better organization enables better typing
6. **Reduced Complexity** - Main service file reduced from 1300+ lines to ~100 lines

## Usage

The main `XyoService` class provides the same public API as before:

```typescript
const xyoService = new XyoService();

// All methods work the same as before
await xyoService.createLocationProofXL1(payload);
await xyoService.verifyLocationProof(proofHash);
await xyoService.queryLocationDiviner(lat, lon, timestamp);
```

## Future Improvements

- Add dependency injection for better testability
- Extract interfaces for better type safety
- Add unit tests for each service
- Consider extracting configuration into a separate service

