/**
 * Service for interacting with XYO Archivist
 * Handles proof verification and validation
 */

import axios from 'axios';

import type { ProofVerificationResult } from '../../../../shared/types/xyo.types.js';
import { env } from '../../lib/env.js';
import { XyoSdkLoader } from './sdk-loader.js';
import { Xl1DataLakeService } from './xl1-datalake-service.js';

export class ArchivistService {
  private dataLakeService: Xl1DataLakeService;

  constructor() {
    this.dataLakeService = new Xl1DataLakeService();
  }

  /**
   * Insert payloads into Archivist
   * Uses QueryBoundWitness with ArchivistInsertQuerySchema (matches SDK insertQuery pattern)
   * Based on SDK AbstractArchivist.insertQuery(): sendQueryRaw(queryPayload, payloads, account)
   */
  async insertPayloads(payloads: unknown[]): Promise<{ success: boolean; inserted: number; error?: string; archivistBoundWitnessHash?: string }> {
    // Check if Archivist is disabled via feature flag
    if (env.xyoArchivistDisabled) {
      // eslint-disable-next-line no-console
      console.log('Archivist is disabled (XYO_ARCHIVIST_DISABLED=true), skipping payload insertion');
      return { success: false, inserted: 0, error: 'Archivist is disabled' };
    }

    if (!payloads || payloads.length === 0) {
      return { success: false, inserted: 0, error: 'No payloads provided' };
    }

    try {
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
        return { success: false, inserted: 0, error: 'Required SDK modules not available' };
      }

      // Create account for signing
      const AccountClass = Account as any;
      const accountPromise = typeof AccountClass.random === 'function' ? AccountClass.random() : AccountClass.create();
      const account = await accountPromise;
      const signerAccount = account && typeof account.then === 'function' ? await account : account;

      // Create ArchivistInsertQuery payload (matches SDK insertQuery pattern)
      const PayloadBuilderClass = PayloadBuilder as any;
      const insertQueryPayload = new PayloadBuilderClass({ schema: ArchivistInsertQuerySchema })
        .build();

      // Build QueryBoundWitness with the insert query and payloads
      // CRITICAL FIX: Payloads must be added to the builder BEFORE building (matches production NodeClient pattern)
      // Based on production app: NodeClient.java queryBuilder() - payloads added via .payloads() before .build()
      const QueryBoundWitnessBuilderClass = QueryBoundWitnessBuilder as any;
      const builder = new QueryBoundWitnessBuilderClass()
        .signer(signerAccount)
        .query(insertQueryPayload)
        .payloads(payloads);  // FIXED: Add payloads to builder before building

      const query = await builder.build();

      // QueryBoundWitness format: [queryBoundWitness, queryPayloads[]]
      // Payloads are already included in query[1] from the builder
      const queryData = [query[0], query[1]];

      // FIXED: POST QueryBoundWitness to archive endpoint
      // Android sample app uses: ${ARCHIVIST_URL}/Archivist (capital A)
      // Production app uses: ${ARCHIVIST_URL}/${ARCHIVE_NAME} (archive in path)
      // Try multiple endpoint patterns to handle different Archivist configurations
      const preferredArchive = env.xyoArchive || 'chaincheck';
      const fallbackArchive = 'temp';  // Production app default
      
      // Based on source code analysis of @xyo-network/express-node-routes:
      // - POST /dataLake/insert - Explicit insert endpoint (archivistMiddleware mounted at /dataLake)
      // - POST /:address - Post QueryBoundWitness to module address (postAddress handler)
      // - POST /node/:address - May redirect or route to /:address
      // 
      // Production Archivist supports archive-based routes:
      // - POST /{archive_name}/block/post - Archive-based insert (creates archive automatically)
      // - POST /{archive_name}/dataLake/insert - Archive-based dataLake insert
      // - POST /{archive_name}/node/:address - Archive-based module address
      // 
      // The archivistMiddleware.ts shows: router.post('/insert', ...) mounted at /dataLake
      // This is the CORRECT endpoint for inserting payloads into the Archivist
      const cleanArchivistUrl = env.xyoArchivistUrl.replace(/\/$/, '');
      const endpoints: Array<{ url: string; archive?: string; description: string }> = [];
      
      // PRIORITY 1: Try archive-based routes first (production Archivist pattern)
      // These routes are preferred for production Archivist as they support archive isolation
      // Archive is created automatically on first insert
      endpoints.push({ 
        url: `${cleanArchivistUrl}/${preferredArchive}/block/post`, 
        archive: preferredArchive,
        description: `/${preferredArchive}/block/post (archive-based block post - production pattern)` 
      });
      endpoints.push({ 
        url: `${cleanArchivistUrl}/${preferredArchive}/dataLake/insert`, 
        archive: preferredArchive,
        description: `/${preferredArchive}/dataLake/insert (archive-based dataLake insert)` 
      });
      
      // Step 1: Get the Archivist module address from /Archivist route
      // CRITICAL: The /Archivist route is the SINGLE SOURCE OF TRUTH for the Archivist address
      // It always resolves to the correct MongoDB Archivist for this environment
      // This ensures consistency - there is only ONE Archivist address per environment
      // This is essential for sharing the project with other developers - they will get the correct address
      // NOTE: The /Archivist endpoint redirects to the Archivist's module address (e.g., /bb0f0b19414badfbfefe2a060ec23579094a5543)
      // This is the canonical way to discover which module address to POST to for inserts
      let archivistModuleAddress: string | null = null;
      try {
        const redirectResponse = await axios.get(`${cleanArchivistUrl}/Archivist`, {
          headers: {
            ...(env.xyoApiKey && { 'x-api-key': env.xyoApiKey })
          },
          maxRedirects: 0,
          validateStatus: (status) => status >= 200 && status < 400 // Accept redirects (301, 302, etc.)
        });
        
        // Extract module address from Location header or response
        const location = redirectResponse.headers.location || redirectResponse.headers.Location;
        if (location) {
          // Location format: /bb0f0b19414badfbfefe2a060ec23579094a5543
          const match = location.match(/\/([a-f0-9]{40})/);
          if (match) {
            archivistModuleAddress = match[1];
            // eslint-disable-next-line no-console
            console.log(`✓ Found Archivist module address: ${archivistModuleAddress}`);
            // PRIMARY: POST /node/:address (QueryBoundWitness format - creates bound witness + stores payloads)
            // CRITICAL: QueryBoundWitness endpoints create BOTH bound witnesses AND store payloads
            // /dataLake/insert only stores payloads (no bound witness) - this is why bound_witnesses collection is empty
            // The Diviner relies on bound witnesses to query and understand payload relationships
            endpoints.push({ 
              url: `${cleanArchivistUrl}/node/${archivistModuleAddress}`, 
              description: `/node/${archivistModuleAddress} (QueryBoundWitness - creates bound witness + payloads)` 
            });
            // SECONDARY: POST /:address (QueryBoundWitness to module address - alternative format)
            endpoints.push({ 
              url: `${cleanArchivistUrl}/${archivistModuleAddress}`, 
              description: `/${archivistModuleAddress} (QueryBoundWitness to module address)` 
            });
            // FALLBACK: POST /dataLake/insert (only stores payloads, no bound witness - use only if QueryBoundWitness fails)
            endpoints.push({ 
              url: `${cleanArchivistUrl}/dataLake/insert`, 
              description: '/dataLake/insert (payloads only, no bound witness - fallback)' 
            });
          }
        }
      } catch (error: any) {
        // If redirect fails, check if it's a redirect response (3xx status)
        if (error.response && error.response.status >= 300 && error.response.status < 400) {
          const location = error.response.headers.location || error.response.headers.Location;
          if (location) {
            const match = location.match(/\/([a-f0-9]{40})/);
            if (match) {
              archivistModuleAddress = match[1];
              // eslint-disable-next-line no-console
              console.log(`✓ Found Archivist module address from redirect error: ${archivistModuleAddress}`);
              // PRIMARY: POST /node/:address (QueryBoundWitness format - creates bound witness + stores payloads)
              // CRITICAL: QueryBoundWitness endpoints create BOTH bound witnesses AND store payloads
              // /dataLake/insert only stores payloads (no bound witness) - this is why bound_witnesses collection is empty
              // The Diviner relies on bound witnesses to query and understand payload relationships
              endpoints.push({ 
                url: `${cleanArchivistUrl}/node/${archivistModuleAddress}`, 
                description: `/node/${archivistModuleAddress} (QueryBoundWitness - creates bound witness + payloads)` 
              });
              // SECONDARY: POST /:address (QueryBoundWitness to module address - alternative format)
              endpoints.push({ 
                url: `${cleanArchivistUrl}/${archivistModuleAddress}`, 
                description: `/${archivistModuleAddress} (QueryBoundWitness to module address)` 
              });
              // FALLBACK: POST /dataLake/insert (only stores payloads, no bound witness - use only if QueryBoundWitness fails)
              endpoints.push({ 
                url: `${cleanArchivistUrl}/dataLake/insert`, 
                description: '/dataLake/insert (payloads only, no bound witness - fallback)' 
              });
            }
          }
        }
      }
      
      // Fallback 2: /node endpoint (general node endpoint)
      endpoints.push({ 
        url: `${cleanArchivistUrl}/node`, 
        description: '/node (general node endpoint)' 
      });
      
      // Last resort: base URL
      endpoints.push({ 
        url: cleanArchivistUrl, 
        description: 'Base URL (last resort)' 
      });
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json; charset=utf-8',  // FIXED: Match SDK format
        ...(env.xyoApiKey && { 'x-api-key': env.xyoApiKey })  // Only include if set
      };

      let lastError: string | undefined;
      let lastResponse: any;

      // Try each endpoint pattern until one works
      for (const endpointConfig of endpoints) {
        const endpoint = endpointConfig.url;
        const archiveName = endpointConfig.archive || 'default';
        
        // eslint-disable-next-line no-console
        console.log('=== ARCHIVIST INSERT REQUEST ===');
        // eslint-disable-next-line no-console
        console.log('Endpoint:', endpoint);
        // eslint-disable-next-line no-console
        console.log('Pattern:', endpointConfig.description);
        // eslint-disable-next-line no-console
        console.log('Archive:', archiveName);
        // eslint-disable-next-line no-console
        console.log('Payloads count:', payloads.length);
        // eslint-disable-next-line no-console
        console.log('Payload schemas:', payloads.map((p: any) => p?.schema).filter(Boolean));
        // eslint-disable-next-line no-console
        console.log('Query Bound Witness:', JSON.stringify(query[0], null, 2));
        // eslint-disable-next-line no-console
        console.log('Query Payloads Count:', Array.isArray(query[1]) ? query[1].length : 'not an array');
        
        // Determine request body format based on endpoint
        // CRITICAL: QueryBoundWitness format creates bound witnesses (required for Diviner queries)
        // /dataLake/insert only stores payloads without bound witnesses (fallback only)
        let requestBody: unknown;
        if (endpoint.includes('/dataLake/insert')) {
          // /dataLake/insert expects: array of DATA payloads only (not the query payload, not QueryBoundWitness format)
          // WARNING: This endpoint does NOT create bound witnesses - only use as fallback
          // From archivistMiddleware.ts: const body = Array.isArray(req.body) ? req.body : [req.body]
          // It uses PayloadBuilder.hashPairs to process the body and calls archivist.insert(payloads)
          // We should send the original payloads array, not query[1] which includes the query payload
          requestBody = payloads; // Send original data payloads, not QueryBoundWitness payloads
          // eslint-disable-next-line no-console
          console.warn('⚠ Using /dataLake/insert - this will NOT create bound witnesses (bound_witnesses collection will remain empty)');
          // eslint-disable-next-line no-console
          console.log('Request format: Original data payloads array only (for /dataLake/insert)');
          // eslint-disable-next-line no-console
          console.log(`   - Sending ${Array.isArray(requestBody) ? requestBody.length : 0} data payload(s) (excluding query payload)`);
        } else {
          // QueryBoundWitness endpoints expect: [boundWitness, payloads[]]
          // This format creates BOTH bound witnesses AND stores payloads
          // The bound witness links the payloads together and enables Diviner queries
          requestBody = queryData;
          // eslint-disable-next-line no-console
          console.log('Request format: QueryBoundWitness [boundWitness, payloads[]]');
          // eslint-disable-next-line no-console
          console.log('   - This will create bound witness entries in bound_witnesses collection');
          // eslint-disable-next-line no-console
          console.log('   - Bound witnesses are required for Diviner queries to work properly');
        }
        
        if (endpoints.indexOf(endpointConfig) === 0) {
          // Only log full payload for first attempt (to avoid spam)
          // eslint-disable-next-line no-console
          console.log('Full Request Payload:', JSON.stringify(requestBody, null, 2));
        }

        try {
          const response = await axios.post(endpoint, requestBody, {
            headers,
            validateStatus: () => true,
            timeout: 30000  // 30 second timeout
          });

          // eslint-disable-next-line no-console
          console.log('=== ARCHIVIST INSERT RESPONSE ===');
          // eslint-disable-next-line no-console
          console.log('Endpoint:', endpoint);
          // eslint-disable-next-line no-console
          console.log('Status:', response.status);
          // eslint-disable-next-line no-console
          console.log('Response Data:', JSON.stringify(response.data, null, 2));
          
          // NOTE: Archivist logs show "router standardErrors" for /node/:address endpoint
          // This suggests an error is occurring but not being logged at DEBUG level
          // Even though the endpoint returns 200, data may not be persisting to MongoDB
          // The POST request is received and parsed, but then "router standardErrors" appears
          // This indicates the @xyo-network/node-app package may be rejecting the request format
          // or there's a MongoDB connection/configuration issue preventing persistence
          // Check MongoDB collections to verify data is actually stored (should have bound_witnesses and payloads collections)

          lastResponse = response;

          if (response.status === 200 && response.data) {
        const responseData = response.data as unknown;
        
        // Handle different response formats based on endpoint:
        // /dataLake/insert returns: array of inserted payloads (from archivist.insert(payloads))
        // Other endpoints return: [boundWitness, payloads[], errors[]] (QueryBoundWitness format)
        let responseBoundWitness: unknown;
        let insertedPayloads: unknown[] = [];
        let errors: unknown[] = [];
        
        if (endpoint.includes('/dataLake/insert')) {
          // /dataLake/insert returns the result from archivist.insert(payloads)
          // This is typically an array of inserted payloads or a single result object
          if (Array.isArray(responseData)) {
            insertedPayloads = responseData;
          } else if (typeof responseData === 'object' && responseData !== null) {
            // Could be a single result object or wrapped format
            if ('data' in responseData && Array.isArray((responseData as { data: unknown }).data)) {
              insertedPayloads = (responseData as { data: unknown[] }).data;
            } else {
              // Single result object - treat as success
              insertedPayloads = [responseData];
            }
          }
        } else {
          // QueryBoundWitness format: [boundWitness, payloads[], errors[]]
          // The bound witness in the response is the NEW bound witness created by the Archivist
          // This bound witness should be stored in the bound_witnesses collection
          if (Array.isArray(responseData)) {
            // Direct array format
            [responseBoundWitness, insertedPayloads, errors] = responseData as [unknown, unknown[], unknown[]];
          } else if (typeof responseData === 'object' && responseData !== null && 'data' in responseData) {
            const wrappedData = (responseData as { data: unknown }).data;
            if (Array.isArray(wrappedData)) {
              // Wrapped format: { data: [boundWitness, payloads[], errors[]] }
              [responseBoundWitness, insertedPayloads, errors] = wrappedData as [unknown, unknown[], unknown[]];
            }
          }
          
          // Log bound witness details for debugging
          if (responseBoundWitness) {
            // eslint-disable-next-line no-console
            console.log(`✓ Bound witness created in response (should be persisted to MongoDB)`);
            if (typeof responseBoundWitness === 'object' && responseBoundWitness !== null) {
              const bw = responseBoundWitness as Record<string, unknown>;
              // eslint-disable-next-line no-console
              console.log(`   - Bound witness hash: ${bw._hash || bw.hash || 'unknown'}`);
              // eslint-disable-next-line no-console
              console.log(`   - Payload hashes: ${Array.isArray(bw.payload_hashes) ? bw.payload_hashes.length : 0}`);
            }
          } else {
            // eslint-disable-next-line no-console
            console.warn(`⚠ No bound witness in QueryBoundWitness response - this may indicate a problem`);
          }
        }
        
        if (errors && Array.isArray(errors) && errors.length > 0) {
          const errorMessages = errors.map((e: unknown) => {
            if (typeof e === 'object' && e !== null && 'message' in e) {
              return (e as { message: string }).message;
            }
            return String(e);
          });
          // eslint-disable-next-line no-console
          console.warn(`⚠ Archivist insert returned errors:`, errorMessages);
          return { success: false, inserted: insertedPayloads?.length || 0, error: errorMessages.join('; ') };
        }

        const insertedCount = insertedPayloads?.length || 0;
        
        // Success requires: payloads in response array AND no errors
        // The response format is: [boundWitness, payloads[], errors[]]
        // We need payloads to be present in the second array element
        if (insertedCount > 0 && (!errors || errors.length === 0)) {
          // Success: payloads were inserted and no errors
          if (endpoint.includes('/dataLake/insert')) {
            // Using the correct /dataLake/insert endpoint with proper payload format
            // eslint-disable-next-line no-console
            console.log(`✓ Successfully inserted ${insertedCount} payload(s) into Archivist via /dataLake/insert`);
            // eslint-disable-next-line no-console
            console.log(`   - Using correct endpoint and payload format`);
            // eslint-disable-next-line no-console
            console.log(`   - Verify data is persisted in MongoDB (should have bound_witnesses and payloads collections)`);
          } else {
            // Using QueryBoundWitness endpoint - should create bound witnesses AND store payloads
            // eslint-disable-next-line no-console
            console.log(`✓ Successfully inserted ${insertedCount} payload(s) into Archivist via ${endpoint}`);
            if (responseBoundWitness) {
              // eslint-disable-next-line no-console
              console.log(`   - Bound witness created in response`);
              
              // Extract bound witness hash for Diviner queries
              // This is the hash that should be used to query the Diviner (not the XL1 transaction hash)
              // The bound witness hash must be calculated from the bound witness object itself
              let archivistBoundWitnessHash: string | undefined;
              if (typeof responseBoundWitness === 'object' && responseBoundWitness !== null) {
                const bw = responseBoundWitness as Record<string, unknown>;
                
                // Try to get hash from bound witness fields first
                archivistBoundWitnessHash = (bw._hash as string | undefined) || (bw.hash as string | undefined);
                
                // If not found, calculate hash using SDK
                if (!archivistBoundWitnessHash) {
                  try {
                    const { BoundWitnessWrapper } = await XyoSdkLoader.loadBoundWitnessWrapper();
                    // BoundWitnessWrapper.parse() creates a wrapper that can calculate the hash
                    const wrapper = (BoundWitnessWrapper as any).parse(responseBoundWitness);
                    archivistBoundWitnessHash = await wrapper.hash();
                    // eslint-disable-next-line no-console
                    console.log(`   - Calculated bound witness hash using SDK: ${archivistBoundWitnessHash}`);
                  } catch (hashError: any) {
                    // eslint-disable-next-line no-console
                    console.warn(`   ⚠ Failed to calculate bound witness hash: ${hashError.message || hashError}`);
                    // eslint-disable-next-line no-console
                    console.warn(`   ⚠ Bound witness object keys: ${Object.keys(bw).join(', ')}`);
                  }
                }
                
                if (archivistBoundWitnessHash) {
                  // eslint-disable-next-line no-console
                  console.log(`   - Archivist bound witness hash: ${archivistBoundWitnessHash}`);
                  // eslint-disable-next-line no-console
                  console.log(`   - NOTE: Use this hash (not XL1 transaction hash) for Diviner queries`);
                } else {
                  // eslint-disable-next-line no-console
                  console.warn(`   ⚠ Could not extract or calculate bound witness hash`);
                }
              }
              
              // eslint-disable-next-line no-console
              console.log(`   - Attempting to manually persist bound witness to MongoDB...`);
              
              // WORKAROUND: MongoDBArchivist.query() creates bound witnesses but doesn't persist them
              // We need to manually insert the bound witness using the insert endpoint
              // The insertHandler uses validByType() which can handle bound witnesses
              try {
                const archivistBaseUrl = env.xyoArchivistUrl || 'http://localhost:8888';
                const cleanArchivistUrl = archivistBaseUrl.replace(/\/$/, '');
                const boundWitnessInsertUrl = `${cleanArchivistUrl}/dataLake/insert`;
                
                // Insert the bound witness using /dataLake/insert endpoint
                // This calls insertHandler which uses validByType() to separate bound witnesses from payloads
                const boundWitnessResponse = await axios.post(
                  boundWitnessInsertUrl,
                  [responseBoundWitness], // Send bound witness as array (insertHandler expects array)
                  {
                    headers: { 'Content-Type': 'application/json' },
                    timeout: 10000,
                  }
                );
                
                if (boundWitnessResponse.status === 200) {
                  // eslint-disable-next-line no-console
                  console.log(`   ✓ Bound witness successfully persisted to MongoDB bound_witnesses collection`);
                } else {
                  // eslint-disable-next-line no-console
                  console.warn(`   ⚠ Bound witness insert returned status ${boundWitnessResponse.status}`);
                }
              } catch (boundWitnessError: any) {
                // eslint-disable-next-line no-console
                console.warn(`   ⚠ Failed to persist bound witness: ${boundWitnessError.message || boundWitnessError}`);
                // eslint-disable-next-line no-console
                console.warn(`   ⚠ This may cause Diviner queries to fail - bound_witnesses collection may remain empty`);
              }
              
              // Return the Archivist bound witness hash so it can be used for Diviner queries
              return { success: true, inserted: insertedCount, archivistBoundWitnessHash };
            } else {
              // eslint-disable-next-line no-console
              console.warn(`⚠ No bound witness in response - bound_witnesses collection may remain empty`);
            }
          }
          return { success: true, inserted: insertedCount };
        } else if (insertedCount > 0 && errors && errors.length > 0) {
          // Payloads were inserted but there were also errors - still consider success
          // eslint-disable-next-line no-console
          console.log(`✓ Successfully inserted ${insertedCount} payload(s) into Archivist (with warnings)`);
          // eslint-disable-next-line no-console
          console.warn(`⚠ WARNING: Verify data is actually persisted in MongoDB - endpoint may return success without persisting`);
          return { success: true, inserted: insertedCount };
        } else if (insertedCount === 0 && responseBoundWitness && (!errors || errors.length === 0)) {
          // No payloads in response but got bound witness without errors
          // This might indicate payloads were stored but not returned in response
          // eslint-disable-next-line no-console
          console.warn(`⚠ Archivist returned bound witness but no payloads in response - payloads may have been stored`);
          // eslint-disable-next-line no-console
          console.warn(`⚠ WARNING: Verify data is actually persisted in MongoDB - endpoint may return success without persisting`);
          return { success: true, inserted: payloads.length };
        } else {
          // No payloads inserted and errors present, or unexpected response format
          // eslint-disable-next-line no-console
          console.warn(`⚠ Archivist returned success but no payloads in response`);
          return { success: false, inserted: 0, error: 'No payloads in response' };
        }
        } else if (response.status === 404) {
          // Endpoint/archive doesn't exist - try next endpoint pattern
          const errorMessage = response.data?.message || response.data?.error?.message || 'Module not found';
          // eslint-disable-next-line no-console
          console.warn(`⚠ Endpoint failed (404): ${endpointConfig.description} - ${endpoints.length > endpoints.indexOf(endpointConfig) + 1 ? 'trying next pattern...' : 'no more patterns to try'}`);
          lastError = errorMessage;
          
          // Try next endpoint if available
          if (endpoints.indexOf(endpointConfig) < endpoints.length - 1) {
            continue;
          }
        } else {
          // Other error - log and try next endpoint if available
          const errorMessage = response.data?.message || response.data?.error?.message || response.statusText || `HTTP ${response.status}`;
          // eslint-disable-next-line no-console
          console.error(`✗ Archivist insert returned status ${response.status}: ${errorMessage}`);
          lastError = errorMessage;
          
          // Try next endpoint if available
          if (endpoints.indexOf(endpointConfig) < endpoints.length - 1) {
            continue;
          }
        }
        } catch (error) {
          // Network error - try next endpoint if available
          const errorMessage = error instanceof Error ? error.message : String(error);
          // eslint-disable-next-line no-console
          console.error(`✗ Archivist insert request failed for ${endpointConfig.description}:`, errorMessage);
          lastError = errorMessage;
          
          // Try next endpoint if available
          if (endpoints.indexOf(endpointConfig) < endpoints.length - 1) {
            continue;
          }
        }
      }

      // All endpoint attempts failed
      const triedPatterns = endpoints.map(e => e.description).join(', ');
      const finalError = lastError || (lastResponse ? `HTTP ${lastResponse.status}` : 'All endpoint attempts failed');
      // eslint-disable-next-line no-console
      console.error(`✗ Archivist insert failed for all endpoint patterns (tried: ${triedPatterns}): ${finalError}`);
      return { success: false, inserted: 0, error: finalError };

    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Archivist insert error:', error);
      return {
        success: false,
        inserted: 0,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Verify a location proof by retrieving it from Archivist
   * NOTE: For XL1 transactions, this is now a fallback only.
   * XL1 transactions should be read directly from XL1 blockchain via viewer/RPC.
   * This method is kept for non-XL1 bound witnesses or as a fallback.
   * 
   * Now attempts to use Data Lake RPC interface first, then falls back to direct HTTP calls.
   */
  async verifyLocationProof(proofHash: string): Promise<ProofVerificationResult> {
    // Check if Archivist is disabled via feature flag
    if (env.xyoArchivistDisabled) {
      // eslint-disable-next-line no-console
      console.log('Archivist is disabled (XYO_ARCHIVIST_DISABLED=true), returning invalid result');
      return {
        isValid: false,
        data: null
      };
    }

    try {
      // First, try Data Lake RPC interface (connection.storage)
      const dataLakeResult = await this.dataLakeService.getPayloadFromDataLake(proofHash);
      
      if (dataLakeResult) {
        return {
          isValid: true,
          data: dataLakeResult
        };
      } else {
        // eslint-disable-next-line no-console
        console.log('⚠ Data Lake RPC interface did not return payload');
        // eslint-disable-next-line no-console
        console.log('Note: Direct HTTP calls always return 404 (not found), so skipping fallback');
        // eslint-disable-next-line no-console
        console.log('Note: Retry logic with delays is handled by Data Lake service map wrapper');
      }

      // Skip direct HTTP fallback calls - they always return 404 (payload not found)
      // The Data Lake service map wrapper already has retry logic with delays to handle propagation
      return {
        isValid: false,
        data: null
      };
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to verify proof', error);
      return {
        isValid: false,
        data: null
      };
    }
  }

  /**
   * Get payload from Archivist by payload hash
   * Used for tamper detection - fetches current payload state from Archivist
   * Uses the same method as xl1-transaction-service.ts which successfully retrieves payloads
   */
  async getPayloadByHash(payloadHash: string): Promise<unknown | null> {
    // Check if Archivist is disabled via feature flag
    if (env.xyoArchivistDisabled) {
      // eslint-disable-next-line no-console
      console.log('Archivist is disabled (XYO_ARCHIVIST_DISABLED=true), skipping payload retrieval');
      return null;
    }

    try {
      // eslint-disable-next-line no-console
      console.log(`[getPayloadByHash] Fetching payload with hash: ${payloadHash}`);
      
      // Use verifyLocationProof with the payload hash (same as xl1-transaction-service.ts line 204)
      // This method successfully retrieves payloads after insertion
      // Note: verifyLocationProof calls getPayloadFromDataLake which uses QueryBoundWitness
      const archivistResult = await this.verifyLocationProof(payloadHash);
      
      // eslint-disable-next-line no-console
      console.log(`[getPayloadByHash] verifyLocationProof result:`, {
        isValid: archivistResult.isValid,
        hasData: !!archivistResult.data,
        dataType: archivistResult.data ? typeof archivistResult.data : 'null',
        isArray: Array.isArray(archivistResult.data)
      });
      
      if (archivistResult.isValid && archivistResult.data) {
        // Extract the actual payload from the response (same extraction logic as xl1-transaction-service.ts)
        const responseData = archivistResult.data;
        let extractedPayload: unknown = null;
        
        // Try to extract payload from response structure
        if (typeof responseData === 'object' && responseData !== null) {
          const data = responseData as Record<string, unknown>;
          
          // Check if it's a payload object with schema
          if ('schema' in data && data.schema === 'network.xyo.chaincheck') {
            extractedPayload = data;
            // eslint-disable-next-line no-console
            console.log(`[getPayloadByHash] Found payload directly in response data`);
          } else if ('data' in data && Array.isArray(data.data)) {
            // Response might be wrapped: { data: [payloads...] }
            const payloads = data.data as unknown[];
            // eslint-disable-next-line no-console
            console.log(`[getPayloadByHash] Response has data array with ${payloads.length} payload(s)`);
            extractedPayload = payloads.find((p: unknown) => {
              if (typeof p === 'object' && p !== null) {
                const payload = p as Record<string, unknown>;
                return payload.schema === 'network.xyo.chaincheck';
              }
              return false;
            });
            if (extractedPayload) {
              // eslint-disable-next-line no-console
              console.log(`[getPayloadByHash] Found chaincheck payload in data array`);
            }
          } else {
            // eslint-disable-next-line no-console
            console.log(`[getPayloadByHash] Response data structure:`, {
              keys: Object.keys(data),
              hasSchema: 'schema' in data,
              schema: data.schema,
              hasData: 'data' in data
            });
          }
        }
        
        if (extractedPayload) {
          // eslint-disable-next-line no-console
          console.log('✓ Successfully extracted chaincheck payload from Archivist response');
          return extractedPayload;
        } else {
          // eslint-disable-next-line no-console
          console.warn('⚠ Archivist response does not contain chaincheck payload');
          // eslint-disable-next-line no-console
          console.warn('Response data:', JSON.stringify(responseData, null, 2).substring(0, 500));
          return null;
        }
      } else {
        // eslint-disable-next-line no-console
        console.warn('✗ Off-chain payload not available in Archivist');
        // eslint-disable-next-line no-console
        console.warn('verifyLocationProof returned:', {
          isValid: archivistResult.isValid,
          hasData: !!archivistResult.data
        });
        return null;
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to get payload by hash:', error);
      if (error instanceof Error) {
        // eslint-disable-next-line no-console
        console.error('Error stack:', error.stack);
      }
      return null;
    }
  }

  /**
   * Try retrieving proof using simple GET endpoints
   */
  private async tryGetEndpoints(proofHash: string): Promise<ProofVerificationResult | null> {
    const endpoints = [
      `${env.xyoArchivistUrl}/get/${proofHash}`,
      `${env.xyoArchivistUrl}/archivist/get/${proofHash}`,
      `${env.xyoArchivistUrl}/api/v1/huri/${proofHash}/tuple`,
      `${env.xyoArchivistUrl}/api/v1/huri/${proofHash}`,
      `${env.xyoArchivistUrl}/huri/${proofHash}/tuple`,
      `${env.xyoArchivistUrl}/huri/${proofHash}`
    ];

    for (const endpoint of endpoints) {
      try {
        // eslint-disable-next-line no-console
        console.log('=== ARCHIVIST GET REQUEST ===');
        // eslint-disable-next-line no-console
        console.log('URL:', endpoint);
        // eslint-disable-next-line no-console
        console.log('Hash:', proofHash);
        // eslint-disable-next-line no-console
        console.log('Headers:', {
          'Content-Type': 'application/json',
          'x-api-key': env.xyoApiKey ? '***' : '(not set)',
          'Accept': 'application/json'
        });

        const response = await axios.get(endpoint, {
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': env.xyoApiKey,
            'Accept': 'application/json'
          },
          validateStatus: () => true
        });

        // eslint-disable-next-line no-console
        console.log('=== ARCHIVIST GET RESPONSE ===');
        // eslint-disable-next-line no-console
        console.log('Status:', response.status);
        // eslint-disable-next-line no-console
        console.log('Response Data:', JSON.stringify(response.data, null, 2));

        if (response.status === 200 && response.data) {
          // eslint-disable-next-line no-console
          console.log(`✓ Successfully retrieved bound witness from ${endpoint}`);
          return {
            isValid: true,
            data: response.data
          };
        } else {
          // eslint-disable-next-line no-console
          console.log(`✗ Endpoint ${endpoint} returned status ${response.status}, trying next...`);
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.log(`✗ Endpoint ${endpoint} failed:`, error instanceof Error ? error.message : String(error));
        continue; // Try next endpoint
      }
    }

    // eslint-disable-next-line no-console
    console.log('✗ All Archivist GET endpoints failed for hash:', proofHash);
    return null;
  }

  /**
   * Try retrieving proof using QueryBoundWitness
   */
  private async tryQueryBoundWitness(proofHash: string): Promise<ProofVerificationResult> {
    const [payloadBuilderModule, boundWitnessBuilderModule, archivistModelModule, accountModule] = await Promise.all([
      XyoSdkLoader.payloadBuilder(),
      XyoSdkLoader.boundWitnessBuilder(),
      XyoSdkLoader.archivistModel(),
      XyoSdkLoader.account()
    ]);

    const PayloadBuilder = payloadBuilderModule.PayloadBuilder;
    const QueryBoundWitnessBuilder = boundWitnessBuilderModule.QueryBoundWitnessBuilder;
    const ArchivistGetQuerySchema = archivistModelModule.ArchivistGetQuerySchema;
    const Account = accountModule.Account;

    if (!Account || !PayloadBuilder || !QueryBoundWitnessBuilder || !ArchivistGetQuerySchema) {
      return {
        isValid: false,
        data: null
      };
    }

    // Create account
    const AccountClass = Account as any;
    const accountPromise = typeof AccountClass.random === 'function' ? AccountClass.random() : AccountClass.create();
    const account = await accountPromise;
    const signerAccount = account && typeof account.then === 'function' ? await account : account;

    // Create query payload
    const PayloadBuilderClass = PayloadBuilder as any;
    const getQueryPayload = new PayloadBuilderClass({ schema: ArchivistGetQuerySchema })
      .fields({ hashes: [proofHash] })
      .build();

    // Build query
    const QueryBoundWitnessBuilderClass = QueryBoundWitnessBuilder as any;
    const query = await new QueryBoundWitnessBuilderClass()
      .signer(signerAccount)
      .query(getQueryPayload)
      .build();

    const queryData = [query[0], [...query[1]]];

    // FIXED: Try multiple endpoint patterns (same as insertPayloads)
    // Production Archivist supports archive-based routes for querying:
    // - POST /{archive_name}/block/find - Archive-based query
    // - POST /{archive_name}/node/:address - Archive-based module address query
    // Local Archivist uses module addresses in the path
    // /Archivist redirects to the Archivist's module address (e.g., /bb0f0b19414badfbfefe2a060ec23579094a5543)
    // We need to POST QueryBoundWitness directly to the module address, not the redirect endpoint
    const preferredArchive = env.xyoArchive || 'chaincheck';
    const fallbackArchive = 'temp';  // Production app default
    const cleanArchivistUrl = env.xyoArchivistUrl.replace(/\/$/, '');
    
    // PRIORITY 1: Try archive-based routes first (production Archivist pattern)
    // These routes are preferred for production Archivist as they support archive isolation
    const endpoints: Array<{ url: string; archive?: string; description: string }> = [];
    endpoints.push({ 
      url: `${cleanArchivistUrl}/${preferredArchive}/block/find`, 
      archive: preferredArchive,
      description: `/${preferredArchive}/block/find (archive-based query - production pattern)` 
    });
    endpoints.push({ 
      url: `${cleanArchivistUrl}/${preferredArchive}/node`, 
      archive: preferredArchive,
      description: `/${preferredArchive}/node (archive-based node query)` 
    });
    
    // Try to get the Archivist module address from /Archivist redirect
    let archivistModuleAddress: string | null = null;
    try {
      const redirectResponse = await axios.get(`${cleanArchivistUrl}/Archivist`, {
        headers: {
          ...(env.xyoApiKey && { 'x-api-key': env.xyoApiKey })
        },
        maxRedirects: 0,
        validateStatus: (status) => status >= 200 && status < 400 // Accept redirects
      });
      
      const location = redirectResponse.headers.location || redirectResponse.headers.Location;
      if (location) {
        const match = location.match(/\/([a-f0-9]{40})/);
        if (match) {
          archivistModuleAddress = match[1];
          // Also try archive-based routes with module address
          endpoints.push({ 
            url: `${cleanArchivistUrl}/${preferredArchive}/node/${archivistModuleAddress}`, 
            archive: preferredArchive,
            description: `/${preferredArchive}/node/${archivistModuleAddress} (archive-based module address)` 
          });
        }
      }
    } catch (error: any) {
      // If redirect fails, check if it's a redirect response (3xx status)
      if (error.response && error.response.status >= 300 && error.response.status < 400) {
        const location = error.response.headers.location || error.response.headers.Location;
        if (location) {
          const match = location.match(/\/([a-f0-9]{40})/);
          if (match) {
            archivistModuleAddress = match[1];
            // Also try archive-based routes with module address
            endpoints.push({ 
              url: `${cleanArchivistUrl}/${preferredArchive}/node/${archivistModuleAddress}`, 
              archive: preferredArchive,
              description: `/${preferredArchive}/node/${archivistModuleAddress} (archive-based module address)` 
            });
          }
        }
      }
    }
      
    // Build list of endpoints to try (in order of preference)
    // Based on DEBUG logs and testing:
    // - POST /insert returns 404 "Module not found" - NOT a valid endpoint
    // - POST /node/:address returns 200 and shows payloads in response - WORKING ENDPOINT
    // - POST /:address (under /dataLake router) - may also work
    // Primary: POST /node/:address (this is the working endpoint based on logs)
    if (archivistModuleAddress) {
      endpoints.push({ 
        url: `${cleanArchivistUrl}/node/${archivistModuleAddress}`, 
        description: `/node/${archivistModuleAddress} (primary - module address endpoint)` 
      });
      // Also try direct address endpoint (under /dataLake router)
      endpoints.push({ 
        url: `${cleanArchivistUrl}/${archivistModuleAddress}`, 
        description: `/${archivistModuleAddress} (direct module address)` 
      });
    }
    
    // Fallback: /node endpoint (general node endpoint)
    endpoints.push({ 
      url: `${cleanArchivistUrl}/node`, 
      description: '/node (general node endpoint)' 
    });
    
    // Last resort: base URL
    endpoints.push({ 
      url: cleanArchivistUrl, 
      description: 'Base URL (last resort)' 
    });

    const headers: Record<string, string> = {
      'Content-Type': 'application/json; charset=utf-8',  // FIXED: Match SDK format
      ...(env.xyoApiKey && { 'x-api-key': env.xyoApiKey })  // Only include if set
    };

    let lastError: string | undefined;
    let lastResponse: any;

    // Try each endpoint pattern until one works
    for (const endpointConfig of endpoints) {
      const endpoint = endpointConfig.url;
      const archiveName = endpointConfig.archive || 'default';

      // eslint-disable-next-line no-console
      console.log('=== ARCHIVIST QUERYBOUNDWITNESS REQUEST ===');
      // eslint-disable-next-line no-console
      console.log('Endpoint:', endpoint);
      // eslint-disable-next-line no-console
      console.log('Pattern:', endpointConfig.description);
      // eslint-disable-next-line no-console
      console.log('Hash:', proofHash);
      // eslint-disable-next-line no-console
      console.log('Archive:', archiveName);
      
      if (endpoints.indexOf(endpointConfig) === 0) {
        // Only log full payload for first attempt (to avoid spam)
        // eslint-disable-next-line no-console
        console.log('Request Payload:', JSON.stringify(queryData, null, 2));
      }
      
      // eslint-disable-next-line no-console
      console.log('Headers:', {
        ...headers,
        'x-api-key': headers['x-api-key'] ? '***' : '(not set)'
      });

      try {
        const response = await axios.post(endpoint, queryData, {
          headers,
          validateStatus: () => true,
          timeout: 30000  // 30 second timeout
        });
        
        lastResponse = response;

      // eslint-disable-next-line no-console
      console.log('=== ARCHIVIST QUERYBOUNDWITNESS RESPONSE ===');
      // eslint-disable-next-line no-console
      console.log('Endpoint:', endpoint);
      // eslint-disable-next-line no-console
      console.log('Status:', response.status);
      // eslint-disable-next-line no-console
      console.log('Response Data:', JSON.stringify(response.data, null, 2));

      if (response.status === 200 && response.data) {
        // Archivist QueryBoundWitness response structure: [boundWitness, payloads[], errors[]]
        // Handle both direct array format and wrapped format: { data: [boundWitness, payloads[], errors[]] }
        let responseBoundWitness: unknown;
        let payloads: unknown[] = [];
        let errors: unknown[] = [];
        
        const responseData = response.data as unknown;
        
        if (Array.isArray(responseData)) {
          // Direct array format: [boundWitness, payloads[], errors[]]
          [responseBoundWitness, payloads, errors] = responseData as [unknown, unknown[], unknown[]];
        } else if (typeof responseData === 'object' && responseData !== null && 'data' in responseData) {
          // Wrapped format: { data: [boundWitness, payloads[], errors[]] }
          const wrappedData = (responseData as { data: unknown }).data;
          if (Array.isArray(wrappedData)) {
            [responseBoundWitness, payloads, errors] = wrappedData as [unknown, unknown[], unknown[]];
          }
        }
        
        if (responseBoundWitness || (Array.isArray(payloads) && payloads.length > 0)) {
            
            // eslint-disable-next-line no-console
            console.log('Response structure analysis:');
            // eslint-disable-next-line no-console
            console.log('- Bound witness:', responseBoundWitness ? 'present' : 'missing');
            // eslint-disable-next-line no-console
            console.log('- Payloads array length:', Array.isArray(payloads) ? payloads.length : 'not an array');
            // eslint-disable-next-line no-console
            console.log('- Errors array length:', Array.isArray(errors) ? errors.length : 'not an array');
            
            // If we're querying for a payload hash, check if the payloads array contains our payload
            if (Array.isArray(payloads) && payloads.length > 0) {
              // Look for the payload with matching hash
              const requestedHash = proofHash.toLowerCase();
              const matchingPayload = payloads.find((p: unknown) => {
                if (typeof p === 'object' && p !== null) {
                  const payload = p as Record<string, unknown>;
                  // Check if this payload has a hash that matches
                  if ('_hash' in payload) {
                    return String(payload._hash).toLowerCase() === requestedHash;
                  }
                  if ('hash' in payload) {
                    return String(payload.hash).toLowerCase() === requestedHash;
                  }
                }
                return false;
              });
              
              if (matchingPayload) {
                // eslint-disable-next-line no-console
                console.log(`✓ Found matching payload in payloads array`);
                return {
                  isValid: true,
                  data: matchingPayload
                };
              }
            }
            
            // Check for errors
            if (Array.isArray(errors) && errors.length > 0) {
              const errorMessages = errors.map((e: unknown) => {
                if (typeof e === 'object' && e !== null && 'message' in e) {
                  return (e as { message: string }).message;
                }
                return String(e);
              });
              // eslint-disable-next-line no-console
              console.log('Errors in response:', errorMessages);
            }
            
            // Fallback: return bound witness if available (even if payloads are empty)
            // This might be a different bound witness than the one containing our payload
            const hasErrorOnly = this.isErrorOnlyResponse(response.data);
            if (!hasErrorOnly) {
              const boundWitnessData = this.extractBoundWitnessData(response.data);
              if (boundWitnessData) {
                // eslint-disable-next-line no-console
                console.log(`⚠ Retrieved bound witness from ${endpoint}, but payloads array is empty`);
                // eslint-disable-next-line no-console
                console.log('This may indicate the payload is not yet indexed or is in a different archive');
                return {
                  isValid: true,
                  data: boundWitnessData
                };
              } else {
                // eslint-disable-next-line no-console
                console.log(`✗ Could not extract bound witness data from ${endpoint}`);
              }
            } else {
              // eslint-disable-next-line no-console
              console.log(`✗ Endpoint ${endpoint} returned error-only response`);
            }
          } else {
            // eslint-disable-next-line no-console
            console.log(`✗ Unexpected response structure from ${endpoint}`);
          }
        } else if (response.status === 404) {
          // Endpoint/archive doesn't exist - try next endpoint pattern
          const errorMessage = response.data?.message || response.data?.error?.message || 'Module not found';
          // eslint-disable-next-line no-console
          console.warn(`⚠ Endpoint failed (404): ${endpointConfig.description} - ${endpoints.length > endpoints.indexOf(endpointConfig) + 1 ? 'trying next pattern...' : 'no more patterns to try'}`);
          lastError = errorMessage;
          
          // Try next endpoint if available
          if (endpoints.indexOf(endpointConfig) < endpoints.length - 1) {
            continue;
          }
        } else {
          // Other error - log and try next endpoint if available
          // eslint-disable-next-line no-console
          console.log(`✗ Endpoint ${endpoint} returned status ${response.status}`);
          lastError = `HTTP ${response.status}`;
          
          // Try next endpoint if available
          if (endpoints.indexOf(endpointConfig) < endpoints.length - 1) {
            continue;
          }
        }
      } catch (error) {
        // Network error - try next endpoint if available
        const errorMessage = error instanceof Error ? error.message : String(error);
        // eslint-disable-next-line no-console
        console.log(`✗ Endpoint ${endpoint} failed:`, errorMessage);
        lastError = errorMessage;
        
        // Try next endpoint if available
        if (endpoints.indexOf(endpointConfig) < endpoints.length - 1) {
          continue;
        }
      }
    }

    // All endpoint attempts failed
    const triedPatterns = endpoints.map(e => e.description).join(', ');
    const finalError = lastError || (lastResponse ? `HTTP ${lastResponse.status}` : 'All endpoint attempts failed');
    // eslint-disable-next-line no-console
    console.log(`✗ Archivist QueryBoundWitness query failed for hash ${proofHash} (tried patterns: ${triedPatterns}): ${finalError}`);
    return {
      isValid: false,
      data: null
    };
  }

  /**
   * Check if response contains only error payloads
   */
  private isErrorOnlyResponse(data: unknown): boolean {
    if (Array.isArray(data)) {
      return data.every((item: unknown) => 
        typeof item === 'object' && 
        item !== null && 
        'schema' in item && 
        (item as { schema: string }).schema === 'network.xyo.error.module'
      );
    }
    
    return typeof data === 'object' && 
           data !== null && 
           'schema' in data && 
           (data as { schema: string }).schema === 'network.xyo.error.module';
  }

  /**
   * Extract bound witness data from response, filtering out errors
   */
  private extractBoundWitnessData(responseData: unknown): unknown {
    if (Array.isArray(responseData)) {
      const nonErrorPayloads = responseData.filter(
        (item: unknown) => 
          typeof item === 'object' && 
          item !== null && 
          (!('schema' in item) || (item as { schema: string }).schema !== 'network.xyo.error.module')
      );
      return nonErrorPayloads.length > 0 ? nonErrorPayloads : responseData;
    }
    
    if (typeof responseData === 'object' && responseData !== null) {
      if ('schema' in responseData && (responseData as { schema: string }).schema === 'network.xyo.error.module') {
        return null;
      }
      return responseData;
    }
    
    return responseData;
  }

  /**
   * Validate a bound witness structure
   */
  async validateBoundWitness(proofHash: string): Promise<{ isValid: boolean; errors: string[] }> {
    // Check if Archivist is disabled via feature flag
    if (env.xyoArchivistDisabled) {
      // eslint-disable-next-line no-console
      console.log('Archivist is disabled (XYO_ARCHIVIST_DISABLED=true), skipping bound witness validation');
      return { isValid: false, errors: ['Archivist is disabled'] };
    }

    try {
      const verificationResult = await this.verifyLocationProof(proofHash);
      
      if (!verificationResult.isValid || !verificationResult.data) {
        return {
          isValid: false,
          errors: ['Could not retrieve bound witness from Archivist']
        };
      }

      const boundWitness = this.extractBoundWitness(verificationResult.data);
      if (!boundWitness) {
        return {
          isValid: false,
          errors: ['Could not extract bound witness from response']
        };
      }

      // Try using BoundWitnessValidator if available
      const validatorModule = await XyoSdkLoader.boundWitnessValidator();
      if (validatorModule?.BoundWitnessValidator) {
        const BoundWitnessValidatorClass = validatorModule.BoundWitnessValidator as any;
        const validator = new BoundWitnessValidatorClass(boundWitness);
        const errors = await validator.validate();
        return {
          isValid: errors.length === 0,
          errors: errors.map((err: Error) => err.message || String(err))
        };
      }

      // Basic validation fallback
      return this.basicValidation(boundWitness);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Bound witness validation error:', error);
      return {
        isValid: false,
        errors: [error instanceof Error ? error.message : String(error)]
      };
    }
  }

  /**
   * Extract bound witness from response data
   */
  private extractBoundWitness(responseData: unknown): unknown {
    if (typeof responseData === 'object' && responseData !== null) {
      const data = responseData as Record<string, unknown>;
      
      if ('data' in data && Array.isArray(data.data) && data.data.length > 0) {
        return data.data[0];
      }
      
      if (Array.isArray(responseData) && responseData.length > 0) {
        return responseData[0];
      }
      
      return responseData;
    }
    
    return null;
  }

  /**
   * Basic validation of bound witness structure
   */
  private basicValidation(boundWitness: unknown): { isValid: boolean; errors: string[] } {
    if (typeof boundWitness !== 'object' || boundWitness === null) {
      return {
        isValid: false,
        errors: ['Bound witness is not a valid object']
      };
    }

    const bw = boundWitness as Record<string, unknown>;
    const errors: string[] = [];

    if (!('schema' in bw)) errors.push('Missing schema field');
    if (!('payload_hashes' in bw)) errors.push('Missing payload_hashes field');
    if (!('addresses' in bw)) errors.push('Missing addresses field');
    if (!('previous_hashes' in bw)) errors.push('Missing previous_hashes field');

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Extract cryptographic details from a bound witness
   * Returns signature details, hash chain, data hash, sequence, and address verification
   * NOTE: For XL1 transactions, this is now a fallback only.
   * XL1 transactions should be read directly from XL1 blockchain via viewer/RPC.
   * This method can also extract details from a provided bound witness object (from XL1 viewer).
   */
  async getCryptographicDetails(proofHash: string, storedBoundWitnessData?: unknown): Promise<{
    signatures: string[];
    hashChain: string[];
    dataHash?: string;
    sequence?: string;
    addresses: string[];
    payloadHashes: string[];
    boundWitnessHash?: string;
    signatureValid: boolean;
    errors: string[];
    isMocked?: boolean;
  }> {
    try {
      let boundWitness: unknown = null;
      let isMocked = false;

      // PRIORITY: Check stored data first if it's a real transaction (not mocked)
      // This ensures we use the actual transaction data that was just submitted
      // Archivist might have propagation delay, so stored data is more reliable for recent transactions
      // NOTE: If we have bound witness data (from XL1 or stored), we can process it even if Archivist is disabled
      let useStoredData = false;
      
      if (storedBoundWitnessData) {
        const storedData = storedBoundWitnessData as Record<string, unknown>;
        
        // If stored data is real (not mocked), prefer it over Archivist
        // This ensures we show the actual transaction data that was just submitted
        if (storedData.isMocked !== true && storedData.boundWitness) {
          useStoredData = true;
          // eslint-disable-next-line no-console
          console.log('Using stored real transaction data (not mocked) for:', proofHash);
        } else if (storedBoundWitnessData && typeof storedBoundWitnessData === 'object') {
          // Also check if storedBoundWitnessData IS the bound witness itself (from XL1 viewer)
          // This happens when xyo-service passes xl1Result.boundWitness directly
          const bw = storedBoundWitnessData as Record<string, unknown>;
          if (Array.isArray(bw) && bw.length > 0) {
            // It's a bound witness array [boundWitness, payloads]
            useStoredData = true;
            // eslint-disable-next-line no-console
            console.log('Using bound witness data passed directly (from XL1) for:', proofHash);
          } else if ('addresses' in bw || 'payload_hashes' in bw || 'previous_hashes' in bw) {
            // It's a bound witness object
            useStoredData = true;
            // eslint-disable-next-line no-console
            console.log('Using bound witness object passed directly (from XL1) for:', proofHash);
          }
        }
      }

      if (useStoredData && storedBoundWitnessData) {
        const storedData = storedBoundWitnessData as Record<string, unknown>;
        isMocked = false;
        
        // Extract bound witness from stored data
        // Stored structure: { boundWitness: [boundWitness, payloads], ...metadata }
        if ('boundWitness' in storedData && storedData.boundWitness) {
          const bw = storedData.boundWitness;
          if (Array.isArray(bw) && bw.length > 0) {
            // boundWitness is [boundWitnessObject, payloadsArray]
            boundWitness = bw[0];
            // eslint-disable-next-line no-console
            console.log('Extracted bound witness from stored data (array format)');
          } else if (typeof bw === 'object' && bw !== null) {
            // boundWitness is the object itself
            boundWitness = bw;
            // eslint-disable-next-line no-console
            console.log('Extracted bound witness from stored data (object format)');
          }
        }
      } else {
        // Try fetching from Archivist (for older transactions or when stored data is mocked)
        // Only query Archivist if it's not disabled
        if (env.xyoArchivistDisabled) {
          // eslint-disable-next-line no-console
          console.log('Archivist is disabled (XYO_ARCHIVIST_DISABLED=true) and no stored/XL1 data available, returning empty cryptographic details');
          return {
            signatures: [],
            hashChain: [],
            addresses: [],
            payloadHashes: [],
            signatureValid: false,
            errors: ['Archivist is disabled and no XL1/stored data available']
          };
        }

        // eslint-disable-next-line no-console
        console.log('Attempting to fetch bound witness from Archivist for:', proofHash);
        const verificationResult = await this.verifyLocationProof(proofHash);
        
        if (verificationResult.isValid && verificationResult.data) {
          // Successfully retrieved from Archivist - use real blockchain data
          boundWitness = this.extractBoundWitness(verificationResult.data);
          // eslint-disable-next-line no-console
          console.log('Successfully retrieved real bound witness from Archivist - using real blockchain data');
          isMocked = false;
        } else {
          // Archivist fetch failed - fall back to stored data if available
          // eslint-disable-next-line no-console
          console.log('Archivist fetch failed, falling back to stored data if available');
          
          if (storedBoundWitnessData) {
            const storedData = storedBoundWitnessData as Record<string, unknown>;
            
            // Check if this is a mock transaction
            if (storedData.isMocked === true) {
              isMocked = true;
            }

            // Extract bound witness from stored data
            if (Array.isArray(storedBoundWitnessData) && storedBoundWitnessData.length > 0) {
              boundWitness = storedBoundWitnessData[0];
            } else if (typeof storedBoundWitnessData === 'object' && storedBoundWitnessData !== null) {
              // Check if it has a boundWitness field or is the boundWitness itself
              if ('boundWitness' in storedData && storedData.boundWitness) {
                const bw = storedData.boundWitness;
                if (Array.isArray(bw) && bw.length > 0) {
                  boundWitness = bw[0];
                } else {
                  boundWitness = bw;
                }
              } else {
                // It might be the boundWitness itself (without wrapper)
                boundWitness = storedBoundWitnessData;
              }
            }
          } else {
            // No stored data and Archivist fetch failed
            isMocked = true;
          }
        }
      }

      if (!boundWitness || typeof boundWitness !== 'object') {
        return {
          signatures: [],
          hashChain: [],
          addresses: [],
          payloadHashes: [],
          signatureValid: false,
          errors: ['Could not extract bound witness from response'],
          isMocked: isMocked
        };
      }

      const bw = boundWitness as Record<string, unknown>;
      const errors: string[] = [];

      // Extract signatures ($signatures or _signatures)
      const signatures: string[] = [];
      if ('$signatures' in bw && Array.isArray(bw.$signatures)) {
        signatures.push(...(bw.$signatures as string[]));
      } else if ('_signatures' in bw && Array.isArray(bw._signatures)) {
        signatures.push(...(bw._signatures as string[]));
      }

      // Extract hash chain (previous_hashes)
      const hashChain: string[] = [];
      if ('previous_hashes' in bw && Array.isArray(bw.previous_hashes)) {
        hashChain.push(...(bw.previous_hashes as (string | null)[]).filter((h): h is string => h !== null && h !== undefined && h !== ''));
      }

      // Extract data hash
      const dataHash = (bw._dataHash as string | undefined) || (bw.dataHash as string | undefined);

      // Extract sequence number (XL1)
      const sequence = (bw._sequence as string | undefined) || (bw.sequence as string | undefined);

      // Extract addresses
      const addresses: string[] = [];
      if ('addresses' in bw && Array.isArray(bw.addresses)) {
        addresses.push(...(bw.addresses as string[]));
      }

      // Extract payload hashes
      const payloadHashes: string[] = [];
      if ('payload_hashes' in bw && Array.isArray(bw.payload_hashes)) {
        payloadHashes.push(...(bw.payload_hashes as string[]));
      }

      // Extract bound witness hash
      const boundWitnessHash = (bw._hash as string | undefined) || (bw.hash as string | undefined) || proofHash;

      // Basic signature validation (check if signatures exist and match address count)
      let signatureValid = false;
      if (signatures.length > 0 && addresses.length > 0) {
        // Basic check: signatures should match addresses (one signature per address typically)
        signatureValid = signatures.length >= addresses.length;
        if (!signatureValid) {
          errors.push(`Signature count (${signatures.length}) does not match address count (${addresses.length})`);
        }
      } else if (signatures.length === 0) {
        errors.push('No signatures found in bound witness');
      } else if (addresses.length === 0) {
        errors.push('No addresses found in bound witness');
      }

      // Validate required fields
      if (!boundWitnessHash) errors.push('Missing bound witness hash');
      if (addresses.length === 0) errors.push('Missing addresses');
      if (payloadHashes.length === 0) errors.push('Missing payload hashes');

      return {
        signatures,
        hashChain,
        dataHash,
        sequence,
        addresses,
        payloadHashes,
        boundWitnessHash,
        signatureValid: signatureValid && errors.length === 0,
        errors,
        isMocked
      };
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Cryptographic details extraction error:', error);
      return {
        signatures: [],
        hashChain: [],
        addresses: [],
        payloadHashes: [],
        signatureValid: false,
        errors: [error instanceof Error ? error.message : String(error)],
        isMocked: false
      };
    }
  }

  /**
   * Get bound witness chain by following previous_hashes
   * Retrieves the cryptographic lineage of proofs
   * NOTE: For XL1 transactions, this is now a fallback only.
   * XL1 transactions should be read directly from XL1 blockchain via viewer/RPC.
   * This method is kept for non-XL1 bound witnesses or as a fallback.
   */
  async getBoundWitnessChain(proofHash: string, maxDepth: number = 5, storedBoundWitnessData?: unknown): Promise<unknown[]> {
    // Check if Archivist is disabled via feature flag
    if (env.xyoArchivistDisabled) {
      // eslint-disable-next-line no-console
      console.log('Archivist is disabled (XYO_ARCHIVIST_DISABLED=true), returning empty chain');
      return [];
    }

    const chain: unknown[] = [];
    let currentHash: string | null = proofHash;
    let depth = 0;
    let isFirstHash = true; // Track if this is the first hash (current transaction)

    while (currentHash && depth < maxDepth) {
      try {
        let boundWitness: unknown = null;

        // For the first hash, try stored data first (for newly submitted transactions)
        if (isFirstHash && storedBoundWitnessData) {
          const storedData = storedBoundWitnessData as Record<string, unknown>;
          
          // If stored data is real (not mocked), use it
          if (storedData.isMocked !== true && storedData.boundWitness) {
            // eslint-disable-next-line no-console
            console.log(`Using stored real transaction data for chain hash: ${currentHash}`);
            
            const bw = storedData.boundWitness;
            if (Array.isArray(bw) && bw.length > 0) {
              // boundWitness is [boundWitnessObject, payloadsArray]
              boundWitness = bw[0];
              // eslint-disable-next-line no-console
              console.log('Extracted bound witness from stored data for chain');
            } else if (typeof bw === 'object' && bw !== null) {
              boundWitness = bw;
            }
          }
        }

        // If we didn't get bound witness from stored data, try Archivist
        if (!boundWitness) {
          const verificationResult = await this.verifyLocationProof(currentHash);
          
          if (!verificationResult.isValid || !verificationResult.data) {
            // eslint-disable-next-line no-console
            console.warn(`Could not retrieve bound witness for hash: ${currentHash}`);
            break;
          }

          boundWitness = this.extractBoundWitness(verificationResult.data);
          if (!boundWitness) {
            break;
          }
        }

        chain.push(boundWitness);

        // Extract previous hash from bound witness
        // IMPORTANT: previous_hashes is address-indexed. previous_hashes[i] corresponds to addresses[i]
        const bw = boundWitness as Record<string, unknown>;
        if ('previous_hashes' in bw && Array.isArray(bw.previous_hashes) && 
            'addresses' in bw && Array.isArray(bw.addresses) && 
            bw.addresses.length > 0) {
          const addresses = bw.addresses as string[];
          const previousHashes = bw.previous_hashes as (string | null)[];
          
          // Use the first address's previous hash (for backward compatibility)
          // In the future, we might want to track a specific address
          const previousHash = previousHashes.length > 0 ? previousHashes[0] : null;
          
          // Check if previous hash is null, empty, or all zeros (chain start)
          if (
            previousHash === null ||
            previousHash === undefined ||
            (typeof previousHash === 'string' && 
             (previousHash === '' || /^0+$/.test(previousHash)))
          ) {
            // Chain has reached the beginning
            break;
          }

          currentHash = typeof previousHash === 'string' ? previousHash : null;
        } else {
          // No previous hash, chain ends
          break;
        }

        isFirstHash = false; // After first iteration, we're following the chain
        depth++;
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error(`Error retrieving bound witness chain at depth ${depth}:`, error);
        break;
      }
    }

    return chain;
  }
}

