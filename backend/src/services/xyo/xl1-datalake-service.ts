/**
 * Service for accessing XYO Data Lake (Archivist/Diviner) via RPC interface
 * Attempts to use connection.storage (DataLakeViewer) to read off-chain data
 */

import axios from 'axios';

import { env } from '../../lib/env.js';
import { XyoSdkLoader } from './sdk-loader.js';
import { installXl1RpcLogger } from './xl1-rpc-logger.js';

// Note: Payloads are stored in Archivist via POST to ${ARCHIVIST_URL}/${ARCHIVE_NAME}
// So we should try querying with archive name in the URL as well

export class Xl1DataLakeService {
  /**
   * Get payload from Data Lake using connection.storage
   * This attempts to use the RPC DataLakeViewer interface instead of direct HTTP calls
   */
  async getPayloadFromDataLake(hash: string): Promise<unknown | null> {
    // Check if Archivist is disabled via feature flag
    if (env.xyoArchivistDisabled) {
       
      console.log('Archivist is disabled (XYO_ARCHIVIST_DISABLED=true), skipping Data Lake payload retrieval');
      return null;
    }

    try {
      const connection = await this.createRpcConnectionWithStorage();
      
      if (!connection || !connection.storage) {
        return null;
      }

      const storage = connection.storage;

      // Check available methods on storage
      const hasGet = typeof storage.get === 'function';
      const hasFetch = typeof storage.fetch === 'function';
      
      if (!hasGet && !hasFetch) {
        return null;
      }

      // Try fetch() first if available (it follows hash payloads and might be more useful)
      let result: unknown | undefined;
      if (hasFetch) {
        try {
          // fetch() typically takes an array of hashes and optional maxDepth
          // Try with maxDepth=1 to avoid infinite loops, but still follow one level
          const fetchResult = await storage.fetch([hash], 1);
          if (Array.isArray(fetchResult) && fetchResult.length > 0) {
            result = fetchResult[0];
          }
        } catch (error) {
          // If it's a "Method not implemented" error, JsonRpcDataLakeViewer was used but not supported
          if (error instanceof Error && error.message.includes('not implemented')) {
            // Fallback to Archivist HTTP calls will happen automatically
          }
        }
      }

      // If fetch() didn't work or isn't available, try get()
      if (!result && hasGet) {
        try {
          result = await storage.get(hash);
        } catch (error) {
          // If it's a "Method not implemented" error, JsonRpcDataLakeViewer was used but not supported
          if (error instanceof Error && error.message.includes('not implemented')) {
            // Fallback to Archivist HTTP calls will happen automatically
          }
          return null;
        }
      }

      return result || null;
    } catch (error) {
       
      console.warn('Failed to get payload from Data Lake via RPC:', error);
      return null;
    }
  }

  /**
   * Get multiple payloads from Data Lake using connection.storage
   */
  async getManyPayloadsFromDataLake(hashes: string[]): Promise<unknown[]> {
    try {
      const connection = await this.createRpcConnectionWithStorage();
      
      if (!connection || !connection.storage) {
        return [];
      }

      const storage = connection.storage;

      if (typeof storage.getMany !== 'function') {
        return [];
      }

      const results = await storage.getMany(hashes);

      return Array.isArray(results) ? results : [];
    } catch (error) {
       
      console.warn('Failed to get payloads from Data Lake via RPC:', error);
      return [];
    }
  }

  /**
   * Check if payload exists in Data Lake using connection.storage
   */
  async hasPayloadInDataLake(hash: string): Promise<boolean> {
    try {
      const connection = await this.createRpcConnectionWithStorage();
      
      if (!connection || !connection.storage) {
        return false;
      }

      const storage = connection.storage;

      if (typeof storage.has !== 'function') {
        return false;
      }

      return await storage.has(hash);
    } catch (error) {
       
      console.warn('Failed to check payload existence in Data Lake via RPC:', error);
      return false;
    }
  }

  /**
   * Create RPC connection with Data Lake storage
   * Attempts to create a DataLakeViewer from Archivist URL
   */
  private async createRpcConnectionWithStorage(): Promise<any> {
    try {
      installXl1RpcLogger();

      const endpoint = env.xyoChainRpcUrl;
      if (!endpoint) {
         
        console.warn('XYO_CHAIN_RPC_URL not configured');
        return null;
      }

      const xl1RpcModule = await XyoSdkLoader.xl1Rpc();
      const xl1ProtocolSdkModule = await XyoSdkLoader.xl1ProtocolSdk();

      let HttpRpcXyoConnection = (xl1RpcModule as any).HttpRpcXyoConnection;
      if (!HttpRpcXyoConnection) {
        HttpRpcXyoConnection = (xl1RpcModule as any).RpcXyoConnection;
      }

      if (!HttpRpcXyoConnection) {
         
        console.warn('HttpRpcXyoConnection not found');
        return null;
      }

      // Try to create DataLakeViewer via RPC (JsonRpcDataLakeViewer)
      // NOTE: JsonRpcDataLakeViewer methods throw "Method not implemented" - the XL1 RPC endpoint
      // doesn't support Data Lake RPC methods yet. We'll skip this and use Archivist HTTP directly.
      let storage: any = null;

      // Skip JsonRpcDataLakeViewer for now since methods are not implemented
      // The XL1 RPC endpoint doesn't support Data Lake RPC methods yet
      // Use custom wrapper with Archivist HTTP (this is the working approach)
      if (env.xyoArchivistUrl) {
        // Try to use SimpleDataLakeViewer with a custom map implementation
        const SimpleDataLakeViewer = (xl1ProtocolSdkModule as any)?.SimpleDataLakeViewer;
        
        if (SimpleDataLakeViewer && typeof SimpleDataLakeViewer === 'function') {
          try {
            // Create a map wrapper that uses Archivist HTTP API
            const archivistMap = this.createArchivistMap();
            
            // Wrap it in SimpleDataLakeViewer
            storage = new SimpleDataLakeViewer({ map: archivistMap });
          } catch (error) {
             
            console.warn('⚠ Failed to create SimpleDataLakeViewer with map:', error);
            // Fallback to direct custom wrapper
            storage = this.createArchivistDataLakeViewer();
          }
        } else {
          // SimpleDataLakeViewer not available, use custom wrapper directly
          storage = this.createArchivistDataLakeViewer();
        }
      }

      // Create connection with storage (if available)
      const HttpRpcXyoConnectionClass = HttpRpcXyoConnection;
      const connectionParams: any = { endpoint };
      
      if (storage) {
        connectionParams.storage = storage;
      } else {
         
        console.warn('⚠ Creating connection without Data Lake storage (will use direct HTTP calls as fallback)');
      }

      const connection = new HttpRpcXyoConnectionClass(connectionParams);

      if (!connection.storage) {
         
        console.warn('⚠ Connection does not have storage property');
      }

      return connection;
    } catch (error) {
       
      console.warn('Failed to create RPC connection with Data Lake storage:', error);
      return null;
    }
  }

  /**
   * Create a map implementation that uses Archivist HTTP API
   * This implements MapTypeRead<Hash, DataLakeData> interface
   */
  private createArchivistMap(): any {
    return {
      async get(hash: string): Promise<unknown | undefined> {
        try {
          
          // No retry logic needed since inserts are manual and should be immediately available
          const maxRetries = 1; // Single attempt only
          
          // Try Archivist GET endpoints
          // Note: The XYO Archivist uses module addresses in the path, not archive names
          // /Archivist redirects to the Archivist's module address (e.g., /bb0f0b19414badfbfefe2a060ec23579094a5543)
          // We should try querying with the module address first
          const archiveName = env.xyoArchive || 'chaincheck';
          const moduleName = 'Archivist'; // XYO module name (not archive name)
          
          // ALWAYS use the address from /Archivist route - this ensures consistency
          // The /Archivist route resolves to the correct MongoDB Archivist for this environment
          // This is the single source of truth for the Archivist address
          let archivistModuleAddress: string | null = null;
          
          try {
            // Follow the /Archivist redirect to get the actual module address
            // This is the canonical way to discover the Archivist address
            const archivistResponse = await axios.get(`${env.xyoArchivistUrl}/Archivist`, {
              headers: {
                'x-api-key': env.xyoApiKey
              },
              maxRedirects: 5, // Follow redirects to get final address
              validateStatus: (status) => status >= 200 && status < 400
            });
            
            // Method 1: Check redirect location header
            const location = archivistResponse.headers.location || archivistResponse.headers.Location;
            if (location) {
              const match = location.match(/\/([a-f0-9]{40})/);
              if (match) {
                archivistModuleAddress = match[1];
              }
            }
            
            // Method 2: If no redirect, check response data for address
            if (!archivistModuleAddress && archivistResponse.data) {
              const data = archivistResponse.data;
              if (typeof data === 'object' && data !== null) {
                const obj = data as Record<string, unknown>;
                
                // Check for address in status field (common in XYO responses)
                if (obj.status && typeof obj.status === 'object' && obj.status !== null) {
                  const status = obj.status as Record<string, unknown>;
                  if (typeof status.address === 'string' && status.address.length === 40) {
                    archivistModuleAddress = status.address;
                  }
                }
                
                // Check for direct address field
                if (!archivistModuleAddress && typeof obj.address === 'string' && obj.address.length === 40) {
                  archivistModuleAddress = obj.address;
                }
                
                // Check for address in data array (if response is wrapped)
                if (!archivistModuleAddress && Array.isArray(obj.data) && obj.data.length > 0) {
                  const firstItem = obj.data[0];
                  if (typeof firstItem === 'object' && firstItem !== null) {
                    const item = firstItem as Record<string, unknown>;
                    if (item.status && typeof item.status === 'object' && item.status !== null) {
                      const status = item.status as Record<string, unknown>;
                      if (typeof status.address === 'string' && status.address.length === 40) {
                        archivistModuleAddress = status.address;
                      }
                    }
                  }
                }
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
                }
              }
            } else {
               
              console.warn('⚠ Failed to discover Archivist address from /Archivist route:', error instanceof Error ? error.message : String(error));
            }
          }
          
          // CRITICAL: We MUST have an Archivist address to proceed
          // The /Archivist route is the single source of truth
          if (!archivistModuleAddress) {
             
            console.error('❌ Could not discover Archivist module address from /Archivist route');
             
            console.error('❌ Cannot retrieve payload without valid Archivist address');
            return undefined;
          }
          
          // Based on DEBUG logs and Archivist startup routes:
          // - GET /get/:hash returns "Cannot GET" - NOT a valid endpoint
          // - GET /dataLake/:hash returns "Cannot GET" - NOT a valid endpoint  
          // - POST /node/:address with QueryBoundWitness format is the correct approach (same as insert)
          //
          // IMPORTANT: Use QueryBoundWitness format (POST) as PRIMARY method, not fallback
          // This matches the insert process which uses POST /node/:address with QueryBoundWitness
          //
          // CRITICAL: Always use the address from /Archivist route - this is the single source of truth
          // This ensures consistency across environments and prevents using wrong Archivist instances
          
          // Use QueryBoundWitness format as PRIMARY method (same approach as insert)
          // archivistModuleAddress is guaranteed to be set at this point (checked above)
          if (archivistModuleAddress) {
            try {
              // Import required modules for QueryBoundWitness (same pattern as archivist-service.ts)
              const sdkLoader = await import('./sdk-loader.js');
              const [payloadBuilderModule, boundWitnessBuilderModule, archivistModelModule, accountModule] = await Promise.all([
                sdkLoader.XyoSdkLoader.payloadBuilder(),
                sdkLoader.XyoSdkLoader.boundWitnessBuilder(),
                sdkLoader.XyoSdkLoader.archivistModel(),
                sdkLoader.XyoSdkLoader.account()
              ]);
              
              const PayloadBuilder = payloadBuilderModule.PayloadBuilder;
              const QueryBoundWitnessBuilder = boundWitnessBuilderModule.QueryBoundWitnessBuilder;
              const ArchivistGetQuerySchema = archivistModelModule.ArchivistGetQuerySchema;
              const Account = accountModule.Account;
              
              if (!Account || !PayloadBuilder || !QueryBoundWitnessBuilder || !ArchivistGetQuerySchema) {
                 
                console.warn('⚠ Required SDK modules not available for QueryBoundWitness');
                return undefined;
              }
              
              // Create account (same pattern as archivist-service.ts)
              const AccountClass = Account as any;
              const accountPromise = typeof AccountClass.random === 'function' ? AccountClass.random() : AccountClass.create();
              const account = await accountPromise;
              const signerAccount = account && typeof account.then === 'function' ? await account : account;
              
              // Build query payload with the hash we want to retrieve (same pattern as archivist-service.ts)
              const PayloadBuilderClass = PayloadBuilder as any;
              const getQueryPayload = new PayloadBuilderClass({ schema: ArchivistGetQuerySchema })
                .fields({ hashes: [hash] })
                .build();
              
              // Build QueryBoundWitness with the query (same pattern as archivist-service.ts)
              const QueryBoundWitnessBuilderClass = QueryBoundWitnessBuilder as any;
              const query = await new QueryBoundWitnessBuilderClass()
                .signer(signerAccount)
                .query(getQueryPayload)
                .build();
              
              // Format as QueryBoundWitness array: [boundWitness, payloads[]]
              const queryData = [query[0], [...query[1]]];
              
              // POST QueryBoundWitness to /node/:address (PRIMARY endpoint, same as insert)
              // Use the address from /Archivist route - this ensures we're using the correct Archivist
              const endpoint = `${env.xyoArchivistUrl}/node/${archivistModuleAddress}`;
              
              const response = await axios.post(endpoint, queryData, {
                headers: {
                  'Content-Type': 'application/json',
                  ...(env.xyoApiKey && { 'x-api-key': env.xyoApiKey })
                },
                validateStatus: () => true
              });
              
              if (response.status === 200 && response.data) {
                // Archivist QueryBoundWitness response: [boundWitness, payloads[], errors[]]
                let payloads: unknown[] = [];
                let errors: unknown[] = [];
                const responseData = response.data as unknown;
                
                if (Array.isArray(responseData)) {
                  [, payloads, errors] = responseData as [unknown, unknown[], unknown[]];
                } else if (typeof responseData === 'object' && responseData !== null && 'data' in responseData) {
                  const wrappedData = (responseData as { data: unknown }).data;
                  if (Array.isArray(wrappedData)) {
                    [, payloads, errors] = wrappedData as [unknown, unknown[], unknown[]];
                  }
                }
                
                // Check for errors
                if (Array.isArray(errors) && errors.length > 0) {
                   
                  console.warn(`⚠ Archivist query returned errors:`, errors);
                }
                
                // Find the payload with matching hash
                const requestedHash = hash.toLowerCase();
                const matchingPayload = payloads.find((p: unknown) => {
                  if (typeof p === 'object' && p !== null) {
                    const payload = p as Record<string, unknown>;
                    // Check _hash field (standard XYO payload hash field)
                    if ('_hash' in payload) {
                      return String(payload._hash).toLowerCase() === requestedHash;
                    }
                    // Check hash field (alternative)
                    if ('hash' in payload) {
                      return String(payload.hash).toLowerCase() === requestedHash;
                    }
                  }
                  return false;
                });
                
                if (matchingPayload) {
                  return matchingPayload;
                } else {
                   
                  console.log(`⚠ QueryBoundWitness returned ${payloads.length} payload(s), but none matched hash ${hash}`);
                  if (payloads.length > 0) {
                     
                    console.log(`Available payload hashes:`, payloads.map((p: unknown) => {
                      if (typeof p === 'object' && p !== null) {
                        const payload = p as Record<string, unknown>;
                        return payload._hash || payload.hash || 'unknown';
                      }
                      return 'unknown';
                    }));
                  }
                }
              } else {
                 
                console.log(`⚠ QueryBoundWitness request returned status ${response.status}`);
                if (response.data) {
                   
                  console.log(`Response data:`, JSON.stringify(response.data, null, 2));
                }
              }
            } catch (error) {
               
              console.warn('QueryBoundWitness retrieval failed:', error instanceof Error ? error.message : String(error));
              if (error instanceof Error && error.stack) {
                 
                console.warn('Error stack:', error.stack);
              }
              // Don't fall through to GET endpoints - QueryBoundWitness is the only valid method
              return undefined;
            }
          } else {
             
            console.warn('⚠ Could not determine Archivist module address, cannot use QueryBoundWitness');
            return undefined;
          }
          
          // NOTE: GET endpoints are NOT supported by Archivist - all return 404
          // QueryBoundWitness POST to /node/:address is the ONLY valid method
          // If QueryBoundWitness failed above, we cannot retrieve the payload
           
          console.log(`\n✗ QueryBoundWitness retrieval failed - GET endpoints are not supported by Archivist`);
           
          console.log(`Note: Archivist requires POST with QueryBoundWitness format, not GET requests`);
           
          console.log(`========================\n`);
          
          return undefined;
          
          /* DISABLED: GET endpoints are not supported
          const endpoints = [
            // Try module address endpoints first (if we found the address)
            ...(archivistModuleAddress ? [
              `${env.xyoArchivistUrl}/node/${archivistModuleAddress}/${hash}`,
              `${env.xyoArchivistUrl}/${archivistModuleAddress}/${hash}`,
            ] : []),
            // Try /get/:hash (may not work, but worth trying)
            `${env.xyoArchivistUrl}/get/${hash}`,
            // Fallback: Standard GET endpoints
            `${env.xyoArchivistUrl}/archivist/get/${hash}`,
            // Archive-specific block.payloads pattern (from Diviner API Express project)
            // Pattern: api.archive(name).block.payloads(hash).get()
            `${env.xyoArchivistUrl}/${archiveName}/block/payloads/${hash}`,
            `${env.xyoArchivistUrl}/${archiveName}/block/payloads/${hash}/get`,
            `${env.xyoArchivistUrl}/block/payloads/${hash}?archive=${archiveName}`,
            `${env.xyoArchivistUrl}/${moduleName}/block/payloads/${hash}`,
            `${env.xyoArchivistUrl}/block/payloads/${hash}`,
            // Module name pattern (from Swift SDK: ${ARCHIVIST_URL}/Archivist)
            `${env.xyoArchivistUrl}/${moduleName}/get/${hash}`,
            `${env.xyoArchivistUrl}/${moduleName}/${hash}`,
            `${env.xyoArchivistUrl}/${moduleName}/api/v1/huri/${hash}/tuple`,
            `${env.xyoArchivistUrl}/${moduleName}/api/v1/huri/${hash}`,
            // Archive name with direct hash access (e.g., /chaincheck/<hash>)
            `${env.xyoArchivistUrl}/${archiveName}/${hash}`,
            // Archive name with /get/ path (e.g., /chaincheck/get/<hash>)
            `${env.xyoArchivistUrl}/${archiveName}/get/${hash}`,
            // Archive name with /archivist/get/ path
            `${env.xyoArchivistUrl}/${archiveName}/archivist/get/${hash}`,
            // Archive name in path with /archivist/ prefix
            `${env.xyoArchivistUrl}/archivist/${archiveName}/get/${hash}`,
            `${env.xyoArchivistUrl}/archivist/${archiveName}/${hash}`,
            // With archive name as query parameter
            `${env.xyoArchivistUrl}/get/${hash}?archive=${archiveName}`,
            `${env.xyoArchivistUrl}/archivist/get/${hash}?archive=${archiveName}`,
            // Archive name with HURI endpoints
            `${env.xyoArchivistUrl}/${archiveName}/api/v1/huri/${hash}/tuple`,
            `${env.xyoArchivistUrl}/${archiveName}/api/v1/huri/${hash}`,
            `${env.xyoArchivistUrl}/${archiveName}/huri/${hash}/tuple`,
            `${env.xyoArchivistUrl}/${archiveName}/huri/${hash}`,
            // HURI endpoints (standard)
            `${env.xyoArchivistUrl}/api/v1/huri/${hash}/tuple`,
            `${env.xyoArchivistUrl}/api/v1/huri/${hash}`,
            // HURI with archive as query parameter
            `${env.xyoArchivistUrl}/api/v1/huri/${hash}/tuple?archive=${archiveName}`,
            `${env.xyoArchivistUrl}/api/v1/huri/${hash}?archive=${archiveName}`,
            // Alternative HURI paths
            `${env.xyoArchivistUrl}/huri/${hash}/tuple`,
            `${env.xyoArchivistUrl}/huri/${hash}`,
            `${env.xyoArchivistUrl}/huri/${hash}/tuple?archive=${archiveName}`,
            `${env.xyoArchivistUrl}/huri/${hash}?archive=${archiveName}`,
          ];

          // Single attempt only (no retry logic since inserts are manual)
          // NOTE: GET endpoints are not supported - this code path should not be reached
          // QueryBoundWitness POST to /node/:address is the correct method
          for (const endpoint of endpoints) {
            try {
              const response = await axios.get(endpoint, {
                headers: {
                  'Content-Type': 'application/json',
                  'x-api-key': env.xyoApiKey,
                  'Accept': 'application/json'
                },
                validateStatus: () => true
              });
              
              if (response.status === 200 && response.data) {
                return response.data;
              }
            } catch (error) {
              // Try next endpoint silently
              continue;
            }
          }

          // eslint-disable-next-line no-console
          console.warn(`⚠ Payload not found via GET endpoints (this code path should not be reached - use QueryBoundWitness POST instead)`);
          // eslint-disable-next-line no-console
          console.log(`========================\n`);
          
          return undefined;
          */
        } catch (error) {
           
          console.warn('Archivist map.get() failed:', error);
          return undefined;
        }
      },

      async getMany(hashes: string[]): Promise<unknown[]> {
        const results: unknown[] = [];
        for (const hash of hashes) {
          const result = await this.get(hash);
          if (result) {
            results.push(result);
          }
        }
        return results;
      },

      async has(hash: string): Promise<boolean> {
        const result = await this.get(hash);
        return result !== undefined;
      }
    };
  }

  /**
   * Create a custom DataLakeViewer wrapper that uses Archivist HTTP API
   * This implements the DataLakeViewer interface but uses our existing Archivist HTTP calls
   * Used as fallback when SimpleDataLakeViewer is not available
   */
  private createArchivistDataLakeViewer(): any {
     
    console.log('Creating custom Archivist DataLakeViewer wrapper...');

    // Use the same map implementation
    const map = this.createArchivistMap();

                return {
                  async get(hash: string): Promise<unknown | undefined> {
                    return map.get(hash);
                  },

                  async fetch(hashes: string[], maxDepth?: number): Promise<unknown[]> {
                     
                    console.log(`\n--- Custom DataLakeViewer.fetch() called ---`);
                     
                    console.log(`Hashes: ${hashes.length}, maxDepth: ${maxDepth || 'unlimited'}`);
                     
                    console.log('Note: fetch() follows hash payloads, but our implementation uses get() for now');
                    
                    // For now, implement fetch() by calling get() for each hash
                    // In a full implementation, fetch() would follow hash payload references
                    const results: unknown[] = [];
                    for (const hash of hashes) {
                      const result = await map.get(hash);
                      if (result) {
                        results.push(result);
                        
                        // If maxDepth is set and result is a hash payload, we could follow it
                        // For now, just return the direct result
                        if (maxDepth !== undefined && maxDepth > 0) {
                          // Check if result is a hash payload that should be followed
                          if (typeof result === 'object' && result !== null) {
                            const payload = result as Record<string, unknown>;
                            if (payload.schema === 'network.xyo.hash' && payload.hash) {
                               
                              console.log(`Found hash payload, could follow to: ${payload.hash}`);
                              // For now, we don't follow - just return the hash payload itself
                            }
                          }
                        }
                      }
                    }
                    return results;
                  },

                  async getMany(hashes: string[]): Promise<unknown[]> {
                    return map.getMany(hashes);
                  },

                  async has(hash: string): Promise<boolean> {
                    return map.has(hash);
                  }
                };
  }
}

