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
        // eslint-disable-next-line no-console
        console.warn('Viewer not available on connection, cannot read from XL1 directly');
        return null;
      }

      const viewer = connection.viewer;
      
      // Use viewer.transactionByHash() to get transaction directly from XL1
      // This matches the explore.xyo.network pattern
      // eslint-disable-next-line no-console
      console.log(`\n=== XL1 VIEWER REQUEST ===`);
      // eslint-disable-next-line no-console
      console.log(`Method: transactionByHash`);
      // eslint-disable-next-line no-console
      console.log(`Transaction Hash: ${proofHash}`);
      // eslint-disable-next-line no-console
      console.log(`========================\n`);
      
      const result = await viewer.transactionByHash(proofHash);
      
      // eslint-disable-next-line no-console
      console.log(`\n=== XL1 VIEWER RESPONSE ===`);
      // eslint-disable-next-line no-console
      console.log(`Transaction Hash: ${proofHash}`);
      if (result) {
        try {
          // eslint-disable-next-line no-console
          console.log(`Result:`, JSON.stringify(result, null, 2));
        } catch {
          // eslint-disable-next-line no-console
          console.log(`Result:`, result);
        }
      } else {
        // eslint-disable-next-line no-console
        console.log(`Result: null (transaction not found)`);
      }
      // eslint-disable-next-line no-console
      console.log(`========================\n`);
      
      if (!result || !Array.isArray(result) || result.length === 0) {
        // eslint-disable-next-line no-console
        console.warn(`Transaction not found in XL1 blockchain: ${proofHash}`);
        return null;
      }

      // Result format: [transaction, payloads]
      // Transaction IS the bound witness
      const [transaction, payloads] = result;
      
      // Extract block information from bound witness
      const bw = transaction as Record<string, unknown>;
      const nbf = bw.nbf as number | undefined;
      const exp = bw.exp as number | undefined;
      const blockNumber = bw.blockNumber as number | undefined;
      
      // Determine actual block number (if transaction has been committed)
      // Actual block number is typically present if different from nbf or if exp has passed
      const actualBlockNumber = blockNumber && blockNumber !== nbf ? blockNumber : null;
      
      // Inspect _storage metadata from bound witness (may contain Archivist hints)
      const storageMeta = bw._storage as Record<string, unknown> | undefined;
      if (storageMeta) {
        // eslint-disable-next-line no-console
        console.log('\n=== BOUND WITNESS STORAGE METADATA ===');
        // eslint-disable-next-line no-console
        console.log('_storage keys:', Object.keys(storageMeta));
        // eslint-disable-next-line no-console
        console.log('_storage content:', JSON.stringify(storageMeta, null, 2));
        
        // Check for common storage metadata fields that might indicate Archivist location
        if ('archive' in storageMeta) {
          // eslint-disable-next-line no-console
          console.log('✓ Found archive name in _storage:', storageMeta.archive);
        }
        if ('archivist' in storageMeta || 'archivistUrl' in storageMeta || 'archivist_url' in storageMeta) {
          // eslint-disable-next-line no-console
          console.log('✓ Found Archivist URL hint in _storage:', storageMeta.archivist || storageMeta.archivistUrl || storageMeta.archivist_url);
        }
        if ('endpoint' in storageMeta || 'url' in storageMeta) {
          // eslint-disable-next-line no-console
          console.log('✓ Found endpoint/URL hint in _storage:', storageMeta.endpoint || storageMeta.url);
        }
      } else {
        // eslint-disable-next-line no-console
        console.log('⚠ No _storage metadata found on bound witness');
      }
      
      // Inspect _storage metadata from payloads
      if (Array.isArray(payloads) && payloads.length > 0) {
        // eslint-disable-next-line no-console
        console.log('\n=== PAYLOADS STORAGE METADATA ===');
        payloads.forEach((payload, index) => {
          if (typeof payload === 'object' && payload !== null) {
            const p = payload as Record<string, unknown>;
            const payloadStorageMeta = p._storage as Record<string, unknown> | undefined;
            if (payloadStorageMeta) {
              // eslint-disable-next-line no-console
              console.log(`\nPayload ${index} (_hash: ${p._hash || 'N/A'}, schema: ${p.schema || 'N/A'}):`);
              // eslint-disable-next-line no-console
              console.log('  _storage keys:', Object.keys(payloadStorageMeta));
              // eslint-disable-next-line no-console
              console.log('  _storage content:', JSON.stringify(payloadStorageMeta, null, 2));
              
              // Check for storage hints
              if ('archive' in payloadStorageMeta) {
                // eslint-disable-next-line no-console
                console.log(`  ✓ Archive name: ${payloadStorageMeta.archive}`);
              }
              if ('archivist' in payloadStorageMeta || 'archivistUrl' in payloadStorageMeta || 'archivist_url' in payloadStorageMeta) {
                // eslint-disable-next-line no-console
                console.log(`  ✓ Archivist URL: ${payloadStorageMeta.archivist || payloadStorageMeta.archivistUrl || payloadStorageMeta.archivist_url}`);
              }
            } else {
              // eslint-disable-next-line no-console
              console.log(`Payload ${index} (_hash: ${p._hash || 'N/A'}): No _storage metadata`);
            }
          }
        });
      }
      
      // eslint-disable-next-line no-console
      console.log('\n=== TRANSACTION SUMMARY ===');
      // eslint-disable-next-line no-console
      console.log('Successfully retrieved transaction from XL1 blockchain via viewer');
      // eslint-disable-next-line no-console
      console.log('Block info:', { nbf, exp, blockNumber, actualBlockNumber });
      
      return {
        boundWitness: transaction,
        payloads: Array.isArray(payloads) ? payloads : [],
        nbf,
        exp,
        actualBlockNumber
      };
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn('Failed to get bound witness from XL1 via viewer:', error);
      return null;
    }
  }

  /**
   * Get bound witness chain by following previous_hashes using XL1 viewer
   * This reads directly from the blockchain, not from Archivist
   */
  async getBoundWitnessChainFromXL1(proofHash: string, maxDepth: number = 5): Promise<unknown[]> {
    const chain: unknown[] = [];
    let currentHash: string | null = proofHash;
    let depth = 0;

    try {
      const connection = await this.createRpcConnection();
      
      if (!connection || !connection.viewer) {
        // eslint-disable-next-line no-console
        console.warn('Viewer not available, cannot read chain from XL1');
        return chain;
      }

      const viewer = connection.viewer;

      while (currentHash && depth < maxDepth) {
        try {
          // eslint-disable-next-line no-console
          console.log(`\n=== XL1 VIEWER CHAIN REQUEST ===`);
          // eslint-disable-next-line no-console
          console.log(`Depth: ${depth}`);
          // eslint-disable-next-line no-console
          console.log(`Method: transactionByHash`);
          // eslint-disable-next-line no-console
          console.log(`Transaction Hash: ${currentHash}`);
          // eslint-disable-next-line no-console
          console.log(`========================\n`);
          
          const result = await viewer.transactionByHash(currentHash);
          
          // eslint-disable-next-line no-console
          console.log(`\n=== XL1 VIEWER CHAIN RESPONSE ===`);
          // eslint-disable-next-line no-console
          console.log(`Depth: ${depth}`);
          // eslint-disable-next-line no-console
          console.log(`Transaction Hash: ${currentHash}`);
          if (result) {
            try {
              // eslint-disable-next-line no-console
              console.log(`Result:`, JSON.stringify(result, null, 2));
            } catch {
              // eslint-disable-next-line no-console
              console.log(`Result:`, result);
            }
          } else {
            // eslint-disable-next-line no-console
            console.log(`Result: null (transaction not found)`);
          }
          // eslint-disable-next-line no-console
          console.log(`========================\n`);
          
          if (!result || !Array.isArray(result) || result.length === 0) {
            // eslint-disable-next-line no-console
            console.warn(`Transaction not found in XL1 blockchain: ${currentHash}`);
            break;
          }

          const [transaction] = result;
          chain.push(transaction);

          // Extract previous hash from bound witness
          const bw = transaction as Record<string, unknown>;
          if ('previous_hashes' in bw && Array.isArray(bw.previous_hashes) && bw.previous_hashes.length > 0) {
            const previousHash = bw.previous_hashes[0];
            
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
          // eslint-disable-next-line no-console
          console.error(`Error retrieving bound witness chain from XL1 at depth ${depth}:`, error);
          break;
        }
      }

      // eslint-disable-next-line no-console
      console.log(`Retrieved ${chain.length} transactions from XL1 chain`);
      return chain;
    } catch (error) {
      // eslint-disable-next-line no-console
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
          // eslint-disable-next-line no-console
          console.warn('Viewer not available, cannot check blocks for transaction');
          return null;
        }

        const viewer = connection.viewer;

        // Strategy 1: Try blockByHash with the transaction hash
        // In XL1, transactions might be blocks themselves, or the hash might reference the block
        if (typeof viewer.blockByHash === 'function') {
          try {
            // eslint-disable-next-line no-console
            console.log(`Trying blockByHash with transaction hash: ${transactionHash}`);
            
            const blockByHashResult = await viewer.blockByHash(transactionHash);
            
            if (blockByHashResult && Array.isArray(blockByHashResult)) {
              const [block] = blockByHashResult;
              const blockData = block as Record<string, unknown>;
              
              // Extract block number from the block
              const blockNum = blockData.block as number | undefined;
              if (blockNum !== undefined && blockNum !== null) {
                // eslint-disable-next-line no-console
                console.log(`✓ Found block ${blockNum} via blockByHash for transaction ${transactionHash}`);
                return blockNum;
              }
            }
          } catch (error) {
            // eslint-disable-next-line no-console
            console.log(`blockByHash with transaction hash failed:`, error instanceof Error ? error.message : String(error));
            // Continue to other strategies
          }
        }

        // Strategy 2: Search blocks in the expected range using blockByNumber
        if (typeof viewer.blockByNumber === 'function') {
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
          
          // eslint-disable-next-line no-console
          console.log(`Searching blocks ${startBlock} to ${endBlock} for transaction ${transactionHash}`);

          // Check blocks in the range (limit to reasonable number to avoid long searches)
          const maxBlocksToCheck = 100; // Limit search to prevent timeout
          const blocksToCheck = Math.min(endBlock - startBlock + 1, maxBlocksToCheck);
          
          for (let i = 0; i < blocksToCheck; i++) {
            const blockNum = startBlock + i;
            
            try {
              // eslint-disable-next-line no-console
              console.log(`Checking block ${blockNum} for transaction ${transactionHash}`);
              
              const blockResult = await viewer.blockByNumber(blockNum);
              
              if (blockResult && Array.isArray(blockResult)) {
                const [block, transactions] = blockResult;
                
                // Check if our transaction is in this block's transactions
                if (Array.isArray(transactions)) {
                  // eslint-disable-next-line no-console
                  console.log(`Block ${blockNum} has ${transactions.length} transaction(s)`);
                  
                  for (let txIndex = 0; txIndex < transactions.length; txIndex++) {
                    const tx = transactions[txIndex];
                    
                    // Transaction format might be [boundWitness, payloads] or just boundWitness
                    let txBoundWitness: Record<string, unknown>;
                    if (Array.isArray(tx) && tx.length > 0) {
                      txBoundWitness = tx[0] as Record<string, unknown>;
                    } else if (typeof tx === 'object' && tx !== null) {
                      txBoundWitness = tx as Record<string, unknown>;
                    } else {
                      continue;
                    }
                    
                    const txHash = txBoundWitness._hash || txBoundWitness.hash;
                    
                    // eslint-disable-next-line no-console
                    console.log(`  Transaction ${txIndex}: hash=${txHash}, looking for=${transactionHash}`);
                    
                    if (txHash === transactionHash) {
                      // eslint-disable-next-line no-console
                      console.log(`✓ Found transaction ${transactionHash} in block ${blockNum} at index ${txIndex}`);
                      return blockNum;
                    }
                  }
                } else {
                  // eslint-disable-next-line no-console
                  console.log(`Block ${blockNum} transactions is not an array:`, typeof transactions);
                }
              } else {
                // eslint-disable-next-line no-console
                console.log(`Block ${blockNum} result is not in expected format:`, typeof blockResult);
              }
            } catch (error) {
              // eslint-disable-next-line no-console
              console.warn(`Error checking block ${blockNum}:`, error instanceof Error ? error.message : String(error));
              // Continue to next block
              continue;
            }
          }

          // eslint-disable-next-line no-console
          console.log(`Transaction ${transactionHash} not found in blocks ${startBlock} to ${endBlock}`);
        } else {
          // eslint-disable-next-line no-console
          console.warn('viewer.blockByNumber() is not available - cannot check blocks for transaction');
        }
      }

      // Transaction hasn't been committed yet (still in expected range)
      return null;
    } catch (error) {
      // eslint-disable-next-line no-console
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
        // eslint-disable-next-line no-console
        console.warn('Viewer not available, cannot query block by number');
        return null;
      }

      const viewer = connection.viewer;

      // Try to find a method to query blocks by number
      // Some viewers may have blockByNumber, others may require iterating through blocks
      if (typeof viewer.blockByNumber === 'function') {
        // eslint-disable-next-line no-console
        console.log(`\n=== XL1 VIEWER REQUEST ===`);
        // eslint-disable-next-line no-console
        console.log(`Method: blockByNumber`);
        // eslint-disable-next-line no-console
        console.log(`Block Number: ${blockNumber}`);
        // eslint-disable-next-line no-console
        console.log(`========================\n`);
        
        const result = await viewer.blockByNumber(blockNumber);
        
        // eslint-disable-next-line no-console
        console.log(`\n=== XL1 VIEWER RESPONSE ===`);
        // eslint-disable-next-line no-console
        console.log(`Block Number: ${blockNumber}`);
        if (result) {
          try {
            // eslint-disable-next-line no-console
            console.log(`Result:`, JSON.stringify(result, null, 2));
          } catch {
            // eslint-disable-next-line no-console
            console.log(`Result:`, result);
          }
        }
        // eslint-disable-next-line no-console
        console.log(`========================\n`);
        
        if (result && Array.isArray(result)) {
          const [block, transactions] = result;
          return {
            block,
            transactions: Array.isArray(transactions) ? transactions : []
          };
        }
      } else {
        // eslint-disable-next-line no-console
        console.warn('viewer.blockByNumber() is not available - block number queries may not be supported');
      }

      return null;
    } catch (error) {
      // eslint-disable-next-line no-console
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
        // eslint-disable-next-line no-console
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
        // eslint-disable-next-line no-console
        console.warn('HttpRpcXyoConnection not found in @xyo-network/xl1-rpc');
        return null;
      }

      // Create connection without account (read-only for viewer)
      const HttpRpcXyoConnectionClass = HttpRpcXyoConnection as any;
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
            } else if (typeof (connection as any).getViewer === 'function') {
              connection.viewer = await (connection as any).getViewer();
            } else {
              // eslint-disable-next-line no-console
              console.warn('Viewer not available on connection after initialization');
              return null;
            }
          } catch {
            // eslint-disable-next-line no-console
            console.warn('Failed to initialize viewer on connection');
            return null;
          }
        }
      }

      // Verify viewer has the methods we need
      if (!connection.viewer || typeof connection.viewer.transactionByHash !== 'function') {
        // eslint-disable-next-line no-console
        console.warn('Viewer does not have transactionByHash method');
        return null;
      }

      // Log available viewer methods for debugging
      if (connection.viewer) {
        const viewerMethods = Object.getOwnPropertyNames(Object.getPrototypeOf(connection.viewer))
          .filter(name => typeof (connection.viewer as any)[name] === 'function' && name !== 'constructor');
        // eslint-disable-next-line no-console
        console.log('Available viewer methods:', viewerMethods);
        
        // Check for blockByNumber method
        if (typeof (connection.viewer as any).blockByNumber === 'function') {
          // eslint-disable-next-line no-console
          console.log('✓ viewer.blockByNumber() is available');
        } else {
          // eslint-disable-next-line no-console
          console.log('⚠ viewer.blockByNumber() is not available - block number queries may not be supported');
        }
      }

      return connection;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn('Failed to create RPC connection for viewer:', error);
      return null;
    }
  }
}

