/**
 * Handles submission and confirmation of XL1 transactions
 */

import axios from 'axios';

import { env } from '../../lib/env.js';
import { XyoSdkLoader } from './sdk-loader.js';
import { installXl1RpcLogger } from './xl1-rpc-logger.js';

export class Xl1TransactionSubmitter {
  /**
   * Submit transaction to XL1 network
   * Uses connection.submitTransaction() which matches the production format
   */
  async submitTransaction(
    connection: any,
    account: any,
    onChainPayloads: unknown[],
    offChainPayloads: unknown[],
    chainInfo: { chainId: string; nbf: number; exp: number }
  ): Promise<{ transactionHash: string; transaction: unknown }> {
    // Prefer connection.submitTransaction when available; otherwise fall back to runner.addPayloadsToChain
    // Both paths should yield a transaction shaped like [TransactionBoundWitness, []]
    if (!connection) {
      throw new Error('Missing RPC connection');
    }

    // Wrap connection for logging
    this.wrapConnectionForLogging(connection);
     
    try {
      const keys = Object.keys(connection || {});
      console.log('Connection keys:', keys);
      console.log('Has submitTransaction:', typeof (connection).submitTransaction);
      console.log('Has runner:', !!(connection).runner);
      if ((connection).runner) {
        console.log('Runner keys:', Object.keys((connection).runner));
        console.log('Runner.addPayloadsToChain:', typeof (connection).runner?.addPayloadsToChain);
      }
    } catch {
      /* noop */
    }

    let result: unknown;
    if (typeof connection.submitTransaction === 'function') {
    // Submit transaction using the connection's submitTransaction method
    // This matches the pattern from xl1-samples-nodejs-updo/src/submitTransaction.ts
     
    console.log('\n=== XL1 TRANSACTION SUBMISSION REQUEST ===');
     
    console.log('Method: connection.submitTransaction');
     
    console.log('On-chain payloads count:', onChainPayloads.length);
     
    console.log('On-chain payloads:', JSON.stringify(onChainPayloads, null, 2));
     
    console.log('Off-chain payloads count:', offChainPayloads.length);
     
    console.log('Off-chain payloads:', JSON.stringify(offChainPayloads, null, 2));
     
    console.log('========================\n');
      result = await connection.submitTransaction(onChainPayloads, offChainPayloads);
      
       
      console.log('\n=== XL1 TRANSACTION SUBMISSION RESPONSE ===');
      if (result) {
        try {
           
          console.log('Result:', JSON.stringify(result, null, 2));
        } catch {
           
          console.log('Result:', result);
        }
      } else {
         
        console.log('Result: null');
      }
       
      console.log('========================\n');
    } else {
      // We used to fall back to various runner/gateway paths here, but the current
      // XL1 RPC / SDK combination does not expose a usable viewer/runner for them
      // and consistently throws \"No viewer available on connection\". To avoid
      // fragile behavior, we now require `submitTransaction` to be present.
      throw new Error('Connection does not support submitTransaction (required for XL1 transaction submission)');
    }

    if (!result || !Array.isArray(result) || result.length === 0) {
      throw new Error('Transaction submission failed - invalid result');
    }

    // Normalize different result shapes:
    // 1) connection.submitTransaction: [TransactionBoundWitness, ...]
    // 2) SimpleXyoGatewayRunner.addPayloadsToChain: [hash, SignedHydratedTransactionWithHashMeta]
    let transactionBoundWitness: any;
    let transactionHash: string | undefined;

    const first = result[0];

    if (first && typeof first === 'object' && first.schema === 'network.xyo.boundwitness') {
      // Path 1: first element is the TransactionBoundWitness
      transactionBoundWitness = first;
      transactionHash = first._hash || first.hash;
    } else if (typeof first === 'string' && result.length >= 2) {
      // Path 2: [hash, signedTx]
      transactionHash = first;
      const signedTx = result[1];
      // signedTx is [boundWitness, payload], take the boundWitness as the transaction body
      if (Array.isArray(signedTx) && signedTx.length > 0) {
        transactionBoundWitness = signedTx[0];
      } else if (signedTx && signedTx[0]) {
        transactionBoundWitness = signedTx[0];
      }
    }

    if (!transactionBoundWitness) {
      throw new Error('Transaction submission failed - could not resolve bound witness from result');
    }
    if (!transactionHash) {
      transactionHash = transactionBoundWitness._hash || transactionBoundWitness.hash;
    }
    if (!transactionHash) {
      throw new Error('Transaction submission failed - no hash in result');
    }

     
    console.log('\n=== XL1 TRANSACTION SUBMITTED ===');
     
    console.log('Transaction hash:', transactionHash);
     
    console.log('Transaction Bound Witness:', JSON.stringify(transactionBoundWitness, null, 2));
     
    console.log('========================\n');

    // Return the transaction in the format [boundWitness, []] to match production
    const transaction = [transactionBoundWitness, []];

    return { transactionHash, transaction };
  }

  /**
   * Confirm transaction was included in blockchain
   */
  async confirmTransaction(connection: any, transaction: unknown): Promise<unknown> {
    // Load from '@xyo-network/xl1-rpc' at runtime, since exports may differ by version
    const xl1RpcModule = await XyoSdkLoader.xl1Rpc();
    const confirmSubmittedTransaction = (xl1RpcModule as any).confirmSubmittedTransaction;

    if (!confirmSubmittedTransaction) {
       
      console.warn('confirmSubmittedTransaction not exported by @xyo-network/xl1-rpc; skipping confirmation step');
      return transaction;
    }

     
    console.log('\n=== XL1 TRANSACTION CONFIRMATION REQUEST ===');
     
    console.log('Method: confirmSubmittedTransaction');
    // transaction is [boundWitness, []], pass the boundWitness (first element)
    const transactionArray = transaction as unknown[];
    const boundWitness = transactionArray[0];
     
    console.log('Bound Witness:', JSON.stringify(boundWitness, null, 2));
     
    console.log('========================\n');

    try {
      const confirmed = await (confirmSubmittedTransaction)(connection, boundWitness, {
        logger: console
      });
       
      console.log('\n=== XL1 TRANSACTION CONFIRMATION RESPONSE ===');
      if (confirmed) {
        try {
           
          console.log('Confirmed Transaction:', JSON.stringify(confirmed, null, 2));
        } catch {
           
          console.log('Confirmed Transaction:', confirmed);
        }
      } else {
         
        console.log('Confirmed Transaction: null');
      }
       
      console.log('========================\n');
      return confirmed;
    } catch (confirmError) {
       
      console.error('\n=== XL1 TRANSACTION CONFIRMATION ERROR ===');
       
      console.error('Error:', confirmError instanceof Error ? confirmError.message : String(confirmError));
      if (confirmError instanceof Error && confirmError.stack) {
         
        console.error('Stack:', confirmError.stack);
      }
      try {
         
        console.error('Error Details:', JSON.stringify(confirmError, null, 2));
      } catch {
         
        console.error('Error Details:', confirmError);
      }
       
      console.error('========================\n');
      throw confirmError;
    }
  }

  /**
   * Wrap connection to add detailed logging for RPC requests
   */
  private wrapConnectionForLogging(connection: any) {
    // Install RPC logger to intercept HTTP requests
    installXl1RpcLogger();
    
    // Prefer explicit env endpoints over any default baked into the connection
    let endpoint = env.xyoChainRpcUrl || connection.endpoint;
    // Ensure RPC path suffix when missing
    if (endpoint && !endpoint.endsWith('/rpc')) {
      endpoint = `${endpoint.replace(/\/+$/, '')}/rpc`;
    }
    
    // Log the endpoint being used
     
    console.log('=== RPC Connection Endpoint ===');
     
    console.log('Endpoint:', endpoint);
    
    // If connection has a runner with broadcastTransaction, wrap it for logging
    if (connection.runner && typeof connection.runner.broadcastTransaction === 'function') {
      const originalRunner = connection.runner;
      const originalBroadcast = originalRunner.broadcastTransaction.bind(originalRunner);

      (originalRunner).broadcastTransaction = async (transaction: any) => {
         
        console.log('=== RPC broadcastTransaction REQUEST ===');
         
        console.log('Transaction:', JSON.stringify(transaction, null, 2));

        let directSuccessHash: string | undefined;

        // First, try a direct HTTP call. If this succeeds, we can treat the
        // transaction as broadcast even if the wrapped runner throws.
        try {
          const directResponse = await axios.post(endpoint, {
            jsonrpc: '2.0',
            id: 'test-' + Date.now(),
            method: 'xyoRunner_broadcastTransaction',
            params: [transaction]
          });
           
          console.log('=== DIRECT HTTP RESPONSE ===');
           
          console.log('Status:', directResponse.status);
           
          console.log('Response:', JSON.stringify(directResponse.data, null, 2));

          if (directResponse.status === 200 && directResponse.data?.result) {
            directSuccessHash = String(directResponse.data.result);
          }
        } catch (directError: any) {
           
          console.error('=== DIRECT HTTP ERROR ===');
           
          console.error('Status:', directError.response?.status);
           
          console.error('Response:', JSON.stringify(directError.response?.data, null, 2));
        }

        try {
          const result = await originalBroadcast(transaction);
           
          console.log('=== RPC broadcastTransaction RESPONSE ===');
           
          console.log('Response:', JSON.stringify(result, null, 2));
          return result;
        } catch (rpcError) {
           
          console.error('=== RPC broadcastTransaction ERROR ===');
           
          console.error('Error:', rpcError);

          // If the direct HTTP call succeeded, treat that as authoritative and
          // do not fail the overall transaction just because the wrapped runner
          // reported an error.
          if (directSuccessHash) {
             
            console.warn('broadcastTransaction via runner failed, but direct HTTP succeeded. Using direct result hash.');
            return directSuccessHash;
          }

          throw rpcError;
        }
      };
    }
  }
}

