# SDK Upgrade Analysis: @xyo-network/sdk-js

## Current State

- **Current Version**: `^3.0.0` (in `backend/package.json`)
- **Latest Version**: `5.2.10` (published 2 days ago)
- **Version Gap**: Major version jump (3.x → 5.x)

## Issue: `previous_hashes` Set to `null`

### Problem
The SDK's `addPayloadsToChain()` method is setting `previous_hashes[0]` to `null` in blockchain transactions, even when previous transactions exist (e.g., ORD-1003 before ORD-1012).

### Diagnostic Evidence
From backend logs:
```
[DIAGNOSTIC] SDK-set previous_hashes in blockchain transaction: [ null ]
[DIAGNOSTIC] ⚠ SDK set previous_hashes[0] to null - this account may have no previous transactions, or SDK couldn't query transaction history
```

### Possible Causes

1. **Viewer Not Available**: The diagnostic section for transaction history querying may not be running, suggesting `connection.viewer` is `null` or unavailable.

2. **Browser Storage Dependency**: The SDK might use `@xyo-network/previous-hash-store-indexeddb` (IndexedDB) for tracking previous hashes, which doesn't work in Node.js server environments.

3. **Transaction History Query Failure**: The SDK may not be able to query the account's transaction history correctly, possibly due to:
   - RPC endpoint limitations
   - Timing issues (previous transaction not yet visible)
   - SDK version bugs (3.0.0 may have issues)

4. **SDK Internal Logic**: The SDK determines `previous_hashes` internally in `addPayloadsToChain()`, and we cannot override it before submission.

## Current Workaround

The driver chain logic correctly finds and stores the previous delivery hash in our database:
- ✅ Finds previous delivery: `877f0f227b33b9d4...`
- ✅ Updates stored bound witness with driver chain link
- ❌ **But the blockchain transaction itself still has `previous_hash=null`**

## SDK Version 5.2.10 Analysis

### Key Information
- **Published**: 2 days ago (very recent)
- **Protocol**: XYO Protocol 2.0 (vs 3.x for Protocol 1.0)
- **Description**: "Primary SDK for using XYO Protocol 2.0"

### Potential Benefits
1. **Better Transaction History Querying**: May have improved methods for querying account transaction history
2. **Server-Side Support**: May have better support for Node.js environments (less reliance on browser storage)
3. **Bug Fixes**: Recent updates may address `previous_hashes` determination issues

### Risks
1. **Breaking Changes**: Major version jump (3.x → 5.x) likely includes breaking changes
2. **Compatibility**: May not be compatible with other XYO packages we're using:
   - `@xyo-network/xl1-protocol-sdk` (v1.16.9)
   - `@xyo-network/boundwitness-builder` (v5.1.21)
   - `@xyo-network/payload-builder` (v5.1.21)
3. **No Release Notes**: GitHub repository has no formal releases or changelog

## Recommendations

### Immediate Actions

1. **Check Full Diagnostic Output**: Review complete backend logs to see if:
   - The "ACCOUNT TRANSACTION HISTORY DIAGNOSTIC" section ran
   - What viewer methods were available
   - Whether transaction history query found any transactions

2. **Verify Viewer Availability**: Check if `connection.viewer` is available and what methods it exposes.

3. **Test SDK Upgrade (Optional)**: If diagnostic shows viewer is unavailable or queries fail:
   - Create a test branch
   - Upgrade `@xyo-network/sdk-js` to `^5.2.10`
   - Test if transaction history querying works better
   - Verify compatibility with other XYO packages

### Long-Term Considerations

1. **SDK Limitations**: If the SDK cannot reliably determine `previous_hashes`:
   - This may be a known limitation
   - The driver chain workaround (storing in database) may be the best solution
   - The blockchain `previous_hash` may always be `null` for this use case

2. **Alternative Approaches**: Consider:
   - Waiting for SDK fixes
   - Using a different SDK method if available
   - Accepting that blockchain `previous_hash` will be `null` and relying on driver chain logic

## Next Steps

1. Review full diagnostic logs to understand why transaction history querying isn't working
2. Determine if `connection.viewer` is available and what methods it provides
3. Decide whether to test SDK upgrade based on diagnostic findings
4. Document findings and any SDK limitations discovered

