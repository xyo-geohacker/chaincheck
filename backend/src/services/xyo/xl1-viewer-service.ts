/**
 * Service for reading XL1 blockchain data directly via RPC/viewer
 * This is the primary source of truth for XL1 transactions (not Archivist)
 * Following the explore.xyo.network pattern
 */

import { env } from '../../lib/env.js';
import { XyoSdkLoader } from './sdk-loader.js';
import { installXl1RpcLogger } from './xl1-rpc-logger.js';

export class Xl1ViewerService {
  /**
   * Get bound witness from XL1 blockchain using viewer
   * This is the correct way to read XL1 transactions (explore.xyo.network pattern)
   */
  async getBoundWitnessFromXL1(proofHash: string): Promise<{ 
    boundWitness: unknown; 
    payloads: unknown[];
    nbf?: number;
    exp?: number;
    actualBlockNumber?: number | null;
  } | null> {
    try {
      // Create RPC connection to access viewer
      const connection = await this.createRpcConnection();
      
      if (!connection || !connection.viewer) {
         
        console.warn('Viewer not available on connection, cannot read from XL1 directly');
        return null;
      }

      const viewer = connection.viewer;
      
      // Use viewer.transactionByHash() to get transaction directly from XL1
      // This matches the explore.xyo.network pattern
       
      console.log(`\n=== XL1 VIEWER REQUEST ===`);
       
      console.log(`Method: transactionByHash`);
       
      console.log(`Transaction Hash: ${proofHash}`);
       
      console.log(`========================\n`);
      
      const result = await viewer.transactionByHash(proofHash);
      
       
      console.log(`\n=== XL1 VIEWER RESPONSE ===`);
       
      console.log(`Transaction Hash: ${proofHash}`);
      if (result) {
        try {
           
          console.log(`Result:`, JSON.stringify(result, null, 2));
        } catch {
           
          console.log(`Result:`, result);
        }
      } else {
         
        console.log(`Result: null (transaction not found)`);
      }
       
      console.log(`========================\n`);
      
      if (!result || !Array.isArray(result) || result.length === 0) {
         
        console.warn(`Transaction not found in XL1 blockchain: ${proofHash}`);
        return null;
      }

      // Result format: [transaction, payloads]
      // Transaction IS the bound witness
      const [transaction, payloads] = result;
      
      // Ensure bound witness has _hash field (required by schema)
      // XL1 viewer may return bound witnesses without _hash pre-calculated
      let boundWitness = transaction as Record<string, unknown>;
      if (!boundWitness._hash && !boundWitness.hash) {
        try {
          const { BoundWitnessWrapper } = await XyoSdkLoader.loadBoundWitnessWrapper();
          const wrapper = (BoundWitnessWrapper as any).parse(boundWitness);
          const calculatedHash = await wrapper.hash();
          boundWitness = { ...boundWitness, _hash: calculatedHash };
        } catch (hashError) {
           
          console.warn('Failed to calculate hash for bound witness:', hashError);
          // Continue without hash - caller can use transaction hash as fallback
        }
      }
      
      // Extract block information from bound witness
      const bw = boundWitness;
      const nbf = bw.nbf as number | undefined;
      const exp = bw.exp as number | undefined;
      const blockNumber = bw.blockNumber as number | undefined;
      
      // Determine actual block number (if transaction has been committed)
      // Actual block number is typically present if different from nbf or if exp has passed
      const actualBlockNumber = blockNumber && blockNumber !== nbf ? blockNumber : null;
      
       
      console.log('\n=== TRANSACTION SUMMARY ===');
       
      console.log('Successfully retrieved transaction from XL1 blockchain via viewer');
       
      console.log('Block info:', { nbf, exp, blockNumber, actualBlockNumber });
      
      return {
        boundWitness,
        payloads: Array.isArray(payloads) ? payloads : [],
        nbf,
        exp,
        actualBlockNumber
      };
    } catch (error) {
       
      console.warn('Failed to get bound witness from XL1 via viewer:', error);
      return null;
    }
  }

  /**
   * Get bound witness chain by following previous_hashes using XL1 viewer
   * This reads directly from the blockchain, not from Archivist
   * 
   * @param proofHash - The transaction hash to start from
   * @param maxDepth - Maximum depth to traverse
   * @param address - Optional address to track. If provided, uses address-indexed previous_hashes.
   *                  If not provided, uses the first address's previous hash (for backward compatibility)
   */
  async getBoundWitnessChainFromXL1(proofHash: string, maxDepth: number = 5, address?: string): Promise<unknown[]> {
    const chain: unknown[] = [];
    let currentHash: string | null = proofHash;
    let depth = 0;
    let trackingAddress: string | undefined = address;

    try {
      const connection = await this.createRpcConnection();
      
      if (!connection || !connection.viewer) {
         
        console.warn('Viewer not available, cannot read chain from XL1');
        return chain;
      }

      const viewer = connection.viewer;

      while (currentHash && depth < maxDepth) {
        try {
           
          console.log(`\n=== XL1 VIEWER CHAIN REQUEST ===`);
           
          console.log(`Depth: ${depth}`);
           
          console.log(`Method: transactionByHash`);
           
          console.log(`Transaction Hash: ${currentHash}`);
          if (trackingAddress) {
             
            console.log(`Tracking address: ${trackingAddress}`);
          }
           
          console.log(`========================\n`);
          
          const result = await viewer.transactionByHash(currentHash);
          
           
          console.log(`\n=== XL1 VIEWER CHAIN RESPONSE ===`);
           
          console.log(`Depth: ${depth}`);
           
          console.log(`Transaction Hash: ${currentHash}`);
          if (result) {
            try {
               
              console.log(`Result:`, JSON.stringify(result, null, 2));
            } catch {
               
              console.log(`Result:`, result);
            }
          } else {
             
            console.log(`Result: null (transaction not found)`);
          }
           
          console.log(`========================\n`);
          
          if (!result || !Array.isArray(result) || result.length === 0) {
             
            console.warn(`Transaction not found in XL1 blockchain: ${currentHash}`);
            break;
          }

          const [transaction] = result;
          
          // Ensure bound witness has _hash field (required by schema)
          // XL1 viewer may return bound witnesses without _hash pre-calculated
          let boundWitness = transaction as Record<string, unknown>;
          if (!boundWitness._hash && !boundWitness.hash) {
            try {
              const { BoundWitnessWrapper } = await XyoSdkLoader.loadBoundWitnessWrapper();
              const wrapper = (BoundWitnessWrapper as any).parse(boundWitness);
              const calculatedHash = await wrapper.hash();
              boundWitness = { ...boundWitness, _hash: calculatedHash };
            } catch (hashError) {
               
              console.warn(`Failed to calculate hash for bound witness at depth ${depth}:`, hashError);
              // Continue without hash - frontend can use transaction hash as fallback
            }
          }
          
          chain.push(boundWitness);

          // Extract previous hash from bound witness using address-indexed previous_hashes
          const bw = boundWitness;
          if ('previous_hashes' in bw && Array.isArray(bw.previous_hashes) && 'addresses' in bw && Array.isArray(bw.addresses)) {
            const addresses = bw.addresses as string[];
            const previousHashes = bw.previous_hashes as (string | null)[];
            
            // Find the address index to use for previous_hashes
            let addressIndex = 0;
            if (trackingAddress) {
              // Normalize address for comparison (case-insensitive)
              const normalizedTrackingAddress = trackingAddress.toLowerCase();
              addressIndex = addresses.findIndex(addr => addr.toLowerCase() === normalizedTrackingAddress);
              
              if (addressIndex === -1) {
                // Tracking address not found in this transaction, use first address
                 
                console.warn(`Tracking address ${trackingAddress} not found in transaction addresses, using first address`);
                addressIndex = 0;
                // Update tracking address to the first address for next iteration
                trackingAddress = addresses[0];
              } else {
                // Keep tracking the same address
                trackingAddress = addresses[addressIndex];
              }
            } else {
              // No address specified, use first address (backward compatibility)
              if (addresses.length > 0) {
                trackingAddress = addresses[0];
              }
            }
            
            // Get the previous hash for this address
            const previousHash = addressIndex < previousHashes.length ? previousHashes[addressIndex] : null;
            
             
            console.log(`Using address index ${addressIndex} (address: ${trackingAddress}) for previous_hashes`);
            
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

          depth++;
        } catch (error) {
           
          console.error(`Error retrieving bound witness chain from XL1 at depth ${depth}:`, error);
          break;
        }
      }

       
      console.log(`Retrieved ${chain.length} transactions from XL1 chain`);
      return chain;
    } catch (error) {
       
      console.error('Failed to get bound witness chain from XL1:', error);
      return chain;
    }
  }

  /**
   * Check if a proof hash is an XL1 transaction
   * This is a heuristic - we try to read it from XL1 first
   */
  async isXL1Transaction(proofHash: string): Promise<boolean> {
    try {
      const result = await this.getBoundWitnessFromXL1(proofHash);
      return result !== null;
    } catch {
      return false;
    }
  }

  /**
   * Get the actual block number for a transaction hash
   * Queries the XL1 viewer to check if the transaction has been committed to a block
   * Returns the actual block number if committed, null if still pending
   * 
   * This method can be called periodically to check if a transaction has been committed
   * 
   * Strategy:
   * 1. First check if bound witness has blockNumber/block field
   * 2. If not, check blocks in the expected range (nbf to exp) using blockByNumber
   * 3. For each block, check if the transaction hash is in that block's transactions
   */
  async getActualBlockNumberForTransaction(transactionHash: string): Promise<number | null> {
    try {
      const result = await this.getBoundWitnessFromXL1(transactionHash);
      
      if (!result) {
        return null;
      }

      // If actualBlockNumber is available, return it
      if (result.actualBlockNumber !== null && result.actualBlockNumber !== undefined) {
        return result.actualBlockNumber;
      }

      // Check if we can determine from the bound witness directly
      const bw = result.boundWitness as Record<string, unknown>;
      const block = bw.block as number | undefined;
      const blockNumber = bw.blockNumber as number | undefined;
      const nbf = bw.nbf as number | undefined;
      
      // If block/blockNumber exists and is different from nbf, it's the actual block
      const actualBlock = block ?? blockNumber;
      if (actualBlock !== undefined && actualBlock !== null && actualBlock !== nbf) {
        return actualBlock;
      }

      // If we have nbf and exp, try to find the block containing this transaction
      if (result.nbf !== undefined && result.exp !== undefined && result.nbf !== null && result.exp !== null) {
        const connection = await this.createRpcConnection();
        
        if (!connection || !connection.viewer) {
           
          console.warn('Viewer not available, cannot check blocks for transaction');
          return null;
        }

        const viewer = connection.viewer;

        // Search blocks in the expected range using transactionByBlockNumberAndIndex
        // This is the most reliable method after the package upgrade
        if (typeof viewer.transactionByBlockNumberAndIndex === 'function') {
          // Get current block number to limit our search
          let currentBlock: number | null = null;
          try {
            if (typeof viewer.currentBlockNumber === 'function') {
              currentBlock = await viewer.currentBlockNumber();
            }
          } catch {
            // Ignore errors getting current block
          }

          // Search blocks from nbf to exp (or current block, whichever is smaller)
          const startBlock = result.nbf;
          const endBlock = currentBlock !== null && currentBlock < result.exp ? currentBlock : result.exp;
          
          // Limit search to prevent timeout
          const maxBlocksToCheck = 100;
          const blocksToCheck = Math.min(endBlock - startBlock + 1, maxBlocksToCheck);
          
          for (let i = 0; i < blocksToCheck; i++) {
            const blockNum = startBlock + i;
            
            try {
              // Check transactions in this block using transactionByBlockNumberAndIndex
              let txIndex = 0;
              const maxTransactionsPerBlock = 100;
              
              while (txIndex < maxTransactionsPerBlock) {
                try {
                  const txResult = await viewer.transactionByBlockNumberAndIndex(blockNum, txIndex);
                  if (!txResult) {
                    // No more transactions in this block
                    break;
                  }
                  
                  // Transaction format is [boundWitness, payloads] or just boundWitness
                  let txBoundWitness: Record<string, unknown>;
                  if (Array.isArray(txResult) && txResult.length > 0) {
                    txBoundWitness = txResult[0] as Record<string, unknown>;
                  } else if (typeof txResult === 'object' && txResult !== null) {
                    txBoundWitness = txResult as Record<string, unknown>;
                  } else {
                    break;
                  }
                  
                  // Get hash from bound witness or calculate it
                  let txHash = txBoundWitness._hash || txBoundWitness.hash;
                  if (!txHash) {
                    try {
                      const { BoundWitnessWrapper } = await XyoSdkLoader.loadBoundWitnessWrapper();
                      const wrapper = (BoundWitnessWrapper as any).parse(txBoundWitness);
                      txHash = await wrapper.hash();
                    } catch {
                      // Continue to next transaction if hash calculation fails
                      txIndex++;
                      continue;
                    }
                  }
                  
                  // Compare hashes (case-insensitive)
                  if (txHash && typeof txHash === 'string' && txHash.toLowerCase() === transactionHash.toLowerCase()) {
                    return blockNum;
                  }
                  
                  txIndex++;
                } catch {
                  // No more transactions in this block
                  break;
                }
              }
            } catch {
              // Continue to next block if this one fails
              continue;
            }
          }
        }
      }

      // Transaction hasn't been committed yet (still in expected range)
      return null;
    } catch (error) {
       
      console.warn('Failed to get actual block number for transaction:', error);
      return null;
    }
  }

  /**
   * Query a block by its block number
   * Uses viewer methods to retrieve block information
   * Note: This may not be available in all XL1 RPC implementations
   */
  async getBlockByNumber(blockNumber: number): Promise<{ block: unknown; transactions: unknown[] } | null> {
    try {
      const connection = await this.createRpcConnection();
      
      if (!connection || !connection.viewer) {
         
        console.warn('Viewer not available, cannot query block by number');
        return null;
      }

      const viewer = connection.viewer;

      // Try to find a method to query blocks by number
      // Some viewers may have blockByNumber, others may require iterating through blocks
      if (typeof viewer.blockByNumber === 'function') {
         
        console.log(`\n=== XL1 VIEWER REQUEST ===`);
         
        console.log(`Method: blockByNumber`);
         
        console.log(`Block Number: ${blockNumber}`);
         
        console.log(`========================\n`);
        
        const result = await viewer.blockByNumber(blockNumber);
        
         
        console.log(`\n=== XL1 VIEWER RESPONSE ===`);
         
        console.log(`Block Number: ${blockNumber}`);
        if (result) {
          try {
             
            console.log(`Result:`, JSON.stringify(result, null, 2));
          } catch {
             
            console.log(`Result:`, result);
          }
        }
         
        console.log(`========================\n`);
        
        if (result && Array.isArray(result)) {
          const [block, transactions] = result;
          return {
            block,
            transactions: Array.isArray(transactions) ? transactions : []
          };
        }
      } else {
         
        console.warn('viewer.blockByNumber() is not available - block number queries may not be supported');
      }

      return null;
    } catch (error) {
       
      console.warn('Failed to get block by number:', error);
      return null;
    }
  }

  /**
   * Create RPC connection to access viewer
   * Uses the same pattern as XL1TransactionService
   */
  private async createRpcConnection(): Promise<any> {
    try {
      // Install RPC logger to intercept HTTP requests (both axios and fetch)
      installXl1RpcLogger();
      // Also install fetch interceptor for SDKs that use fetch instead of axios
      const { installFetchInterceptor } = await import('./xl1-rpc-logger.js');
      installFetchInterceptor();
      
      const endpoint = env.xyoChainRpcUrl;
      if (!endpoint) {
         
        console.warn('XYO_CHAIN_RPC_URL not configured, cannot create viewer connection');
        return null;
      }

      const xl1RpcModule = await XyoSdkLoader.xl1Rpc();
      
      // Try HttpRpcXyoConnection first
      let HttpRpcXyoConnection = (xl1RpcModule as any).HttpRpcXyoConnection;
      
      if (!HttpRpcXyoConnection) {
        HttpRpcXyoConnection = (xl1RpcModule as any).RpcXyoConnection;
      }

      if (!HttpRpcXyoConnection) {
         
        console.warn('HttpRpcXyoConnection not found in @xyo-network/xl1-rpc');
        return null;
      }

      // Create connection without account (read-only for viewer)
      const HttpRpcXyoConnectionClass = HttpRpcXyoConnection;
      const connection = new HttpRpcXyoConnectionClass({ endpoint });
      
      // Check if viewer is available
      // Some connections expose viewer directly, others use _viewer
      if (!connection.viewer) {
        if (connection._viewer) {
          connection.viewer = connection._viewer;
        } else {
          // Try to access viewer via getter or method
          // Some RPC connections require initialization
          try {
            // Wait a bit for connection to initialize
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Check again after brief delay
            if (connection._viewer) {
              connection.viewer = connection._viewer;
            } else if (typeof (connection).getViewer === 'function') {
              connection.viewer = await (connection).getViewer();
            } else {
               
              console.warn('Viewer not available on connection after initialization');
              return null;
            }
          } catch {
             
            console.warn('Failed to initialize viewer on connection');
            return null;
          }
        }
      }

      // Verify viewer has the methods we need
      if (!connection.viewer || typeof connection.viewer.transactionByHash !== 'function') {
         
        console.warn('Viewer does not have transactionByHash method');
        return null;
      }

      // Log available viewer methods for debugging
      if (connection.viewer) {
        const viewerMethods = Object.getOwnPropertyNames(Object.getPrototypeOf(connection.viewer))
          .filter(name => typeof (connection.viewer)[name] === 'function' && name !== 'constructor');
         
        console.log('Available viewer methods:', viewerMethods);
        
        // Check for blockByNumber method
        if (typeof (connection.viewer).blockByNumber === 'function') {
           
          console.log('✓ viewer.blockByNumber() is available');
        } else {
           
          console.log('⚠ viewer.blockByNumber() is not available - block number queries may not be supported');
        }
      }

      return connection;
    } catch (error) {
       
      console.warn('Failed to create RPC connection for viewer:', error);
      return null;
    }
  }
}

