/**
 * Service for creating XL1 blockchain transactions
 * Handles wallet management, transaction building, and submission
 */

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - Shared types outside rootDir
import type { DeliveryVerificationPayload } from '../../../../shared/types/delivery.types.js';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - Shared types outside rootDir
import type { LocationProofDetails, ProofVerificationResult } from '../../../../shared/types/xyo.types.js';

import { env } from '../../lib/env.js';
import { prisma } from '../../lib/prisma.js';
import { ArchivistService } from './archivist-service.js';
import { Xl1TransactionBuilder } from './xl1-transaction-builder.js';
import { Xl1TransactionSubmitter } from './xl1-transaction-submitter.js';
import { Xl1WalletManager } from './xl1-wallet-manager.js';
import { XyoSdkLoader } from './sdk-loader.js';
import { installXl1RpcLogger } from './xl1-rpc-logger.js';

export class XL1TransactionService {
  private walletManager: Xl1WalletManager;
  private transactionBuilder: Xl1TransactionBuilder;
  private transactionSubmitter: Xl1TransactionSubmitter;
  private archivistService: ArchivistService;

  constructor() {
    this.walletManager = new Xl1WalletManager();
    this.transactionBuilder = new Xl1TransactionBuilder();
    this.transactionSubmitter = new Xl1TransactionSubmitter();
    this.archivistService = new ArchivistService();
  }

  /**
   * Get the most recent previous delivery proof hash for a driver
   * Returns null if this is the driver's first delivery
   */
  private async getPreviousDeliveryProofHash(driverId: string, excludeOrderId?: string): Promise<string | null> {
    try {
      // eslint-disable-next-line no-console
      console.log(`[Driver Chain] Querying previous delivery for driver: ${driverId}${excludeOrderId ? ` (excluding ${excludeOrderId})` : ''}`);
      
      const previousDelivery = await prisma.delivery.findFirst({
        where: {
          driverId,
          proofHash: { not: null },
          // Use 'DELIVERED' status (not 'VERIFIED') - this is the status set when a delivery is verified
          status: 'DELIVERED',
          // Exclude the current delivery if it's already in the database
          ...(excludeOrderId ? { orderId: { not: excludeOrderId } } : {})
        },
        orderBy: { verifiedAt: 'desc' },
        select: { 
          proofHash: true,
          orderId: true,
          verifiedAt: true,
          status: true
        }
      });

      if (previousDelivery) {
        // eslint-disable-next-line no-console
        console.log(`[Driver Chain] Found previous delivery: ${previousDelivery.orderId}, proofHash: ${previousDelivery.proofHash?.substring(0, 16)}..., verifiedAt: ${previousDelivery.verifiedAt}, status: ${previousDelivery.status}`);
        return previousDelivery.proofHash ?? null;
      } else {
        // eslint-disable-next-line no-console
        console.log(`[Driver Chain] No previous delivery found for driver ${driverId}`);
        
        // Debug: Check if there are any deliveries for this driver (even without proofHash)
        const allDeliveries = await prisma.delivery.findMany({
          where: { driverId },
          select: { orderId: true, proofHash: true, status: true, verifiedAt: true },
          orderBy: { verifiedAt: 'desc' },
          take: 5
        });
        
        if (allDeliveries.length > 0) {
          // eslint-disable-next-line no-console
          console.log(`[Driver Chain] Debug: Found ${allDeliveries.length} delivery(ies) for driver ${driverId}:`, 
            allDeliveries.map(d => ({
              orderId: d.orderId,
              hasProofHash: !!d.proofHash,
              status: d.status,
              verifiedAt: d.verifiedAt
            }))
          );
        }
        
        return null;
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('[Driver Chain] Failed to query previous delivery for driver chain:', error);
      return null;
    }
  }

  /**
   * Update bound witness to include driver's previous delivery hash in previous_hashes
   * This creates a cryptographic chain of deliveries for each driver
   * 
   * NOTE: This modifies the bound witness copy we store in our database, not the blockchain version.
   * The blockchain bound witness retains its original previous_hashes based on account transaction history.
   * Our stored copy includes the driver's previous delivery hash for application-level proof chaining.
   * 
   * IMPORTANT: previous_hashes is address-indexed. previous_hashes[i] corresponds to addresses[i].
   * We need to find the account address index and update that specific position.
   */
  private updateBoundWitnessWithDriverChain(
    boundWitness: unknown,
    previousDeliveryHash: string | null,
    accountAddress: string
  ): unknown {
    if (!boundWitness || typeof boundWitness !== 'object') {
      return boundWitness;
    }

    const bw = boundWitness as Record<string, unknown>;
    
    // Update previous_hashes to include the driver's previous delivery
    // This creates a driver-specific proof chain for the Proof Chain UI
    if (previousDeliveryHash) {
      // Get existing previous_hashes and addresses from blockchain
      const existingPreviousHashes = Array.isArray(bw.previous_hashes) 
        ? (bw.previous_hashes as (string | null)[]) 
        : [];
      const addresses = Array.isArray(bw.addresses) 
        ? (bw.addresses as string[]) 
        : [];
      
      // Find the account address index in the addresses array
      const normalizedAccountAddress = accountAddress.toLowerCase();
      const addressIndex = addresses.findIndex(addr => addr.toLowerCase() === normalizedAccountAddress);
      
      if (addressIndex === -1) {
        // Account address not found - this shouldn't happen, but handle gracefully
        // eslint-disable-next-line no-console
        console.warn(`[Driver Chain] Account address ${accountAddress} not found in bound witness addresses, cannot update driver chain`);
        return boundWitness;
      }
      
      // Ensure previous_hashes array is large enough
      while (existingPreviousHashes.length <= addressIndex) {
        existingPreviousHashes.push(null);
      }
      
      // Update the previous hash at the account address index
      existingPreviousHashes[addressIndex] = previousDeliveryHash;
      bw.previous_hashes = existingPreviousHashes;
      
      // eslint-disable-next-line no-console
      console.log(`✓ Linked to driver's previous delivery at address index ${addressIndex}: ${previousDeliveryHash.substring(0, 16)}...`);
    } else {
      // First delivery by this driver - keep blockchain's previous_hashes as-is
      // eslint-disable-next-line no-console
      console.log('✓ First delivery by this driver - starting new driver chain');
    }

    return bw;
  }

  /**
   * Create a location proof using XL1 blockchain transactions
   */
  async createLocationProof(payload: DeliveryVerificationPayload): Promise<LocationProofDetails> {
    // MOCK MODE: Return stubbed transaction hash for development
    const MOCK_MODE = env.mockXl1Transactions;

    if (MOCK_MODE) {
      return this.createMockTransaction(payload);
    }

    const networkName = 'XL1';
    const endpoint = env.xyoChainRpcUrl;

    try {
      // Install RPC logger to intercept HTTP requests (both axios and fetch)
      installXl1RpcLogger();
      // Also install fetch interceptor for SDKs that use fetch instead of axios
      const { installFetchInterceptor } = await import('./xl1-rpc-logger.js');
      installFetchInterceptor();
      
      // eslint-disable-next-line no-console
      console.log(`Creating ${networkName} transaction for delivery proof`);

      // 1. Setup wallet and account
      const { account } = await this.walletManager.getAccount();
      const accountAddress = account.address;
      // eslint-disable-next-line no-console
      console.log(`Using ${networkName} account:`, accountAddress);
      
      // Diagnostic: Log account address for transaction history queries
      // eslint-disable-next-line no-console
      console.log(`[DIAGNOSTIC] Account address for transaction history: ${accountAddress}`);

      // 2. Create RPC connection
      const connection = await this.createRpcConnection(endpoint, account);
      // eslint-disable-next-line no-console
      console.log(`Connected to ${networkName} RPC endpoint:`, endpoint);

      // NOTE: The SDK sets previous_hashes internally from account.previousHash, which it retrieves from
      // Account.previousHashStore. In Node.js, IndexedDB is not available, so previous_hashes will be [null].
      // This is an accepted limitation - we maintain application-level driver chains in stored bound witness copies.

      // 2.5. Diagnostic: Query account's transaction history to see what SDK will use for previous_hashes
      try {
        if (connection.viewer) {
          // eslint-disable-next-line no-console
          console.log(`[DIAGNOSTIC] ========================================`);
          // eslint-disable-next-line no-console
          console.log(`[DIAGNOSTIC] ACCOUNT TRANSACTION HISTORY DIAGNOSTIC`);
          // eslint-disable-next-line no-console
          console.log(`[DIAGNOSTIC] SDK Version: @xyo-network/sdk-js ^3.0.0`);
          // eslint-disable-next-line no-console
          console.log(`[DIAGNOSTIC] Account address: ${accountAddress}`);
          // eslint-disable-next-line no-console
          console.log(`[DIAGNOSTIC] Querying account transaction history...`);
          
          // Log available viewer methods for debugging
          const viewerMethods = Object.keys(connection.viewer || {}).filter(key => 
            typeof (connection.viewer as any)[key] === 'function'
          );
          // eslint-disable-next-line no-console
          console.log(`[DIAGNOSTIC] Available viewer methods:`, viewerMethods);
          
          // Log all viewer properties (including non-function properties) for SDK 5.2.10+ discovery
          const allViewerProperties = Object.keys(connection.viewer || {});
          // eslint-disable-next-line no-console
          console.log(`[DIAGNOSTIC] All viewer properties:`, allViewerProperties);
          
          // Try to get the account's recent transactions
          // Note: The exact method may vary by SDK version
          // SDK 5.2.10+ may have additional methods
          try {
            let accountTransactions: unknown = null;
            let transactionCount = 0;
            let lastTransactionHash: string | null = null;
            let methodUsed: string | null = null;
            
            // Try different possible method names (expanded for SDK 5.2.10+)
            const methodAttempts = [
              'getTransactionsByAddress',
              'accountTransactions',
              'getAccountTransactions',
              'transactionsByAddress',
              'getTransactions',
              'queryTransactions',
              'findTransactions',
              'listTransactions',
              'getTransactionHistory',
              'transactionHistory'
            ];
            
            for (const methodName of methodAttempts) {
              if (typeof (connection.viewer as any)[methodName] === 'function') {
                // eslint-disable-next-line no-console
                console.log(`[DIAGNOSTIC] Attempting to use viewer method: ${methodName}`);
                try {
                  accountTransactions = await (connection.viewer as any)[methodName](accountAddress);
                  methodUsed = methodName;
                  // eslint-disable-next-line no-console
                  console.log(`[DIAGNOSTIC] ✓ Successfully called ${methodName}`);
                  break;
                } catch (methodError) {
                  // eslint-disable-next-line no-console
                  console.log(`[DIAGNOSTIC] ⚠ Method ${methodName} exists but failed:`, methodError instanceof Error ? methodError.message : String(methodError));
                  // Continue to next method
                }
              }
            }
            
            if (!methodUsed) {
              // eslint-disable-next-line no-console
              console.log(`[DIAGNOSTIC] ⚠ None of the attempted transaction history methods are available`);
            }
            
            if (accountTransactions) {
              if (Array.isArray(accountTransactions)) {
                transactionCount = accountTransactions.length;
                // eslint-disable-next-line no-console
                console.log(`[DIAGNOSTIC] Found ${transactionCount} transaction(s) for this account`);
                
                if (transactionCount > 0) {
                  const lastTx = accountTransactions[transactionCount - 1] as any;
                  lastTransactionHash = lastTx?._hash || lastTx?.hash || lastTx?._hash || null;
                  if (lastTransactionHash) {
                    // eslint-disable-next-line no-console
                    console.log(`[DIAGNOSTIC] ✓ Most recent transaction hash: ${lastTransactionHash.substring(0, 16)}...`);
                    // eslint-disable-next-line no-console
                    console.log(`[DIAGNOSTIC]   This should be used as previous_hash for the next transaction`);
                  } else {
                    // eslint-disable-next-line no-console
                    console.log(`[DIAGNOSTIC] ⚠ Most recent transaction found but no hash available`);
                  }
                } else {
                  // eslint-disable-next-line no-console
                  console.log(`[DIAGNOSTIC] ⚠ No previous transactions found - this account's first transaction will have previous_hash: null`);
                }
              } else {
                // eslint-disable-next-line no-console
                console.log(`[DIAGNOSTIC] Transaction history query returned non-array:`, typeof accountTransactions);
              }
            } else {
              if (methodUsed) {
                // eslint-disable-next-line no-console
                console.log(`[DIAGNOSTIC] ⚠ Method ${methodUsed} was called but returned null/undefined`);
              } else {
                // eslint-disable-next-line no-console
                console.log(`[DIAGNOSTIC] ⚠ No account transaction query method available on viewer`);
              }
              // eslint-disable-next-line no-console
              console.log(`[DIAGNOSTIC] SDK will determine previous_hashes internally (method not exposed or returned no data)`);
            }
          } catch (queryError) {
            // eslint-disable-next-line no-console
            console.warn(`[DIAGNOSTIC] Failed to query account transaction history:`, queryError instanceof Error ? queryError.message : String(queryError));
            if (queryError instanceof Error && queryError.stack) {
              // eslint-disable-next-line no-console
              console.warn(`[DIAGNOSTIC] Stack:`, queryError.stack);
            }
          }
          
          // eslint-disable-next-line no-console
          console.log(`[DIAGNOSTIC] ========================================`);
        } else {
          // eslint-disable-next-line no-console
          console.log(`[DIAGNOSTIC] ⚠ No viewer available on connection for transaction history query`);
          // eslint-disable-next-line no-console
          console.log(`[DIAGNOSTIC] SDK will determine previous_hashes internally`);
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.warn(`[DIAGNOSTIC] Error during transaction history diagnostic:`, error instanceof Error ? error.message : String(error));
      }

      // 3. Create Gateway for transaction submission (following explore project pattern)
      const gateway = await this.createGateway(connection, account);
      // eslint-disable-next-line no-console
      console.log(`Created ${networkName} gateway for transaction submission`);

      // Wrap gateway methods for logging
      const wrappedGateway = this.wrapGatewayForLogging(gateway, endpoint);

      // 4. Get previous delivery proof hash for driver chain linking
      // Exclude current orderId if it's provided in metadata (for updates to existing deliveries)
      const currentOrderId = payload.metadata?.orderId as string | undefined;
      const previousDeliveryHash = await this.getPreviousDeliveryProofHash(payload.driverId, currentOrderId);
      if (previousDeliveryHash) {
        // eslint-disable-next-line no-console
        console.log(`Found previous delivery for driver ${payload.driverId}: ${previousDeliveryHash.substring(0, 16)}...`);
      } else {
        // eslint-disable-next-line no-console
        console.log(`No previous delivery found for driver ${payload.driverId} - this will be the first in their chain`);
      }

      // 5. Build transaction payloads
      const { onChainPayloads, offChainPayloads } = await this.transactionBuilder.buildPayloads(payload);

      // 5.5. Diagnostic: Log what we're about to submit
      // eslint-disable-next-line no-console
      console.log(`[DIAGNOSTIC] About to submit transaction from account: ${accountAddress}`);
      // eslint-disable-next-line no-console
      console.log(`[DIAGNOSTIC] SDK will automatically determine previous_hashes based on account transaction history`);

      // 6. Submit transaction using gateway.addPayloadsToChain() (matches explore project pattern)
      // This is the recommended pattern from helloWorld.ts and explore project
      // NOTE: Off-chain payloads are NOT automatically stored by the Gateway and must be manually inserted
      const [txHash] = await wrappedGateway.addPayloadsToChain(onChainPayloads, offChainPayloads);
      
      // eslint-disable-next-line no-console
      console.log(`✓ XL1 transaction submitted: ${txHash}`);
      // eslint-disable-next-line no-console
      console.log(`[DIAGNOSTIC] Transaction hash returned by SDK: ${txHash}`);

      // 7. Wait for confirmation using gateway.confirmSubmittedTransaction() (matches explore project pattern)
      const confirmed = await wrappedGateway.confirmSubmittedTransaction(txHash, { logger: console });
      
      if (!confirmed) {
        // eslint-disable-next-line no-console
        console.warn('⚠ XL1 transaction confirmation returned null');
      } else {
        // Diagnostic: Log what previous_hashes the SDK set in the blockchain transaction
        // IMPORTANT: previous_hashes is address-indexed. previous_hashes[i] corresponds to addresses[i]
        try {
          const confirmedArray = confirmed as unknown[];
          const confirmedBoundWitness = confirmedArray[0] as any;
          if (confirmedBoundWitness) {
            const sdkPreviousHashes = confirmedBoundWitness.previous_hashes;
            const sdkAddresses = confirmedBoundWitness.addresses;
            // eslint-disable-next-line no-console
            console.log(`[DIAGNOSTIC] SDK-set previous_hashes in blockchain transaction:`, sdkPreviousHashes);
            // eslint-disable-next-line no-console
            console.log(`[DIAGNOSTIC] SDK-set addresses in blockchain transaction:`, sdkAddresses);
            
            // Find the account address index
            if (Array.isArray(sdkAddresses) && Array.isArray(sdkPreviousHashes)) {
              const normalizedAccountAddress = accountAddress.toLowerCase();
              const addressIndex = sdkAddresses.findIndex((addr: string) => addr.toLowerCase() === normalizedAccountAddress);
              
              if (addressIndex !== -1 && addressIndex < sdkPreviousHashes.length) {
                const accountPreviousHash = sdkPreviousHashes[addressIndex];
                // eslint-disable-next-line no-console
                console.log(`[DIAGNOSTIC] Account address index: ${addressIndex}`);
                if (accountPreviousHash && accountPreviousHash !== null) {
                  // eslint-disable-next-line no-console
                  console.log(`[DIAGNOSTIC] ✓ SDK found previous transaction for account (index ${addressIndex}): ${String(accountPreviousHash).substring(0, 16)}...`);
                } else {
                  // eslint-disable-next-line no-console
                  console.log(`[DIAGNOSTIC] ⚠ SDK set previous_hashes[${addressIndex}] to null - this account may have no previous transactions, or SDK couldn't query transaction history`);
                }
              } else {
                // eslint-disable-next-line no-console
                console.log(`[DIAGNOSTIC] ⚠ Account address ${accountAddress} not found in addresses array, or index out of bounds`);
              }
              
              // Also log first address's previous hash for reference
              if (sdkPreviousHashes.length > 0) {
                const firstPreviousHash = sdkPreviousHashes[0];
                if (firstPreviousHash && firstPreviousHash !== null) {
                  // eslint-disable-next-line no-console
                  console.log(`[DIAGNOSTIC] First address's previous_hashes[0]: ${String(firstPreviousHash).substring(0, 16)}...`);
                } else {
                  // eslint-disable-next-line no-console
                  console.log(`[DIAGNOSTIC] ⚠ SDK set previous_hashes[0] to null`);
                }
              }
            } else {
              // eslint-disable-next-line no-console
              console.log(`[DIAGNOSTIC] ⚠ SDK set previous_hashes to empty/null - this account may have no previous transactions`);
            }
            
            // Also log the bound witness hash for reference
            const boundWitnessHash = confirmedBoundWitness._hash || confirmedBoundWitness.hash;
            // eslint-disable-next-line no-console
            console.log(`[DIAGNOSTIC] This transaction's bound witness hash: ${boundWitnessHash}`);
          }
        } catch (diagError) {
          // eslint-disable-next-line no-console
          console.warn(`[DIAGNOSTIC] Error extracting previous_hashes from confirmed transaction:`, diagError instanceof Error ? diagError.message : String(diagError));
        }
      }
      // eslint-disable-next-line no-console
      console.log('========================\n');

      // 7.5. Diagnostic: Compare SDK's previous_hashes with our driver chain expectations
      if (confirmed) {
        try {
          const confirmedArray = confirmed as unknown[];
          const confirmedBoundWitness = confirmedArray[0] as any;
          if (confirmedBoundWitness) {
            const sdkPreviousHashes = confirmedBoundWitness.previous_hashes;
            const sdkAddresses = confirmedBoundWitness.addresses;
            
            // Find the account address index to get the correct previous hash
            let sdkAccountPreviousHash: string | null = null;
            if (Array.isArray(sdkAddresses) && Array.isArray(sdkPreviousHashes)) {
              const normalizedAccountAddress = accountAddress.toLowerCase();
              const addressIndex = sdkAddresses.findIndex((addr: string) => addr.toLowerCase() === normalizedAccountAddress);
              
              if (addressIndex !== -1 && addressIndex < sdkPreviousHashes.length) {
                sdkAccountPreviousHash = sdkPreviousHashes[addressIndex];
              }
            }
            
            // eslint-disable-next-line no-console
            console.log(`[DIAGNOSTIC] ========================================`);
            // eslint-disable-next-line no-console
            console.log(`[DIAGNOSTIC] PREVIOUS_HASHES COMPARISON`);
            // eslint-disable-next-line no-console
            console.log(`[DIAGNOSTIC] Account address: ${accountAddress}`);
            // eslint-disable-next-line no-console
            console.log(`[DIAGNOSTIC] SDK-set previous_hashes[accountIndex]: ${sdkAccountPreviousHash ? String(sdkAccountPreviousHash).substring(0, 16) + '...' : 'null'}`);
            if (previousDeliveryHash) {
              // eslint-disable-next-line no-console
              console.log(`[DIAGNOSTIC] Driver chain previous_hash: ${previousDeliveryHash.substring(0, 16)}...`);
              if (sdkAccountPreviousHash === previousDeliveryHash) {
                // eslint-disable-next-line no-console
                console.log(`[DIAGNOSTIC] ✓ Match! SDK and driver chain agree`);
              } else {
                // eslint-disable-next-line no-console
                console.log(`[DIAGNOSTIC] ⚠ Mismatch - SDK used different previous_hash than driver chain`);
                // eslint-disable-next-line no-console
                console.log(`[DIAGNOSTIC]   This is expected: SDK uses account transaction history, not driver chains`);
              }
            } else {
              // eslint-disable-next-line no-console
              console.log(`[DIAGNOSTIC] No driver chain previous_hash (first delivery by this driver)`);
            }
            // eslint-disable-next-line no-console
            console.log(`[DIAGNOSTIC] ========================================`);
          }
        } catch (diagError) {
          // eslint-disable-next-line no-console
          console.warn(`[DIAGNOSTIC] Error during previous_hashes comparison:`, diagError instanceof Error ? diagError.message : String(diagError));
        }
      }

      // 7.6. Update bound witness with driver chain link
      // The SDK creates the bound witness automatically, but we can update our stored copy
      // to include the driver's previous delivery hash for application-level chaining
      // IMPORTANT: previous_hashes is address-indexed, so we need to update the correct index
      let updatedBoundWitness = confirmed;
      if (confirmed && previousDeliveryHash) {
        const confirmedArray = confirmed as unknown[];
        const boundWitness = confirmedArray[0];
        const payloads = confirmedArray.slice(1);
        
        // eslint-disable-next-line no-console
        console.log(`[Driver Chain] Before update - previous_hashes:`, (boundWitness as any)?.previous_hashes);
        // eslint-disable-next-line no-console
        console.log(`[Driver Chain] Account address: ${accountAddress}`);
        
        const updatedBw = this.updateBoundWitnessWithDriverChain(boundWitness, previousDeliveryHash, accountAddress);
        updatedBoundWitness = [updatedBw, ...payloads];
        
        // eslint-disable-next-line no-console
        console.log(`[Driver Chain] After update - previous_hashes:`, (updatedBw as any)?.previous_hashes);
        // eslint-disable-next-line no-console
        console.log('✓ Updated bound witness with driver chain link');
      } else {
        if (!confirmed) {
          // eslint-disable-next-line no-console
          console.warn('[Driver Chain] Cannot update bound witness - confirmed transaction is null');
        }
        if (!previousDeliveryHash) {
          // eslint-disable-next-line no-console
          console.log('[Driver Chain] No previous delivery hash - skipping driver chain link update');
        }
      }

      // 7.6. Manually insert off-chain payloads into Archivist
      // Off-chain payloads are NOT automatically stored by the Gateway and must be manually inserted
      let archivistBoundWitnessHash: string | undefined;
      if (offChainPayloads.length > 0) {
        try {
          // eslint-disable-next-line no-console
          console.log('=== ARCHIVIST INSERT (REQUIRED) ===');
          // eslint-disable-next-line no-console
          console.log('Inserting off-chain payloads into Archivist (Gateway does not store them automatically)...');
          // Insert off-chain payloads into Archivist (if not disabled)
          let insertResult: { success: boolean; inserted: number; error?: string; archivistBoundWitnessHash?: string } = { success: false, inserted: 0, error: 'Archivist disabled' };
          if (!env.xyoArchivistDisabled) {
            insertResult = await this.archivistService.insertPayloads(offChainPayloads);
          } else {
            // eslint-disable-next-line no-console
            console.log('Archivist is disabled (XYO_ARCHIVIST_DISABLED=true), skipping off-chain payload insertion');
          }
          
          if (insertResult.success) {
            // eslint-disable-next-line no-console
            console.log(`✓ Successfully inserted ${insertResult.inserted} off-chain payload(s) into Archivist`);
            // Extract Archivist bound witness hash for Diviner queries
            // IMPORTANT: This is different from the XL1 transaction hash
            // - XL1 transaction hash = on-chain bound witness (for blockchain proof)
            // - Archivist bound witness hash = off-chain bound witness (for Diviner queries)
            archivistBoundWitnessHash = insertResult.archivistBoundWitnessHash;
            if (archivistBoundWitnessHash) {
              // eslint-disable-next-line no-console
              console.log(`✓ Archivist bound witness hash: ${archivistBoundWitnessHash}`);
              // eslint-disable-next-line no-console
              console.log(`  - Use this hash (not XL1 transaction hash) for Diviner queries`);
            } else {
              // eslint-disable-next-line no-console
              console.warn(`⚠ No Archivist bound witness hash returned - Diviner queries may fail`);
            }
          } else {
            // eslint-disable-next-line no-console
            console.error(`✗ Archivist insert failed: ${insertResult.error}`);
            // eslint-disable-next-line no-console
            console.error('Off-chain payloads were NOT stored in Archivist - this is required for proper verification');
          }
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error('Failed to insert payloads into Archivist:', error);
          // eslint-disable-next-line no-console
          console.error('Off-chain payloads were NOT stored in Archivist - this is required for proper verification');
        }
      }

      // 8. Extract results from confirmed transaction
      // updatedBoundWitness is a SignedHydratedTransaction which is [boundWitness, payloads]
      // Following explore project pattern: payloads come WITH the transaction, not from Archivist
      const confirmedArray = updatedBoundWitness as unknown[];
      const boundWitness = confirmedArray[0] as any;
      const confirmedPayloads = (Array.isArray(confirmedArray[1]) ? confirmedArray[1] : []) as unknown[];
      const confirmedHash = boundWitness._hash || boundWitness.hash || txHash;
      
      // Extract nbf (not before) and exp (expiration) from bound witness
      // These represent the expected block range for the transaction
      const nbf = boundWitness.nbf ?? boundWitness.blockNumber ?? 0;
      const exp = boundWitness.exp ?? (nbf + 1000);
      
      // Check for actual block number (if transaction has been committed)
      // Actual block number is typically in blockNumber field if different from nbf
      const actualBlockNumber = boundWitness.blockNumber && boundWitness.blockNumber !== nbf 
        ? boundWitness.blockNumber 
        : null;
      
      // Use actual block number if available, otherwise use nbf as fallback
      const blockNumber = actualBlockNumber ?? nbf;

      // Extract payloads from confirmed transaction

      // 8. Extract off-chain payload (network.xyo.chaincheck) from transaction payloads
      // The payloads are already included in the transaction response (explore project pattern)
      // However, XL1 transactions typically only include on-chain payloads (hash references)
      // The actual off-chain payloads (network.xyo.chaincheck) are stored in Archivist
      let offChainPayloadData: unknown = null;
      try {
        // Find the chaincheck payload in the transaction payloads
        const chaincheckPayload = confirmedPayloads.find((p: unknown) => {
          if (typeof p === 'object' && p !== null) {
            const payload = p as Record<string, unknown>;
            return payload.schema === 'network.xyo.chaincheck';
          }
          return false;
        });

        if (chaincheckPayload) {
          offChainPayloadData = chaincheckPayload;
        } else {
          // XL1 transactions typically only include hash references on-chain
          // The actual payloads are stored off-chain in Archivist
          // Extract the chaincheck payload hash from the bound witness payload_hashes
          const payloadHashes = boundWitness.payload_hashes || [];
          const payloadSchemas = boundWitness.payload_schemas || [];
          const chaincheckIndex = payloadSchemas.indexOf('network.xyo.chaincheck');
          
          if (chaincheckIndex >= 0 && chaincheckIndex < payloadHashes.length) {
            const chaincheckHash = payloadHashes[chaincheckIndex];
            
            // Query Archivist for the actual chaincheck payload using the hash from bound witness
            // The Data Lake service (used by archivistService.verifyLocationProof) handles retries with delays
            // Direct HTTP fallback calls always return 401, so no retry logic needed there
            // Skip if Archivist is disabled
            let archivistResult: ProofVerificationResult = { isValid: false, data: null, errors: ['Archivist is disabled'] };
            if (!env.xyoArchivistDisabled) {
              archivistResult = await this.archivistService.verifyLocationProof(chaincheckHash);
            } else {
              // eslint-disable-next-line no-console
              console.log('Archivist is disabled (XYO_ARCHIVIST_DISABLED=true), skipping payload retrieval');
            }
            
            if (archivistResult.isValid && archivistResult.data) {
              // Extract the actual payload from the response
              // Archivist may return it wrapped in different structures
              const responseData = archivistResult.data;
              let extractedPayload: unknown = null;
              
              // Try to extract payload from response structure
              if (typeof responseData === 'object' && responseData !== null) {
                const data = responseData as Record<string, unknown>;
                
                // Check if it's a payload object with schema
                if ('schema' in data && data.schema === 'network.xyo.chaincheck') {
                  extractedPayload = data;
                } else if ('data' in data && Array.isArray(data.data)) {
                  // Response might be wrapped: { data: [payloads...] }
                  const payloads = data.data as unknown[];
                  extractedPayload = payloads.find((p: unknown) => {
                    if (typeof p === 'object' && p !== null) {
                      const payload = p as Record<string, unknown>;
                      return payload.schema === 'network.xyo.chaincheck';
                    }
                    return false;
                  });
                }
              }
              
              if (extractedPayload) {
                offChainPayloadData = extractedPayload;
                // eslint-disable-next-line no-console
                console.log('✓ Successfully extracted chaincheck payload from Archivist response');
              } else {
                // eslint-disable-next-line no-console
                console.warn('⚠ Archivist response does not contain chaincheck payload');
                // eslint-disable-next-line no-console
                console.warn('Payload may not be indexed yet, or response structure is unexpected');
              }
            } else {
              // eslint-disable-next-line no-console
              console.warn('✗ Off-chain payload not yet available in Archivist (may need propagation time)');
            }
          } else {
            // eslint-disable-next-line no-console
            console.warn('⚠ Chaincheck payload hash not found in bound witness payload_hashes');
          }
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.warn('Failed to extract off-chain payload:', error);
        // Don't fail the transaction if payload extraction fails
        // The transaction is already confirmed on-chain
      }

      return {
        proofHash: confirmedHash,
        xl1TransactionHash: confirmedHash,
        archivistBoundWitnessHash: archivistBoundWitnessHash, // Hash for Diviner queries (different from XL1 transaction hash)
        xl1BlockNumber: blockNumber,
        xl1Nbf: nbf,
        xl1Exp: exp,
        xl1ActualBlockNumber: actualBlockNumber,
        blockNumber,
        boundWitness: updatedBoundWitness, // Use updated bound witness with driver chain link
        isXL1: true,
        isMocked: false,
        archivistResponse: {
          success: true,
          data: updatedBoundWitness, // Use updated bound witness in response data as well
          // Include off-chain payload data if successfully retrieved
          offChainPayload: offChainPayloadData || undefined
        }
      };
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('XL1 transaction creation error:', error);
      
      // Check if this is an RPC/network error (service unavailable)
      const isRpcError = this.isRpcServiceError(error);
      
      if (isRpcError) {
        // Create a more specific error for RPC service failures
        const rpcError = new Error('XL1 blockchain service is temporarily unavailable');
        (rpcError as any).isRpcError = true;
        (rpcError as any).statusCode = 503;
        (rpcError as any).originalError = error instanceof Error ? error.message : String(error);
        throw rpcError;
      }
      
      // For other errors, throw generic error
      throw new Error(
        `Failed to create XL1 transaction: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Check if an error is an RPC service error (network outage, service unavailable, etc.)
   */
  private isRpcServiceError(error: unknown): boolean {
    if (!error) return false;
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorString = errorMessage.toLowerCase();
    
    // Check for common RPC/network error patterns
    const rpcErrorPatterns = [
      'rpc method',
      'rpc error',
      'cannot read properties',
      'network error',
      'connection refused',
      'timeout',
      'service unavailable',
      'econnrefused',
      'enotfound',
      'econnreset',
      'http error',
      'fetch failed',
      'request failed'
    ];
    
    return rpcErrorPatterns.some(pattern => errorString.includes(pattern));
  }

  /**
   * Create mock transaction for development
   */
  private async createMockTransaction(payload: DeliveryVerificationPayload): Promise<LocationProofDetails> {
    // Get previous delivery proof hash for driver chain linking (even in mock mode)
    const previousDeliveryHash = await this.getPreviousDeliveryProofHash(payload.driverId);
    if (previousDeliveryHash) {
      // eslint-disable-next-line no-console
      console.log(`[MOCK] Found previous delivery for driver ${payload.driverId}: ${previousDeliveryHash.substring(0, 16)}...`);
    } else {
      // eslint-disable-next-line no-console
      console.log(`[MOCK] No previous delivery found for driver ${payload.driverId} - this will be the first in their chain`);
    }
    const presetHash = env.mockXl1TransactionId;

    if (presetHash) {
      // eslint-disable-next-line no-console
      console.log('=== MOCK MODE: Using preset XL1 transaction ID from env ===');
      // eslint-disable-next-line no-console
      console.log('Preset XL1 transaction hash (MOCK_XL1_TRANSACTION_ID):', presetHash);

      // Try to fetch real bound witness data from Archivist if this is a valid transaction ID
      // This allows the UI to display real blockchain data (Proof Chain, Cryptographic Details)
      // even though we're in mock mode (not actually submitting new transactions)
      try {
        // eslint-disable-next-line no-console
        console.log('Attempting to fetch real bound witness data from Archivist for transaction:', presetHash);
        // Skip if Archivist is disabled
        let archivistResult: ProofVerificationResult = { isValid: false, data: null, errors: ['Archivist is disabled'] };
        if (!env.xyoArchivistDisabled) {
          archivistResult = await this.archivistService.verifyLocationProof(presetHash);
        } else {
          // eslint-disable-next-line no-console
          console.log('Archivist is disabled (XYO_ARCHIVIST_DISABLED=true), skipping bound witness retrieval');
        }
        
        if (archivistResult.isValid && archivistResult.data) {
          // Extract bound witness from Archivist response
          const boundWitnessData = archivistResult.data;
          let boundWitness: unknown = null;
          let payloads: unknown[] = [];

          // Handle different response formats
          if (Array.isArray(boundWitnessData) && Array.isArray(boundWitnessData) && boundWitnessData.length > 0) {
            boundWitness = boundWitnessData[0];
            payloads = (boundWitnessData as unknown[]).slice(1);
          } else if (typeof boundWitnessData === 'object' && boundWitnessData !== null) {
            const data = boundWitnessData as Record<string, unknown>;
            if ('data' in data && Array.isArray(data.data) && data.data.length > 0) {
              boundWitness = data.data[0];
              payloads = data.data.slice(1);
            } else {
              boundWitness = boundWitnessData;
            }
          }

          if (boundWitness && typeof boundWitness === 'object') {
            const bw = boundWitness as Record<string, unknown>;
            
            // Extract block number from bound witness if available
            const blockNumber = (bw.nbf as number | undefined) || 
                               (bw.blockNumber as number | undefined) ||
                               Math.floor(Date.now() / 1000) % 1000000;

            // eslint-disable-next-line no-console
            console.log('Successfully retrieved real bound witness data from Archivist');
            // eslint-disable-next-line no-console
            console.log('Using real blockchain data for Proof Chain and Cryptographic Details');

            return {
              proofHash: presetHash,
              xl1TransactionHash: presetHash,
              xl1BlockNumber: blockNumber,
              blockNumber: blockNumber,
              boundWitness: boundWitness ? [boundWitness, ...payloads] : undefined,
              isXL1: true,
              // Still mark as mocked since we're not actually submitting a new transaction
              // but the data itself is real from the blockchain
              isMocked: true,
              archivistResponse: {
                success: true,
                data: boundWitnessData
              }
            };
          }
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.warn('Failed to fetch real bound witness from Archivist, using mock data:', error);
        // Fall through to mock data creation
      }

      // Fallback: Create mock data if Archivist query failed or returned no data
      const mockBlockNumber = Math.floor(Date.now() / 1000) % 1000000;
      const mockNbf = mockBlockNumber;
      const mockExp = mockBlockNumber + 1000;

      return {
        proofHash: presetHash,
        xl1TransactionHash: presetHash,
        xl1BlockNumber: mockBlockNumber,
        xl1Nbf: mockNbf,
        xl1Exp: mockExp,
        xl1ActualBlockNumber: null, // Mock transactions don't have actual block numbers
        blockNumber: mockBlockNumber,
        boundWitness: [
          {
            schema: 'network.xyo.boundwitness',
            addresses: ['mock_address'],
            payload_hashes: [presetHash],
            payload_schemas: ['network.xyo.chaincheck'],
            previous_hashes: previousDeliveryHash ? [previousDeliveryHash] : [null],
            $signatures: ['mock_signature'],
            _hash: presetHash,
            _dataHash: presetHash,
            _sequence: '00000000000000000000000000000000',
            nbf: mockBlockNumber,
            exp: mockBlockNumber + 1000,
            fees: {
              base: 'e8d4a51000',
              gasLimit: '038d7ea4c68000',
              gasPrice: '02540be400',
              priority: '00'
            },
            chain: env.xyoChainId ?? 'mock_chain_id',
            from: 'mock_address'
          },
          []
        ],
        isXL1: true,
        isMocked: true,
        archivistResponse: {
          success: true,
          data: {
            schema: 'network.xyo.boundwitness',
            _hash: presetHash,
            message: 'Mock transaction using preset XL1 transaction ID (real data not available from Archivist)'
          }
        }
      };
    }

    // Fallback: generate a deterministic mock hash when no preset is provided
    // eslint-disable-next-line no-console
    console.log('=== MOCK MODE: Generating stubbed XL1 transaction hash ===');

    const crypto = await import('crypto');
    const hashInput = JSON.stringify({
      deliveryId: payload.deliveryId,
      timestamp: payload.timestamp,
      latitude: payload.latitude,
      longitude: payload.longitude
    });
    const mockHash = crypto.createHash('sha256').update(hashInput).digest('hex');
    const mockBlockNumber = Math.floor(Date.now() / 1000) % 1000000;
    const mockNbf = mockBlockNumber;
    const mockExp = mockBlockNumber + 1000;

    // eslint-disable-next-line no-console
    console.log('Mock transaction hash:', mockHash);
    // eslint-disable-next-line no-console
    console.log('Mock block number:', mockBlockNumber);
    // eslint-disable-next-line no-console
    console.log('Mock nbf:', mockNbf, 'exp:', mockExp);

    return {
      proofHash: mockHash,
      xl1TransactionHash: mockHash,
      xl1BlockNumber: mockBlockNumber,
      xl1Nbf: mockNbf,
      xl1Exp: mockExp,
      xl1ActualBlockNumber: null, // Mock transactions don't have actual block numbers
      blockNumber: mockBlockNumber,
      boundWitness: [
        {
          schema: 'network.xyo.boundwitness',
          addresses: ['mock_address'],
          payload_hashes: [mockHash],
          payload_schemas: ['network.xyo.chaincheck'],
          previous_hashes: previousDeliveryHash ? [previousDeliveryHash] : [null],
          $signatures: ['mock_signature'],
          _hash: mockHash,
          _dataHash: mockHash,
          _sequence: '00000000000000000000000000000000',
          nbf: mockNbf,
          exp: mockExp,
          fees: {
            base: 'e8d4a51000',
            gasLimit: '038d7ea4c68000',
            gasPrice: '02540be400',
            priority: '00'
          },
          chain: env.xyoChainId ?? 'mock_chain_id',
          from: 'mock_address'
        },
        []
      ],
      isXL1: true,
      isMocked: true,
      archivistResponse: {
        success: true,
        data: {
          schema: 'network.xyo.boundwitness',
          _hash: mockHash,
          message: 'Mock transaction for development'
        }
      }
    };
  }

  /**
   * Create RPC connection to XL1 network
   * Returns a connection with account for signing transactions
   * Uses HttpRpcXyoConnection which matches the explore project pattern
   */
  private async createRpcConnection(endpoint: string, account: any) {
    const xl1RpcModule = await XyoSdkLoader.xl1Rpc();

    // Try HttpRpcXyoConnection first (from helloWorld.ts pattern)
    let HttpRpcXyoConnection = (xl1RpcModule as any).HttpRpcXyoConnection;

    // If not found, try RpcXyoConnection (alternative)
    if (!HttpRpcXyoConnection) {
      HttpRpcXyoConnection = (xl1RpcModule as any).RpcXyoConnection;
    }

    // If still not found, check all exports and throw
    if (!HttpRpcXyoConnection) {
      // eslint-disable-next-line no-console
      console.log('Available exports from xl1-rpc:', Object.keys(xl1RpcModule));
      throw new Error('HttpRpcXyoConnection or RpcXyoConnection not found in @xyo-network/xl1-rpc');
    }

    // Create connection with endpoint only (account passed separately to gateway)
    // HttpRpcXyoConnection pattern from helloWorld.ts: new HttpRpcXyoConnection({ endpoint })
    const HttpRpcXyoConnectionClass = HttpRpcXyoConnection as any;
    const connection = new HttpRpcXyoConnectionClass({ endpoint });
    
    // Wrap connection methods to log RPC calls
    return this.wrapConnectionForLogging(connection, endpoint);
  }

  /**
   * Create Gateway for transaction submission (following explore project pattern)
   * Uses SimpleXyoGatewayRunner which provides better abstraction than direct connection calls
   */
  private async createGateway(connection: any, account: any) {
    const xl1ProtocolSdk = await XyoSdkLoader.xl1ProtocolSdk();
    
    const SimpleXyoSigner = (xl1ProtocolSdk as any).SimpleXyoSigner;
    const SimpleXyoGatewayRunner = (xl1ProtocolSdk as any).SimpleXyoGatewayRunner;

    if (!SimpleXyoSigner || !SimpleXyoGatewayRunner) {
      throw new Error('SimpleXyoSigner or SimpleXyoGatewayRunner not found in @xyo-network/xl1-protocol-sdk');
    }

    const signer = new (SimpleXyoSigner as any)(account);
    const gateway = new (SimpleXyoGatewayRunner as any)(connection, signer);

    return gateway;
  }

  /**
   * Wrap gateway methods to log RPC requests/responses
   * The SDK's gateway uses its own HTTP client, so we need to wrap the methods directly
   */
  private wrapGatewayForLogging(gateway: any, endpoint: string): any {
    // Wrap addPayloadsToChain
    if (typeof gateway.addPayloadsToChain === 'function') {
      const originalAddPayloadsToChain = gateway.addPayloadsToChain.bind(gateway);
      gateway.addPayloadsToChain = async (onChainPayloads: unknown[], offChainPayloads: unknown[]) => {
        // Log will be handled by the caller, but we can also log here for HTTP-level details
        try {
          const result = await originalAddPayloadsToChain(onChainPayloads, offChainPayloads);
          return result;
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error('\n=== XL1 GATEWAY SUBMISSION ERROR ===');
          // eslint-disable-next-line no-console
          console.error('Error:', error instanceof Error ? error.message : String(error));
          if (error instanceof Error && error.stack) {
            // eslint-disable-next-line no-console
            console.error('Stack:', error.stack);
          }
          try {
            // eslint-disable-next-line no-console
            console.error('Error Details:', JSON.stringify(error, null, 2));
          } catch {
            // eslint-disable-next-line no-console
            console.error('Error Details:', error);
          }
          // eslint-disable-next-line no-console
          console.error('========================\n');
          throw error;
        }
      };
    }

    // Wrap confirmSubmittedTransaction
    if (typeof gateway.confirmSubmittedTransaction === 'function') {
      const originalConfirm = gateway.confirmSubmittedTransaction.bind(gateway);
      gateway.confirmSubmittedTransaction = async (txHash: string, options?: any) => {
        try {
          const result = await originalConfirm(txHash, options);
          return result;
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error('❌ XL1 transaction confirmation failed:');
          // eslint-disable-next-line no-console
          console.error('Transaction Hash:', txHash);
          // eslint-disable-next-line no-console
          console.error('Error:', error instanceof Error ? error.message : String(error));
          if (error instanceof Error && error.stack) {
            // eslint-disable-next-line no-console
            console.error('Stack:', error.stack);
          }
          try {
            // eslint-disable-next-line no-console
            console.error('Error Details:', JSON.stringify(error, null, 2));
          } catch {
            // eslint-disable-next-line no-console
            console.error('Error Details:', error);
          }
          // eslint-disable-next-line no-console
          console.error('========================\n');
          throw error;
        }
      };
    }

    return gateway;
  }

  /**
   * Get chain information (chain ID, block number)
   */
  private async getChainInfo(connection: any, fallbackChainId: string): Promise<{
    chainId: string;
    nbf: number;
    exp: number;
  }> {
    let chainId: string | undefined;
    let nbf = 0;
    let exp = 1000;

    const viewer = connection.viewer;

    // Prefer explicit chain ID from env if provided
    if (env.xyoChainId) {
      chainId = env.xyoChainId;
      // eslint-disable-next-line no-console
      console.log('Using env XYO_CHAIN_ID as chain ID:', chainId);
    } else if (viewer) {
      try {
        // eslint-disable-next-line no-console
        console.log('\n=== XL1 VIEWER REQUEST ===');
        // eslint-disable-next-line no-console
        console.log('Method: chainId');
        // eslint-disable-next-line no-console
        console.log('========================\n');
        
        chainId = await viewer.chainId();
        
        // eslint-disable-next-line no-console
        console.log('\n=== XL1 VIEWER RESPONSE ===');
        // eslint-disable-next-line no-console
        console.log('Chain ID:', chainId);
        // eslint-disable-next-line no-console
        console.log('========================\n');
        
        // eslint-disable-next-line no-console
        console.log('\n=== XL1 VIEWER REQUEST ===');
        // eslint-disable-next-line no-console
        console.log('Method: currentBlockNumber');
        // eslint-disable-next-line no-console
        console.log('========================\n');
        
        const currentBlockNumber = await viewer.currentBlockNumber();
        
        // eslint-disable-next-line no-console
        console.log('\n=== XL1 VIEWER RESPONSE ===');
        // eslint-disable-next-line no-console
        console.log('Current Block Number:', currentBlockNumber);
        // eslint-disable-next-line no-console
        console.log('========================\n');
        
        if (currentBlockNumber !== undefined && currentBlockNumber !== null) {
          nbf = currentBlockNumber;
          exp = nbf + 1000;
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('\n=== XL1 VIEWER ERROR ===');
        // eslint-disable-next-line no-console
        console.error('Error:', error instanceof Error ? error.message : String(error));
        // eslint-disable-next-line no-console
        console.error('========================\n');
        // Use fallback (account address)
        chainId = fallbackChainId;
        // eslint-disable-next-line no-console
        console.log('Using account address as chain ID:', chainId);
      }
    } else {
      chainId = fallbackChainId;
    }

    if (!chainId) {
      throw new Error('Failed to determine chain ID');
    }

    return { chainId, nbf, exp };
  }

  /**
   * Wrap connection methods to log RPC requests/responses
   * The SDK's connection may use fetch or a custom HTTP client, so we wrap methods directly
   */
  private wrapConnectionForLogging(connection: any, endpoint: string): any {
    // Wrap connection methods that make RPC calls
    // Check if connection has methods we want to wrap
    
    // Wrap submitTransaction if it exists
    if (typeof connection.submitTransaction === 'function') {
      const originalSubmit = connection.submitTransaction.bind(connection);
      connection.submitTransaction = async (onChainPayloads: unknown[], offChainPayloads: unknown[]) => {
        // eslint-disable-next-line no-console
        console.log('\n=== XL1 RPC REQUEST (connection.submitTransaction) ===');
        // eslint-disable-next-line no-console
        console.log('Endpoint:', endpoint);
        // eslint-disable-next-line no-console
        console.log('Method: submitTransaction');
        // eslint-disable-next-line no-console
        console.log('On-chain payloads:', JSON.stringify(onChainPayloads, null, 2));
        // eslint-disable-next-line no-console
        console.log('Off-chain payloads:', JSON.stringify(offChainPayloads, null, 2));
        // eslint-disable-next-line no-console
        console.log('========================\n');
        
        try {
          const result = await originalSubmit(onChainPayloads, offChainPayloads);
          
          // eslint-disable-next-line no-console
          console.log('\n=== XL1 RPC RESPONSE (connection.submitTransaction) ===');
          // eslint-disable-next-line no-console
          console.log('Endpoint:', endpoint);
          if (result) {
            try {
              // eslint-disable-next-line no-console
              console.log('Result:', JSON.stringify(result, null, 2));
            } catch {
              // eslint-disable-next-line no-console
              console.log('Result:', result);
            }
          } else {
            // eslint-disable-next-line no-console
            console.log('Result: null');
          }
          // eslint-disable-next-line no-console
          console.log('========================\n');
          
          return result;
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error('\n=== XL1 RPC ERROR (connection.submitTransaction) ===');
          // eslint-disable-next-line no-console
          console.error('Endpoint:', endpoint);
          // eslint-disable-next-line no-console
          console.error('Error:', error instanceof Error ? error.message : String(error));
          if (error instanceof Error && error.stack) {
            // eslint-disable-next-line no-console
            console.error('Stack:', error.stack);
          }
          try {
            // eslint-disable-next-line no-console
            console.error('Error Details:', JSON.stringify(error, null, 2));
          } catch {
            // eslint-disable-next-line no-console
            console.error('Error Details:', error);
          }
          // eslint-disable-next-line no-console
          console.error('========================\n');
          throw error;
        }
      };
    }

    // Wrap viewer methods if they exist
    if (connection.viewer) {
      const viewer = connection.viewer;
      
      // Wrap transactionByHash
      if (typeof viewer.transactionByHash === 'function') {
        const originalTransactionByHash = viewer.transactionByHash.bind(viewer);
        viewer.transactionByHash = async (hash: string) => {
          // eslint-disable-next-line no-console
          console.log('\n=== XL1 RPC REQUEST (viewer.transactionByHash) ===');
          // eslint-disable-next-line no-console
          console.log('Endpoint:', endpoint);
          // eslint-disable-next-line no-console
          console.log('Method: transactionByHash');
          // eslint-disable-next-line no-console
          console.log('Hash:', hash);
          // eslint-disable-next-line no-console
          console.log('========================\n');
          
          try {
            const result = await originalTransactionByHash(hash);
            
            // eslint-disable-next-line no-console
            console.log('\n=== XL1 RPC RESPONSE (viewer.transactionByHash) ===');
            // eslint-disable-next-line no-console
            console.log('Endpoint:', endpoint);
            // eslint-disable-next-line no-console
            console.log('Hash:', hash);
            if (result) {
              try {
                // eslint-disable-next-line no-console
                console.log('Result:', JSON.stringify(result, null, 2));
              } catch {
                // eslint-disable-next-line no-console
                console.log('Result:', result);
              }
            } else {
              // eslint-disable-next-line no-console
              console.log('Result: null');
            }
            // eslint-disable-next-line no-console
            console.log('========================\n');
            
            return result;
          } catch (error) {
            // eslint-disable-next-line no-console
            console.error('\n=== XL1 RPC ERROR (viewer.transactionByHash) ===');
            // eslint-disable-next-line no-console
            console.error('Endpoint:', endpoint);
            // eslint-disable-next-line no-console
            console.error('Hash:', hash);
            // eslint-disable-next-line no-console
            console.error('Error:', error instanceof Error ? error.message : String(error));
            // eslint-disable-next-line no-console
            console.error('========================\n');
            throw error;
          }
        };
      }

      // Wrap chainId
      if (typeof viewer.chainId === 'function') {
        const originalChainId = viewer.chainId.bind(viewer);
        viewer.chainId = async () => {
          // eslint-disable-next-line no-console
          console.log('\n=== XL1 RPC REQUEST (viewer.chainId) ===');
          // eslint-disable-next-line no-console
          console.log('Endpoint:', endpoint);
          // eslint-disable-next-line no-console
          console.log('Method: chainId');
          // eslint-disable-next-line no-console
          console.log('========================\n');
          
          try {
            const result = await originalChainId();
            
            // eslint-disable-next-line no-console
            console.log('\n=== XL1 RPC RESPONSE (viewer.chainId) ===');
            // eslint-disable-next-line no-console
            console.log('Endpoint:', endpoint);
            // eslint-disable-next-line no-console
            console.log('Chain ID:', result);
            // eslint-disable-next-line no-console
            console.log('========================\n');
            
            return result;
          } catch (error) {
            // eslint-disable-next-line no-console
            console.error('\n=== XL1 RPC ERROR (viewer.chainId) ===');
            // eslint-disable-next-line no-console
            console.error('Endpoint:', endpoint);
            // eslint-disable-next-line no-console
            console.error('Error:', error instanceof Error ? error.message : String(error));
            // eslint-disable-next-line no-console
            console.error('========================\n');
            throw error;
          }
        };
      }

      // Wrap currentBlockNumber
      if (typeof viewer.currentBlockNumber === 'function') {
        const originalCurrentBlockNumber = viewer.currentBlockNumber.bind(viewer);
        viewer.currentBlockNumber = async () => {
          // eslint-disable-next-line no-console
          console.log('\n=== XL1 RPC REQUEST (viewer.currentBlockNumber) ===');
          // eslint-disable-next-line no-console
          console.log('Endpoint:', endpoint);
          // eslint-disable-next-line no-console
          console.log('Method: currentBlockNumber');
          // eslint-disable-next-line no-console
          console.log('========================\n');
          
          try {
            const result = await originalCurrentBlockNumber();
            
            // eslint-disable-next-line no-console
            console.log('\n=== XL1 RPC RESPONSE (viewer.currentBlockNumber) ===');
            // eslint-disable-next-line no-console
            console.log('Endpoint:', endpoint);
            // eslint-disable-next-line no-console
            console.log('Current Block Number:', result);
            // eslint-disable-next-line no-console
            console.log('========================\n');
            
            return result;
          } catch (error) {
            // eslint-disable-next-line no-console
            console.error('\n=== XL1 RPC ERROR (viewer.currentBlockNumber) ===');
            // eslint-disable-next-line no-console
            console.error('Endpoint:', endpoint);
            // eslint-disable-next-line no-console
            console.error('Error:', error instanceof Error ? error.message : String(error));
            // eslint-disable-next-line no-console
            console.error('========================\n');
            throw error;
          }
        };
      }
    }

    return connection;
  }
}

