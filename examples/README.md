# Integration Examples

This directory contains ready-to-use code examples for integrating XYO Network functionality into your existing system.

## Examples

### 1. `integration-express-minimal.ts`
**Minimal Express.js Integration**

The absolute minimum code needed to add XYO proof-of-location to an Express.js application.

**Use Case**: Quick integration into existing Express.js APIs

**Features:**
- Single endpoint for delivery verification
- Proof verification endpoint
- Minimal dependencies

### 2. `integration-nextjs-api-route.ts`
**Next.js API Route Integration**

Shows how to integrate XYO into Next.js API routes (App Router).

**Use Case**: Next.js applications using App Router

**Features:**
- Next.js 14+ App Router compatible
- Type-safe request/response handling
- Server-side proof creation

### 3. `integration-helper-function.ts`
**Reusable Helper Functions**

Standalone helper functions that can be dropped into any codebase.

**Use Case**: Framework-agnostic integration

**Features:**
- `createXYOProof()` - Create blockchain proof
- `verifyXYOProof()` - Verify existing proof
- `getProofChain()` - Get bound witness chain (with optional max depth)
- `getXYONetworkStats()` - Network statistics

### 4. `integration-with-sensor-data.ts`
**Sensor Data Integration**

Demonstrates integration with sensor data (altitude, barometric pressure, accelerometer).

**Use Case**: Enhanced verification with sensor data

**Features:**
- GPS + altitude integration
- Barometric pressure for accurate elevation
- Accelerometer for stationary detection
- Sensor validation helpers

### 5. `integration-nfc-verification.ts`
**NFC Driver Verification**

Shows how to integrate NFC-based driver verification.

**Use Case**: Physical driver authentication

**Features:**
- NFC card scan integration
- Driver identity verification
- Cryptographic proof of physical presence

## Usage

1. **Copy the example** that matches your framework
2. **Install dependencies** (see [Integration Guide](../docs/INTEGRATION_GUIDE.md))
3. **Configure environment variables**
4. **Adapt to your codebase** (replace TODOs with your code)
5. **Test with mock mode** first (`MOCK_XL1_TRANSACTIONS=true`)

## Customization

All examples are designed to be:
- **Minimal**: Only essential code
- **Framework-agnostic**: Easy to adapt
- **Well-commented**: Clear what to customize
- **Production-ready**: Proper error handling

## Next Steps

1. Choose the example closest to your stack
2. Review [Integration Guide](../docs/INTEGRATION_GUIDE.md) for details
3. Check [Extraction Guide](../docs/EXTRACTION_GUIDE.md) for service extraction
4. Test with mock mode before production

---

**Need Help?** Open an issue or refer to ChainCheck's implementation as a reference.

