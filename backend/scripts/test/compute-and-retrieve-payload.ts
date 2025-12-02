#!/usr/bin/env tsx

/**
 * Script to compute payload hash and retrieve from Archivist
 * 
 * Usage:
 *   cd backend
 *   npm run tsx scripts/compute-and-retrieve-payload.ts
 * 
 * Or:
 *   cd backend
 *   tsx scripts/compute-and-retrieve-payload.ts
 */

import { XyoSdkLoader } from '../src/services/xyo/sdk-loader.js';
import { ArchivistService } from '../src/services/xyo/archivist-service.js';

// Mock payload that was posted to /dataLake/insert
const MOCK_PAYLOAD = {
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
};

async function main() {
  try {
    console.log('=== Computing Payload Hash ===\n');
    
    // Load PayloadBuilder from SDK
    const { PayloadBuilder } = await XyoSdkLoader.payloadBuilder();
    const PayloadBuilderClass = PayloadBuilder as any;
    
    // Compute hash
    const hash = await PayloadBuilderClass.hash(MOCK_PAYLOAD);
    console.log('Payload Hash:', hash);
    console.log('');
    
    console.log('=== Retrieving Payload from Archivist ===\n');
    console.log('This may take a few seconds...\n');
    
    // Use ArchivistService to retrieve
    const archivistService = new ArchivistService();
    const retrievedPayload = await archivistService.getPayloadByHash(hash);
    
    if (retrievedPayload) {
      console.log('✓ Successfully retrieved payload:');
      console.log(JSON.stringify(retrievedPayload, null, 2));
      console.log('');
      console.log('=== Summary ===');
      console.log(`Hash: ${hash}`);
      console.log(`Order ID: ${(retrievedPayload as any)?.data?.orderId || 'N/A'}`);
      console.log(`Driver ID: ${(retrievedPayload as any)?.data?.driverId || 'N/A'}`);
      console.log(`Status: ${(retrievedPayload as any)?.data?.status || 'N/A'}`);
    } else {
      console.log('✗ Payload not found in Archivist');
      console.log('');
      console.log('Possible reasons:');
      console.log('  1. The payload hasn\'t been indexed yet (wait 10-30 seconds and try again)');
      console.log('  2. The hash doesn\'t match (payload structure may have changed)');
      console.log('  3. The payload was stored in a different archive');
      console.log('  4. The Archivist service is not accessible');
      console.log('');
      console.log('You can also try retrieving via the backend API:');
      console.log(`  curl -X GET "http://localhost:3001/api/payloads/${hash}"`);
    }
    
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : String(error));
    if (error instanceof Error && error.stack) {
      console.error('\nStack:', error.stack);
    }
    console.log('\n=== Alternative: Use Backend API ===');
    console.log('If the backend is running, you can use:');
    console.log('  curl -X GET "http://localhost:3001/api/payloads/{hash}"');
    console.log('\nOr use the backend\'s XYO service methods directly from your application.');
    process.exit(1);
  }
}

main();

