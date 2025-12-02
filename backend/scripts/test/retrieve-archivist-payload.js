#!/usr/bin/env node

/**
 * Script to compute payload hash and retrieve payload from Archivist
 * 
 * Usage:
 *   node retrieve-archivist-payload.js <payload-json-file>
 * 
 * Or pipe JSON directly:
 *   echo '{"schema":"network.xyo.chaincheck",...}' | node retrieve-archivist-payload.js
 */

const fs = require('fs');
const path = require('path');

// Mock payload from the test
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

async function computePayloadHash(payload) {
  // Try to use XYO SDK if available (from backend)
  try {
    // This would require importing the SDK - for now, we'll provide instructions
    console.log('NOTE: Computing payload hash requires XYO SDK.');
    console.log('The hash is computed using: PayloadBuilder.hash(payload)');
    console.log('');
    console.log('To compute the hash, you can either:');
    console.log('1. Use the backend API endpoint: GET /api/payloads/:hash (after computing hash)');
    console.log('2. Use a Node.js script with XYO SDK (see instructions below)');
    console.log('3. Query by schema using QueryBoundWitness (see retrieve-by-schema.sh)');
    console.log('');
    return null;
  } catch (error) {
    console.error('Error computing hash:', error.message);
    return null;
  }
}

function main() {
  let payload;
  
  // Try to read from file or stdin
  const args = process.argv.slice(2);
  if (args.length > 0) {
    const filePath = args[0];
    try {
      const fileContent = fs.readFileSync(filePath, 'utf8');
      payload = JSON.parse(fileContent);
    } catch (error) {
      console.error(`Error reading file ${filePath}:`, error.message);
      process.exit(1);
    }
  } else {
    // Check if stdin has data
    if (!process.stdin.isTTY) {
      let stdinData = '';
      process.stdin.setEncoding('utf8');
      process.stdin.on('data', (chunk) => {
        stdinData += chunk;
      });
      process.stdin.on('end', () => {
        try {
          payload = JSON.parse(stdinData);
          processPayload(payload);
        } catch (error) {
          console.error('Error parsing stdin JSON:', error.message);
          process.exit(1);
        }
      });
      return;
    } else {
      // Use mock payload
      payload = MOCK_PAYLOAD;
      console.log('Using mock payload (no input provided)');
    }
  }
  
  processPayload(payload);
}

function processPayload(payload) {
  console.log('=== Payload Hash Computation ===');
  console.log('');
  console.log('Payload structure:');
  console.log(JSON.stringify(payload, null, 2));
  console.log('');
  
  // The actual hash computation requires XYO SDK
  // For now, provide instructions
  console.log('=== Retrieval Options ===');
  console.log('');
  console.log('Option 1: Use Backend API (Recommended if backend is running)');
  console.log('  After computing the hash, use:');
  console.log('  GET http://localhost:3001/api/payloads/{hash}');
  console.log('  This endpoint handles QueryBoundWitness complexity internally.');
  console.log('');
  console.log('Option 2: Query by Schema (See retrieve-by-schema.sh)');
  console.log('  Query for all payloads with schema "network.xyo.chaincheck"');
  console.log('');
  console.log('Option 3: Direct QueryBoundWitness (Requires SDK)');
  console.log('  See retrieve-by-hash.sh for the QueryBoundWitness format');
  console.log('');
  
  // Show the payload for manual hash computation
  console.log('=== Payload JSON (for hash computation) ===');
  console.log(JSON.stringify(payload));
}

main();

