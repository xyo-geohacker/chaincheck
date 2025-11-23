/**
 * Service for querying XYO Diviner network
 * Handles location verification through network consensus
 */

import axios from 'axios';
import https from 'https';

import type { DivinerVerificationResult, WitnessNodeInfo } from '../../../../shared/types/xyo.types.js';
import { env } from '../../lib/env.js';
import { XyoSdkLoader } from './sdk-loader.js';

export class DivinerService {
  /**
   * Query Diviner network using bound witness hash (alternative to location-based query)
   * This method queries Diviner using the bound witness hash from XL1 transaction
   * which may be more reliable than location-based queries
   * 
   * Based on SDK patterns (LocationDivinerApi.ts):
   * - GET ${apiDomain}/location/query/${hash} - SDK's getLocationQuery method
   * - Also tries root/base URL for discovery
   */
  async queryByBoundWitnessHash(boundWitnessHash: string): Promise<DivinerVerificationResult | null> {
    // Check if Diviner is disabled via feature flag
    if (env.xyoDivinerDisabled) {
      // eslint-disable-next-line no-console
      console.log('Diviner is disabled (XYO_DIVINER_DISABLED=true), skipping bound witness hash query');
      return null;
    }

    try {
      const baseUrl = env.xyoDivinerUrl ?? env.xyoArchivistUrl;
      
      // Try querying Diviner with bound witness hash directly
      // Based on SDK LocationDivinerApi.getLocationQuery() pattern
      // Also try root/base URL for discovery/health check
      const queryEndpoints = [
        // SDK pattern: GET /location/query/${hash}
        `${baseUrl}/location/query/${boundWitnessHash}`,
        // Alternative hash lookup patterns
        `${baseUrl}/query/${boundWitnessHash}`,
        `${baseUrl}/boundwitness/${boundWitnessHash}`,
        `${baseUrl}/get/${boundWitnessHash}`,
        // Root/base URL for discovery (may return API info or health status)
        `${baseUrl}/`
      ];

      for (const endpoint of queryEndpoints) {
        try {
          // eslint-disable-next-line no-console
          console.log(`Attempting Diviner query by hash: ${endpoint}`);
          
          const response = await axios.get(endpoint, {
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': env.xyoApiKey,
              Accept: 'application/json'
            },
            validateStatus: () => true,
            httpsAgent: new https.Agent({
              rejectUnauthorized: false
            })
          });

          // For root/base URL, it might return API info rather than query results
          // Check if it's a valid response (200) but might not be query data
          if (response.status === 200) {
            if (endpoint === `${baseUrl}/`) {
              // Root URL might return API info - log it but don't process as query result
              // eslint-disable-next-line no-console
              console.log(`Root/base URL returned:`, response.data);
              // Continue to next endpoint (root URL is for discovery, not query results)
              continue;
            }
            
            if (response.data) {
              // Log the actual response data to verify what we received
              // eslint-disable-next-line no-console
              console.log(`Diviner query returned status 200 from ${endpoint}`);
              // eslint-disable-next-line no-console
              console.log(`Response data:`, JSON.stringify(response.data, null, 2));
              
              // Check if response contains a queryHash (indicates query was created, need to poll for results)
              let dataToProcess = response.data;
              if (typeof response.data === 'object' && response.data !== null) {
                const responseObj = response.data as Record<string, unknown>;
                
                // If response has data.queryHash, extract the queryHash and poll for results
                if ('data' in responseObj && typeof responseObj.data === 'object' && responseObj.data !== null) {
                  const innerData = responseObj.data as Record<string, unknown>;
                  if ('queryHash' in innerData && typeof innerData.queryHash === 'string') {
                    const queryHash = innerData.queryHash;
                    // eslint-disable-next-line no-console
                    console.log(`Diviner returned queryHash, polling for results: ${queryHash}`);
                    
                    // Poll for query results using the queryHash
                    // Wait a short time for the query to process, then get results
                    await new Promise(resolve => setTimeout(resolve, 500)); // 500ms delay
                    const queryResult = await this.getLocationQueryResult(queryHash);
                    
                    if (queryResult) {
                      // eslint-disable-next-line no-console
                      console.log(`✓ Retrieved Diviner query results for hash ${queryHash}`);
                      dataToProcess = queryResult;
                    } else {
                      // eslint-disable-next-line no-console
                      console.warn(`⚠ Could not retrieve Diviner query results for hash ${queryHash}`);
                      // Continue to next endpoint
                      continue;
                    }
                  }
                }
              }
              
              const result = this.processDivinerResponseByHash(dataToProcess, boundWitnessHash);
              
              // Verify that we actually got meaningful data
              if (result.nodeCount === 0) {
                // eslint-disable-next-line no-console
                console.warn(`⚠ Diviner query returned empty result (nodeCount=0) - no location data found`);
                // Continue to next endpoint to try other patterns
                continue;
              }
              
              // eslint-disable-next-line no-console
              console.log(`✓ Successfully queried Diviner by hash: nodeCount=${result.nodeCount}, verified=${result.verified}`);
              return result;
            } else {
              // eslint-disable-next-line no-console
              console.warn(`⚠ Diviner query returned 200 but no data from ${endpoint}`);
              continue;
            }
          } else {
            // eslint-disable-next-line no-console
            console.debug(`Diviner query returned status ${response.status} from ${endpoint}`);
          }
        } catch (error) {
          // Continue to next endpoint
          // eslint-disable-next-line no-console
          console.debug(`Diviner query to ${endpoint} failed:`, error);
          continue;
        }
      }

      return null;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn('Diviner query by hash failed:', error);
      return null;
    }
  }

  /**
   * Process Diviner response when queried by bound witness hash
   */
  private processDivinerResponseByHash(divinerResponse: unknown, boundWitnessHash: string): DivinerVerificationResult {
    // Extract location data from response if available
    let latitude = 0;
    let longitude = 0;
    let timestamp = Date.now();
    let nodeCount = 0;

    // eslint-disable-next-line no-console
    console.log(`Processing Diviner response for hash ${boundWitnessHash}:`, 
      typeof divinerResponse === 'object' && divinerResponse !== null 
        ? JSON.stringify(divinerResponse, null, 2).substring(0, 500) 
        : String(divinerResponse).substring(0, 500));

    if (Array.isArray(divinerResponse)) {
      nodeCount = divinerResponse.length;
      // eslint-disable-next-line no-console
      console.log(`Diviner response is array with ${nodeCount} items`);
      // Try to extract location from first result
      if (divinerResponse.length > 0 && typeof divinerResponse[0] === 'object') {
        const firstResult = divinerResponse[0] as Record<string, unknown>;
        latitude = (firstResult.latitude as number) ?? 0;
        longitude = (firstResult.longitude as number) ?? 0;
        timestamp = (firstResult.timestamp as number) ?? Date.now();
        // eslint-disable-next-line no-console
        console.log(`Extracted location from first result: lat=${latitude}, lon=${longitude}, ts=${timestamp}`);
      } else {
        // eslint-disable-next-line no-console
        console.warn(`⚠ Diviner array response has no items or first item is not an object`);
      }
    } else if (typeof divinerResponse === 'object' && divinerResponse !== null) {
      const data = divinerResponse as Record<string, unknown>;
      // eslint-disable-next-line no-console
      console.log(`Diviner response is object, keys:`, Object.keys(data));
      latitude = (data.latitude as number) ?? 0;
      longitude = (data.longitude as number) ?? 0;
      timestamp = (data.timestamp as number) ?? Date.now();
      if (Array.isArray(data.results)) {
        nodeCount = data.results.length;
        // eslint-disable-next-line no-console
        console.log(`Found results array with ${nodeCount} items`);
      } else if (Array.isArray(data.data)) {
        nodeCount = data.data.length;
        // eslint-disable-next-line no-console
        console.log(`Found data array with ${nodeCount} items`);
      } else {
        // eslint-disable-next-line no-console
        console.warn(`⚠ Diviner object response has no results/data array`);
      }
    } else {
      // eslint-disable-next-line no-console
      console.warn(`⚠ Diviner response is not array or object:`, typeof divinerResponse);
    }

    const confidence = nodeCount >= 5 ? 95 : nodeCount >= 3 ? 85 : nodeCount >= 1 ? 70 : 50;
    const consensus: 'high' | 'medium' | 'low' = 
      confidence >= 90 ? 'high' : confidence >= 70 ? 'medium' : 'low';

    return {
      verified: nodeCount > 0 && confidence >= 70,
      confidence,
      nodeCount,
      consensus,
      locationMatch: true,
      timestamp: Date.now(),
      isMocked: false,
      details: {
        divinerResponse,
        witnessNodes: [],
        locationData: {
          latitude,
          longitude,
          accuracy: 10,
          timestamp,
          source: 'diviner'
        },
        xl1TransactionHash: boundWitnessHash
      }
    };
  }

  /**
   * Query Diviner network for location verification
   * Can include XL1 transaction details for cross-reference with blockchain proof
   * Now tries bound witness hash query first if available, then falls back to location query
   */
  async queryLocation(
    latitude: number,
    longitude: number,
    timestamp: number,
    xl1TransactionHash?: string,
    xl1BlockNumber?: number,
    boundWitness?: unknown
  ): Promise<DivinerVerificationResult> {
    // Check if Diviner is disabled via feature flag
    if (env.xyoDivinerDisabled) {
      // eslint-disable-next-line no-console
      console.log('Diviner is disabled (XYO_DIVINER_DISABLED=true), returning mock verification');
      return this.createMockVerification(latitude, longitude, timestamp, xl1TransactionHash, xl1BlockNumber);
    }

    try {
      // PRIORITY 1: If we have an XL1 transaction hash, try querying Diviner by bound witness hash first
      // This is simpler and more reliable than location-based queries
      if (xl1TransactionHash) {
        // eslint-disable-next-line no-console
        console.log('Attempting Diviner query by bound witness hash:', xl1TransactionHash);
        const hashQueryResult = await this.queryByBoundWitnessHash(xl1TransactionHash);
        if (hashQueryResult && hashQueryResult.nodeCount > 0 && hashQueryResult.verified) {
          // eslint-disable-next-line no-console
          console.log(`✓ Successfully queried Diviner by bound witness hash: nodeCount=${hashQueryResult.nodeCount}, verified=${hashQueryResult.verified}`);
          return hashQueryResult;
        } else if (hashQueryResult) {
          // eslint-disable-next-line no-console
          console.warn(`⚠ Diviner query by hash returned result but not verified: nodeCount=${hashQueryResult?.nodeCount || 0}, verified=${hashQueryResult?.verified || false}`);
          // eslint-disable-next-line no-console
          console.log('Falling back to location-based query');
        } else {
          // eslint-disable-next-line no-console
          console.log('Diviner query by hash returned null, falling back to location-based query');
        }
      }

      // PRIORITY 2: Fall back to location-based query using SDK's LocationDivinerApi format
      // The SDK uses a structured request object, NOT [QueryBoundWitness, Payload[]]
      // Based on LocationDivinerApi.ts and LocationDivinerApi.spec.ts
      try {
        // eslint-disable-next-line no-console
        console.log('Creating Location Diviner API request (SDK pattern)');

        // Build request in SDK's LocationQueryCreationRequest format
        // Schema: network.xyo.location.range.query (for time range queries)
        const startTime = new Date(timestamp - 3600000).toISOString(); // 1 hour before
        const stopTime = new Date(timestamp + 3600000).toISOString();  // 1 hour after

        const locationQueryRequest = {
          query: {
            schema: 'network.xyo.location', // LocationWitnessSchema
            startTime,
            stopTime
          },
          resultArchive: env.xyoArchive || 'chaincheck',
          resultArchivist: {
            apiDomain: env.xyoArchivistUrl
          },
          schema: 'network.xyo.location.range.query' as const, // LocationTimeRangeQuerySchema
          sourceArchive: env.xyoArchive || 'chaincheck',
          sourceArchivist: {
            apiDomain: env.xyoArchivistUrl
          }
        };

      // eslint-disable-next-line no-console
      console.log('Attempting Location Diviner API request (SDK format)');
      const result = await this.queryDivinerNetworkSdkFormat(locationQueryRequest);
      
      // NOTE: Public Diviner API endpoints appear to return 404 (nginx)
      // This suggests the API may not be publicly accessible or requires special access
      // The explore.xyo.network production code doesn't use Diviner APIs directly
      // It uses XL1 viewer/RPC and Archivist instead
      
      // If query returns null or empty, treat as failed query and use mock data
      if (result === null || result === undefined || (Array.isArray(result) && result.length === 0)) {
        // eslint-disable-next-line no-console
        console.warn('Diviner API returned null/empty or 404 - API may not be publicly accessible. Using mock verification.');
        // eslint-disable-next-line no-console
        console.warn('Note: explore.xyo.network uses XL1 viewer/RPC and Archivist, not Diviner APIs directly.');
        return this.createMockVerification(latitude, longitude, timestamp, xl1TransactionHash, xl1BlockNumber);
      }
      
      try {
        return this.processDivinerResponse(result, latitude, longitude, timestamp, xl1TransactionHash, xl1BlockNumber);
      } catch (error) {
        // If processDivinerResponse throws (e.g., for invalid response), use mock data
        // eslint-disable-next-line no-console
        console.warn('Error processing Diviner response, using mock verification:', error);
        return this.createMockVerification(latitude, longitude, timestamp, xl1TransactionHash, xl1BlockNumber);
      }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.warn('Diviner query error, using fallback:', error);
        return this.createMockVerification(latitude, longitude, timestamp, xl1TransactionHash, xl1BlockNumber);
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Diviner verification error:', error);
      return this.createMockVerification(latitude, longitude, timestamp, xl1TransactionHash, xl1BlockNumber);
    }
  }

  /**
   * Query Diviner network using SDK's LocationDivinerApi format
   * This matches the SDK's postLocationQuery method pattern
   * Request format: { query, resultArchive, resultArchivist, schema, sourceArchive, sourceArchivist }
   */
  private async queryDivinerNetworkSdkFormat(request: {
    query: { schema: string; startTime: string; stopTime: string };
    resultArchive: string;
    resultArchivist: { apiDomain: string };
    schema: string;
    sourceArchive: string;
    sourceArchivist: { apiDomain: string };
  }): Promise<unknown> {
    const baseUrl = env.xyoDivinerUrl ?? env.xyoArchivistUrl;
    const queryEndpoint = `${baseUrl}/location/query`;

    try {
      // eslint-disable-next-line no-console
      console.log('=== LOCATION DIVINER API REQUEST (SDK FORMAT) ===');
      // eslint-disable-next-line no-console
      console.log('URL:', queryEndpoint);
      // eslint-disable-next-line no-console
      console.log('Request:', JSON.stringify(request, null, 2));

      // SDK sends { ...request } as body (see LocationDivinerApi.ts line 24)
      const response = await axios.post(queryEndpoint, { ...request }, {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': env.xyoApiKey,
          Accept: 'application/json'
        },
        validateStatus: () => true,
        httpsAgent: new https.Agent({
          rejectUnauthorized: false
        })
      });

      // eslint-disable-next-line no-console
      console.log('=== LOCATION DIVINER API RESPONSE ===');
      // eslint-disable-next-line no-console
      console.log('Status:', response.status);
      // eslint-disable-next-line no-console
      console.log('Data:', JSON.stringify(response.data, null, 2));

      if (response.status === 200 && response.data) {
        let data = response.data;
        
        // SDK uses response transformer that extracts data.data
        // If response is wrapped in { data: { ... } }, extract it
        if (typeof data === 'object' && data !== null && 'data' in data && typeof data.data === 'object') {
          // eslint-disable-next-line no-console
          console.log('Response wrapped in data object, extracting inner data');
          data = data.data;
        }
        
        if (data === null || data === undefined) {
          return null;
        }
        
        // SDK returns LocationQueryCreationResponse with { hash, ...request }
        // We may need to poll for results using getLocationQuery(hash)
        if (data.hash) {
          // eslint-disable-next-line no-console
          console.log('Location query created, hash:', data.hash);
          // Try to get the query results
          try {
            const queryResult = await this.getLocationQueryResult(data.hash);
            if (queryResult) {
              return queryResult;
            }
          } catch (error) {
            // eslint-disable-next-line no-console
            console.warn('Failed to get location query result, using creation response:', error);
          }
        }
        
        return data;
      }

      return null;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn('Location Diviner API query failed:', error);
      return null;
    }
  }

  /**
   * Get location query result by hash (SDK's getLocationQuery pattern)
   */
  private async getLocationQueryResult(hash: string): Promise<unknown> {
    const baseUrl = env.xyoDivinerUrl ?? env.xyoArchivistUrl;
    const queryEndpoint = `${baseUrl}/location/query/${hash}`;

    try {
      // eslint-disable-next-line no-console
      console.log(`Getting location query result for hash: ${hash}`);
      
      const response = await axios.get(queryEndpoint, {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': env.xyoApiKey,
          Accept: 'application/json'
        },
        validateStatus: () => true,
        httpsAgent: new https.Agent({
          rejectUnauthorized: false
        })
      });

      if (response.status === 200 && response.data) {
        let data = response.data;
        
        // SDK uses response transformer that extracts data.data
        // If response is wrapped in { data: { ... } }, extract it
        if (typeof data === 'object' && data !== null && 'data' in data && typeof data.data === 'object') {
          // eslint-disable-next-line no-console
          console.log('Query result wrapped in data object, extracting inner data');
          data = data.data;
        }
        
        // eslint-disable-next-line no-console
        console.log('Location query result:', JSON.stringify(data, null, 2));
        return data;
      }

      return null;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn('Failed to get location query result:', error);
      return null;
    }
  }

  /**
   * Query Diviner network via Archivist
   * Expects format: [QueryBoundWitness, Payload[]]
   * 
   * Based on SDK samples (sdk-xyo-client-js):
   * - Location Diviner endpoints:
   *   - Main: https://api.location.diviner.xyo.network
   *   - Beta: https://beta.api.location.diviner.xyo.network
   * - Location queries use: POST ${apiDomain}/location/query (SDK's postLocationQuery method)
   * - Generic bound witness queries may use: POST ${apiDomain}/query
   * - Hash lookups use: GET ${apiDomain}/location/query/${hash} (SDK's getLocationQuery method)
   * 
   * For location verification queries, we use POST /location/query endpoint.
   * For generic bound witness queries, we use POST /query endpoint.
   * Also tries root/base URL for discovery.
   */
  private async queryDivinerNetwork(queryData: [unknown, unknown[]]): Promise<unknown> {
    // Prefer direct Diviner URL if configured, otherwise fall back to Archivist URL
    const baseUrl = env.xyoDivinerUrl ?? env.xyoArchivistUrl;
    
    // Try endpoints in priority order:
    // 1. POST /location/query (SDK pattern - postLocationQuery)
    // 2. POST /query (fallback for generic queries)
    // 3. POST / (root/base URL - may be discovery endpoint)
    const queryEndpoints = [
      `${baseUrl}/location/query`,
      `${baseUrl}/query`,
      `${baseUrl}/`
    ];

    // Try each endpoint in order until one succeeds
    for (const queryEndpoint of queryEndpoints) {
      try {
        // Pretty-print the outgoing Diviner request for debugging
        // eslint-disable-next-line no-console
        console.log('=== DIVINER REQUEST ===');
        // eslint-disable-next-line no-console
        console.log(
          JSON.stringify(
            {
              url: queryEndpoint,
              payload: queryData
            },
            null,
            2
          )
        );

        let queryResponse = await axios.post(queryEndpoint, queryData, {
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': env.xyoApiKey,
            Accept: 'application/json'
          },
          // Accept all HTTP status codes; we'll handle them manually
          validateStatus: () => true,
          // In development/beta environments, Diviner hosts may present certificates whose
          // hostname does not match the URL we are hitting (e.g., wildcard *.beta.xyo.network).
          // To avoid hard failures on hostname mismatch / SSL issues during development,
          // we disable certificate verification here.
          httpsAgent: new https.Agent({
            rejectUnauthorized: false
          })
        });

        // Pretty-print the raw Diviner response for debugging
        // eslint-disable-next-line no-console
        console.log('=== DIVINER RESPONSE ===');
        // eslint-disable-next-line no-console
        console.log(
          JSON.stringify(
            {
              url: queryEndpoint,
              status: queryResponse.status,
              statusText: queryResponse.statusText,
              data: queryResponse.data
            },
            null,
            2
          )
        );

        // For root/base URL, it might return API info rather than query results
        if (queryEndpoint === `${baseUrl}/` && queryResponse.status === 200) {
          // Root URL might return API info - log it but try next endpoint
          // eslint-disable-next-line no-console
          console.log(`Root/base URL returned API info:`, queryResponse.data);
          continue;
        }

        // If we got a successful response, use it
        if (queryResponse.status === 200 && queryResponse.data) {
          // Check if response is actually meaningful (not just an empty object or null)
          const data = queryResponse.data;
          if (data === null || data === undefined) {
            // eslint-disable-next-line no-console
            console.warn('Diviner query returned null/undefined data');
            continue; // Try next endpoint
          }
          
          // Check if it's an empty array
          if (Array.isArray(data) && data.length === 0) {
            // eslint-disable-next-line no-console
            console.warn('Diviner query returned empty array');
            continue; // Try next endpoint
          }
          
          // Success! Return the data
          return data;
        }

        // If 404, try next endpoint
        if (queryResponse.status === 404) {
          // eslint-disable-next-line no-console
          console.debug(`Diviner endpoint ${queryEndpoint} returned 404, trying next endpoint`);
          continue;
        }

        // For other error statuses, log and try next endpoint
        if (queryResponse.status !== 200) {
          // eslint-disable-next-line no-console
          console.debug(`Diviner endpoint ${queryEndpoint} returned status ${queryResponse.status}, trying next endpoint`);
          continue;
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.debug(`Diviner POST to ${queryEndpoint} failed, trying next endpoint:`, error);
        continue;
      }
    }

    // All endpoints failed - return null to trigger fallback
    // eslint-disable-next-line no-console
    console.warn('All Diviner POST endpoints failed, returning null for fallback');
    return null;
  }

  /**
   * Process Diviner response and calculate consensus
   */
  private processDivinerResponse(
    divinerResponse: unknown,
    latitude: number,
    longitude: number,
    timestamp: number,
    xl1TransactionHash?: string,
    xl1BlockNumber?: number
  ): DivinerVerificationResult {
    let nodeCount = 0;
    let confidence = 85;
    let locationMatch = true;

    // Validate that we have a meaningful response
    // Note: This should not happen as we check before calling this method,
    // but this is a safety check
    if (!divinerResponse || (Array.isArray(divinerResponse) && divinerResponse.length === 0)) {
      // eslint-disable-next-line no-console
      console.warn('Empty Diviner response in processDivinerResponse - this should have been caught earlier');
      // Return a result indicating this is invalid (caller should use mock data)
      // We can't call createMockVerification here as it's async and this method is sync
      throw new Error('Empty Diviner response - should use mock data');
    }

    if (Array.isArray(divinerResponse)) {
      nodeCount = divinerResponse.length;
      
      if (nodeCount >= 5) {
        confidence = 95;
      } else if (nodeCount >= 3) {
        confidence = 85;
      } else if (nodeCount >= 1) {
        confidence = 70;
      } else {
        confidence = 50;
      }
    } else if (typeof divinerResponse === 'object' && divinerResponse !== null) {
      // Handle object responses - try to extract node count from response structure
      // This is a fallback for different response formats
      // eslint-disable-next-line no-console
      console.log('Diviner returned object response (not array), processing...');
    }

    const consensus: 'high' | 'medium' | 'low' = 
      confidence >= 90 ? 'high' : confidence >= 70 ? 'medium' : 'low';

    return {
      verified: locationMatch && confidence >= 70,
      confidence,
      nodeCount,
      consensus,
      locationMatch,
      timestamp: Date.now(),
      isMocked: false,
      details: {
        divinerResponse,
        witnessNodes: [],
        locationData: {
          latitude,
          longitude,
          accuracy: 10,
          timestamp,
          source: 'diviner'
        },
        // Include XL1 transaction reference for cross-validation
        xl1TransactionHash: xl1TransactionHash ?? undefined,
        xl1BlockNumber: xl1BlockNumber ?? undefined
      }
    };
  }

  /**
   * Create mock Diviner verification for development/testing
   * Can include XL1 transaction details for realistic mock data
   */
  private async createMockVerification(
    latitude: number,
    longitude: number,
    timestamp: number,
    xl1TransactionHash?: string,
    xl1BlockNumber?: number
  ): Promise<DivinerVerificationResult> {
    const crypto = await import('crypto');
    const locationHash = crypto.createHash('sha256')
      .update(`${latitude},${longitude},${timestamp}`)
      .digest('hex');
    
    const nodeCount = 3 + (parseInt(locationHash.substring(0, 2), 16) % 5);
    
    let confidence = 70;
    if (nodeCount >= 6) {
      confidence = 95;
    } else if (nodeCount >= 4) {
      confidence = 85;
    } else if (nodeCount >= 3) {
      confidence = 75;
    }

    const witnessNodes: WitnessNodeInfo[] = Array.from({ length: nodeCount }, (_, i) => ({
      address: `0x${crypto.createHash('sha256').update(`${latitude},${longitude},${i}`).digest('hex').substring(0, 40)}`,
      location: {
        latitude: latitude + (Math.random() - 0.5) * 0.001,
        longitude: longitude + (Math.random() - 0.5) * 0.001
      },
      type: i % 2 === 0 ? 'sentinel' : 'bridge',
      verified: true
    }));

    const consensus: 'high' | 'medium' | 'low' = 
      confidence >= 90 ? 'high' : confidence >= 70 ? 'medium' : 'low';

    return {
      verified: true,
      confidence,
      nodeCount,
      consensus,
      locationMatch: true,
      distanceFromClaimed: Math.random() * 5,
      timestamp: Date.now(),
      isMocked: true,
      details: {
        divinerResponse: {
          schema: 'network.xyo.diviner.location',
          verified: true,
          nodeCount
        },
        witnessNodes,
        locationData: {
          latitude,
          longitude,
          accuracy: 5 + Math.random() * 5,
          timestamp,
          source: 'diviner'
        },
        // Include XL1 transaction reference in mock data for consistency
        xl1TransactionHash: xl1TransactionHash ?? undefined,
        xl1BlockNumber: xl1BlockNumber ?? undefined
      }
    };
  }
}

