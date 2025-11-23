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
    // eslint-disable-next-line no-console
    try {
      const keys = Object.keys(connection || {});
      console.log('Connection keys:', keys);
      console.log('Has submitTransaction:', typeof (connection as any).submitTransaction);
      console.log('Has runner:', !!(connection as any).runner);
      if ((connection as any).runner) {
        console.log('Runner keys:', Object.keys((connection as any).runner));
        console.log('Runner.addPayloadsToChain:', typeof (connection as any).runner?.addPayloadsToChain);
      }
    } catch {
      /* noop */
    }

    let result: unknown;
    if (typeof connection.submitTransaction === 'function') {
    // Submit transaction using the connection's submitTransaction method
    // This matches the pattern from xl1-samples-nodejs-updo/src/submitTransaction.ts
    // eslint-disable-next-line no-console
    console.log('\n=== XL1 TRANSACTION SUBMISSION REQUEST ===');
    // eslint-disable-next-line no-console
    console.log('Method: connection.submitTransaction');
    // eslint-disable-next-line no-console
    console.log('On-chain payloads count:', onChainPayloads.length);
    // eslint-disable-next-line no-console
    console.log('On-chain payloads:', JSON.stringify(onChainPayloads, null, 2));
    // eslint-disable-next-line no-console
    console.log('Off-chain payloads count:', offChainPayloads.length);
    // eslint-disable-next-line no-console
    console.log('Off-chain payloads:', JSON.stringify(offChainPayloads, null, 2));
    // eslint-disable-next-line no-console
    console.log('========================\n');
      result = await connection.submitTransaction(onChainPayloads, offChainPayloads);
      
      // eslint-disable-next-line no-console
      console.log('\n=== XL1 TRANSACTION SUBMISSION RESPONSE ===');
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

    const first = result[0] as any;

    if (first && typeof first === 'object' && first.schema === 'network.xyo.boundwitness') {
      // Path 1: first element is the TransactionBoundWitness
      transactionBoundWitness = first;
      transactionHash = first._hash || first.hash;
    } else if (typeof first === 'string' && result.length >= 2) {
      // Path 2: [hash, signedTx]
      transactionHash = first;
      const signedTx = result[1] as any;
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

    // eslint-disable-next-line no-console
    console.log('\n=== XL1 TRANSACTION SUBMITTED ===');
    // eslint-disable-next-line no-console
    console.log('Transaction hash:', transactionHash);
    // eslint-disable-next-line no-console
    console.log('Transaction Bound Witness:', JSON.stringify(transactionBoundWitness, null, 2));
    // eslint-disable-next-line no-console
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
      // eslint-disable-next-line no-console
      console.warn('confirmSubmittedTransaction not exported by @xyo-network/xl1-rpc; skipping confirmation step');
      return transaction;
    }

    // eslint-disable-next-line no-console
    console.log('\n=== XL1 TRANSACTION CONFIRMATION REQUEST ===');
    // eslint-disable-next-line no-console
    console.log('Method: confirmSubmittedTransaction');
    // transaction is [boundWitness, []], pass the boundWitness (first element)
    const transactionArray = transaction as unknown[];
    const boundWitness = transactionArray[0];
    // eslint-disable-next-line no-console
    console.log('Bound Witness:', JSON.stringify(boundWitness, null, 2));
    // eslint-disable-next-line no-console
    console.log('========================\n');

    try {
      const confirmed = await (confirmSubmittedTransaction as any)(connection, boundWitness, {
        logger: console
      });
      // eslint-disable-next-line no-console
      console.log('\n=== XL1 TRANSACTION CONFIRMATION RESPONSE ===');
      if (confirmed) {
        try {
          // eslint-disable-next-line no-console
          console.log('Confirmed Transaction:', JSON.stringify(confirmed, null, 2));
        } catch {
          // eslint-disable-next-line no-console
          console.log('Confirmed Transaction:', confirmed);
        }
      } else {
        // eslint-disable-next-line no-console
        console.log('Confirmed Transaction: null');
      }
      // eslint-disable-next-line no-console
      console.log('========================\n');
      return confirmed;
    } catch (confirmError) {
      // eslint-disable-next-line no-console
      console.error('\n=== XL1 TRANSACTION CONFIRMATION ERROR ===');
      // eslint-disable-next-line no-console
      console.error('Error:', confirmError instanceof Error ? confirmError.message : String(confirmError));
      if (confirmError instanceof Error && confirmError.stack) {
        // eslint-disable-next-line no-console
        console.error('Stack:', confirmError.stack);
      }
      try {
        // eslint-disable-next-line no-console
        console.error('Error Details:', JSON.stringify(confirmError, null, 2));
      } catch {
        // eslint-disable-next-line no-console
        console.error('Error Details:', confirmError);
      }
      // eslint-disable-next-line no-console
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
    // eslint-disable-next-line no-console
    console.log('=== RPC Connection Endpoint ===');
    // eslint-disable-next-line no-console
    console.log('Endpoint:', endpoint);
    
    // If connection has a runner with broadcastTransaction, wrap it for logging
    if (connection.runner && typeof connection.runner.broadcastTransaction === 'function') {
      const originalRunner = connection.runner;
      const originalBroadcast = originalRunner.broadcastTransaction.bind(originalRunner);

      (originalRunner as any).broadcastTransaction = async (transaction: any) => {
        // eslint-disable-next-line no-console
        console.log('=== RPC broadcastTransaction REQUEST ===');
        // eslint-disable-next-line no-console
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
          // eslint-disable-next-line no-console
          console.log('=== DIRECT HTTP RESPONSE ===');
          // eslint-disable-next-line no-console
          console.log('Status:', directResponse.status);
          // eslint-disable-next-line no-console
          console.log('Response:', JSON.stringify(directResponse.data, null, 2));

          if (directResponse.status === 200 && directResponse.data?.result) {
            directSuccessHash = String(directResponse.data.result);
          }
        } catch (directError: any) {
          // eslint-disable-next-line no-console
          console.error('=== DIRECT HTTP ERROR ===');
          // eslint-disable-next-line no-console
          console.error('Status:', directError.response?.status);
          // eslint-disable-next-line no-console
          console.error('Response:', JSON.stringify(directError.response?.data, null, 2));
        }

        try {
          const result = await originalBroadcast(transaction);
          // eslint-disable-next-line no-console
          console.log('=== RPC broadcastTransaction RESPONSE ===');
          // eslint-disable-next-line no-console
          console.log('Response:', JSON.stringify(result, null, 2));
          return result;
        } catch (rpcError) {
          // eslint-disable-next-line no-console
          console.error('=== RPC broadcastTransaction ERROR ===');
          // eslint-disable-next-line no-console
          console.error('Error:', rpcError);

          // If the direct HTTP call succeeded, treat that as authoritative and
          // do not fail the overall transaction just because the wrapped runner
          // reported an error.
          if (directSuccessHash) {
            // eslint-disable-next-line no-console
            console.warn('broadcastTransaction via runner failed, but direct HTTP succeeded. Using direct result hash.');
            return directSuccessHash;
          }

          throw rpcError;
        }
      };
    }
  }
}

