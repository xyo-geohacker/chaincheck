#!/usr/bin/env tsx

/**
 * Test script to verify archive creation and retrieval via named archive routes
 * 
 * This script tests:
 * 1. POST to /chaincheck/block/post (archive-based route)
 * 2. POST to /chaincheck/dataLake/insert (archive-based route)
 * 3. Verify archive was created
 * 4. Retrieve data using archive-based query routes
 * 
 * Usage:
 *   cd backend
 *   npm run test-archive
 * 
 * Or:
 *   cd backend
 *   tsx scripts/test-archive-routes.ts
 */

import axios from 'axios';
import { XyoSdkLoader } from '../src/services/xyo/sdk-loader.js';
import { env } from '../src/lib/env.js';

const ARCHIVIST_URL = 'https://beta.api.archivist.xyo.network';
const ARCHIVE_NAME = 'chaincheck';
const API_KEY = env.xyoApiKey;

// Test payload
const TEST_PAYLOAD = {
  "schema": "network.xyo.chaincheck",
  "timestamp": Date.now(),
  "message": `Archive test - ${new Date().toISOString()}`,
  "data": {
    "name": "ChainCheck",
    "schema": "network.xyo.chaincheck",
    "status": "TEST",
    "orderId": `ARCHIVE-TEST-${Date.now()}`,
    "driverId": "archive-test-driver",
    "latitude": 37.7749,
    "longitude": -122.4194,
    "timestamp": new Date().toISOString(),
    "deliveryId": `archive-test-delivery-${Date.now()}`,
    "recipientName": "Archive Test Recipient",
    "destinationLat": 37.7749,
    "destinationLon": -122.4194,
    "recipientPhone": "555-9999",
    "deliveryAddress": "Archive Test Address",
    "altitude": 100.5,
    "barometricPressure": 1013.25,
    "accelerometer": {
      "x": 0.1,
      "y": 0.2,
      "z": 9.8
    },
    "xyoNfcUserRecord": null,
    "xyoNfcSerialNumber": null,
    "photoHash": "test-photo-hash-1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
    "signatureHash": "test-signature-hash-1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
  }
};

async function testArchiveBasedInsert() {
  console.log('=== Test 1: Archive-based /dataLake/insert ===\n');
  
  const endpoint = `${ARCHIVIST_URL}/${ARCHIVE_NAME}/dataLake/insert`;
  console.log(`Endpoint: ${endpoint}`);
  console.log(`Archive: ${ARCHIVE_NAME}`);
  console.log(`Payload: 1 payload with schema network.xyo.chaincheck\n`);
  
  try {
    const response = await axios.post(
      endpoint,
      [TEST_PAYLOAD],
      {
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          ...(API_KEY && { 'x-api-key': API_KEY })
        },
        validateStatus: () => true,
        timeout: 30000
      }
    );
    
    console.log(`Status: ${response.status}`);
    console.log(`Response: ${JSON.stringify(response.data, null, 2)}\n`);
    
    if (response.status === 200) {
      console.log('✓ Archive-based /dataLake/insert succeeded\n');
      return true;
    } else {
      console.log(`✗ Archive-based /dataLake/insert failed with status ${response.status}\n`);
      return false;
    }
  } catch (error: any) {
    console.error(`✗ Error: ${error.message}`);
    if (error.response) {
      console.error(`  Status: ${error.response.status}`);
      console.error(`  Data: ${JSON.stringify(error.response.data, null, 2)}`);
    }
    console.log('');
    return false;
  }
}

async function testArchiveBasedBlockPost() {
  console.log('=== Test 2: Archive-based /block/post (QueryBoundWitness) ===\n');
  
  try {
    // Build QueryBoundWitness (requires SDK)
    const [payloadBuilderModule, boundWitnessBuilderModule, archivistModelModule, accountModule] = await Promise.all([
      XyoSdkLoader.payloadBuilder(),
      XyoSdkLoader.boundWitnessBuilder(),
      XyoSdkLoader.archivistModel(),
      XyoSdkLoader.account()
    ]);

    const PayloadBuilder = payloadBuilderModule.PayloadBuilder;
    const QueryBoundWitnessBuilder = boundWitnessBuilderModule.QueryBoundWitnessBuilder;
    const ArchivistInsertQuerySchema = (archivistModelModule as any).ArchivistInsertQuerySchema;
    const Account = accountModule.Account;

    if (!Account || !PayloadBuilder || !QueryBoundWitnessBuilder || !ArchivistInsertQuerySchema) {
      console.log('✗ Required SDK modules not available\n');
      return false;
    }

    // Create account for signing
    const AccountClass = Account as any;
    const accountPromise = typeof AccountClass.random === 'function' ? AccountClass.random() : AccountClass.create();
    const account = await accountPromise;
    const signerAccount = account && typeof account.then === 'function' ? await account : account;

    // Create ArchivistInsertQuery payload
    const PayloadBuilderClass = PayloadBuilder as any;
    const insertQueryPayload = new PayloadBuilderClass({ schema: ArchivistInsertQuerySchema })
      .build();

    // Build QueryBoundWitness
    const QueryBoundWitnessBuilderClass = QueryBoundWitnessBuilder as any;
    const builder = new QueryBoundWitnessBuilderClass()
      .signer(signerAccount)
      .query(insertQueryPayload)
      .payloads([TEST_PAYLOAD]);

    const query = await builder.build();
    const queryData = [query[0], query[1]];

    const endpoint = `${ARCHIVIST_URL}/${ARCHIVE_NAME}/block/post`;
    console.log(`Endpoint: ${endpoint}`);
    console.log(`Archive: ${ARCHIVE_NAME}`);
    console.log(`Format: QueryBoundWitness [boundWitness, payloads[]]\n`);

    const response = await axios.post(
      endpoint,
      queryData,
      {
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          ...(API_KEY && { 'x-api-key': API_KEY })
        },
        validateStatus: () => true,
        timeout: 30000
      }
    );

    console.log(`Status: ${response.status}`);
    console.log(`Response: ${JSON.stringify(response.data, null, 2)}\n`);

    if (response.status === 200 && response.data) {
      console.log('✓ Archive-based /block/post succeeded\n');
      
      // Try to extract bound witness hash
      const responseData = response.data;
      if (Array.isArray(responseData) && responseData.length > 0) {
        const boundWitness = responseData[0];
        if (typeof boundWitness === 'object' && boundWitness !== null) {
          const bw = boundWitness as Record<string, unknown>;
          const hash = (bw._hash as string) || (bw.hash as string);
          if (hash) {
            console.log(`Bound Witness Hash: ${hash}\n`);
          }
        }
      }
      
      return true;
    } else {
      console.log(`✗ Archive-based /block/post failed with status ${response.status}\n`);
      return false;
    }
  } catch (error: any) {
    console.error(`✗ Error: ${error.message}`);
    if (error.response) {
      console.error(`  Status: ${error.response.status}`);
      console.error(`  Data: ${JSON.stringify(error.response.data, null, 2)}`);
    }
    console.log('');
    return false;
  }
}

async function testArchiveManifest() {
  console.log('=== Test 3: Check Archive Manifest ===\n');
  
  // Try to get archive manifest/info
  const endpoints = [
    `${ARCHIVIST_URL}/${ARCHIVE_NAME}`,
    `${ARCHIVIST_URL}/${ARCHIVE_NAME}/manifest`,
    `${ARCHIVIST_URL}/archive/${ARCHIVE_NAME}`,
    `${ARCHIVIST_URL}/archive/${ARCHIVE_NAME}/manifest`
  ];
  
  for (const endpoint of endpoints) {
    try {
      console.log(`Trying: ${endpoint}`);
      const response = await axios.get(endpoint, {
        headers: {
          'Content-Type': 'application/json',
          ...(API_KEY && { 'x-api-key': API_KEY })
        },
        validateStatus: () => true,
        timeout: 10000
      });
      
      if (response.status === 200) {
        console.log(`✓ Success! Status: ${response.status}`);
        console.log(`Response: ${JSON.stringify(response.data, null, 2)}\n`);
        return true;
      } else {
        console.log(`  Status: ${response.status}\n`);
      }
    } catch (error: any) {
      console.log(`  Error: ${error.message}\n`);
    }
  }
  
  console.log('✗ Could not retrieve archive manifest (this may be normal)\n');
  return false;
}

async function testArchiveQuery() {
  console.log('=== Test 4: Query Archive via Archive Route ===\n');
  
  try {
    // Compute payload hash
    const { PayloadBuilder } = await XyoSdkLoader.payloadBuilder();
    const PayloadBuilderClass = PayloadBuilder as any;
    const hash = await PayloadBuilderClass.hash(TEST_PAYLOAD);
    
    console.log(`Payload Hash: ${hash}`);
    console.log(`Attempting to query via archive route...\n`);
    
    // Build QueryBoundWitness for retrieval
    const [boundWitnessBuilderModule, archivistModelModule, accountModule] = await Promise.all([
      XyoSdkLoader.boundWitnessBuilder(),
      XyoSdkLoader.archivistModel(),
      XyoSdkLoader.account()
    ]);

    const QueryBoundWitnessBuilder = boundWitnessBuilderModule.QueryBoundWitnessBuilder;
    const ArchivistGetQuerySchema = (archivistModelModule as any).ArchivistGetQuerySchema;
    const Account = accountModule.Account;

    const AccountClass = Account as any;
    const accountPromise = typeof AccountClass.random === 'function' ? AccountClass.random() : AccountClass.create();
    const account = await accountPromise;
    const signerAccount = account && typeof account.then === 'function' ? await account : account;

    const PayloadBuilderClass2 = PayloadBuilder as any;
    const getQueryPayload = new PayloadBuilderClass2({ schema: ArchivistGetQuerySchema })
      .fields({ hashes: [hash] })
      .build();

    const QueryBoundWitnessBuilderClass = QueryBoundWitnessBuilder as any;
    const query = await new QueryBoundWitnessBuilderClass()
      .signer(signerAccount)
      .query(getQueryPayload)
      .build();

    const queryData = [query[0], [...query[1]]];

    // Try archive-based query endpoints
    const queryEndpoints = [
      `${ARCHIVIST_URL}/${ARCHIVE_NAME}/block/find`,
      `${ARCHIVIST_URL}/${ARCHIVE_NAME}/node/e95a6c70c8848a8e8773244fb39d701f3097ef8f`,
      `${ARCHIVIST_URL}/node/e95a6c70c8848a8e8773244fb39d701f3097ef8f`
    ];

    for (const endpoint of queryEndpoints) {
      try {
        console.log(`Trying: ${endpoint}`);
        const response = await axios.post(
          endpoint,
          queryData,
          {
            headers: {
              'Content-Type': 'application/json',
              ...(API_KEY && { 'x-api-key': API_KEY })
            },
            validateStatus: () => true,
            timeout: 30000
          }
        );

        console.log(`Status: ${response.status}`);
        
        if (response.status === 200 && response.data) {
          const responseData = response.data;
          if (Array.isArray(responseData) && responseData.length >= 2) {
            const payloads = responseData[1] as unknown[];
            const matchingPayload = payloads.find((p: unknown) => {
              if (typeof p === 'object' && p !== null) {
                const payload = p as Record<string, unknown>;
                const payloadHash = (payload._hash as string) || (payload.hash as string);
                return payloadHash?.toLowerCase() === hash.toLowerCase();
              }
              return false;
            });

            if (matchingPayload) {
              console.log(`✓ Found payload in archive!`);
              console.log(`Response: ${JSON.stringify(matchingPayload, null, 2)}\n`);
              return true;
            } else {
              console.log(`  Query succeeded but payload not found (may need indexing time)\n`);
            }
          } else {
            console.log(`  Response: ${JSON.stringify(responseData, null, 2)}\n`);
          }
        } else {
          console.log(`  Status: ${response.status}\n`);
        }
      } catch (error: any) {
        console.log(`  Error: ${error.message}\n`);
      }
    }

    console.log('✗ Could not retrieve payload via archive routes (may need indexing time)\n');
    return false;
  } catch (error: any) {
    console.error(`✗ Error: ${error.message}\n`);
    return false;
  }
}

async function main() {
  console.log('========================================');
  console.log('Archive Route Test for Production Archivist');
  console.log('========================================\n');
  console.log(`Archivist URL: ${ARCHIVIST_URL}`);
  console.log(`Archive Name: ${ARCHIVE_NAME}`);
  console.log(`API Key: ${API_KEY ? `${API_KEY.substring(0, 10)}...` : '(not set)'}`);
  console.log('\n');

  const results = {
    dataLakeInsert: false,
    blockPost: false,
    manifest: false,
    query: false
  };

  // Test 1: Archive-based /dataLake/insert
  results.dataLakeInsert = await testArchiveBasedInsert();
  
  // Wait a bit for indexing
  if (results.dataLakeInsert) {
    console.log('Waiting 5 seconds for payload indexing...\n');
    await new Promise(resolve => setTimeout(resolve, 5000));
  }

  // Test 2: Archive-based /block/post
  results.blockPost = await testArchiveBasedBlockPost();
  
  // Wait a bit more
  if (results.blockPost) {
    console.log('Waiting 5 seconds for bound witness indexing...\n');
    await new Promise(resolve => setTimeout(resolve, 5000));
  }

  // Test 3: Check archive manifest
  results.manifest = await testArchiveManifest();

  // Test 4: Query via archive route
  results.query = await testArchiveQuery();

  // Summary
  console.log('========================================');
  console.log('Test Summary');
  console.log('========================================\n');
  console.log(`Archive-based /dataLake/insert: ${results.dataLakeInsert ? '✓ PASS' : '✗ FAIL'}`);
  console.log(`Archive-based /block/post:      ${results.blockPost ? '✓ PASS' : '✗ FAIL'}`);
  console.log(`Archive manifest check:          ${results.manifest ? '✓ PASS' : '✗ FAIL (may be normal)'}`);
  console.log(`Archive-based query:             ${results.query ? '✓ PASS' : '✗ FAIL (may need more time)'}`);
  console.log('\n');

  if (results.dataLakeInsert || results.blockPost) {
    console.log('✓ Archive creation test: SUCCESS');
    console.log('  The archive route appears to be working!');
    if (!results.query) {
      console.log('  Note: Query may need more time for indexing (try again in 30 seconds)');
    }
  } else {
    console.log('✗ Archive creation test: FAILED');
    console.log('  Archive routes may not be supported or there was an error');
  }
  console.log('');
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

