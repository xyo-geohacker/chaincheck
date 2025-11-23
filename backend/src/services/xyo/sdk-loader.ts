/**
 * Utility for safely loading XYO SDK modules
 * Handles the disableGloballyUnique() requirement before importing XYO packages
 */

import { disableGloballyUnique } from '@xylabs/object';

/**
 * Loads XYO SDK modules safely by calling disableGloballyUnique first
 * This prevents "Global unique item" errors at module load time
 */
export async function loadXyoSdkModules<T extends Record<string, unknown>>(
  modulePath: string
): Promise<T> {
  disableGloballyUnique();
  return await import(modulePath) as T;
}

/**
 * Type-safe loader for specific XYO SDK modules
 */
export const XyoSdkLoader = {
  async payloadBuilder() {
    return loadXyoSdkModules<{ PayloadBuilder: unknown }>('@xyo-network/payload-builder');
  },

  async boundWitnessBuilder() {
    return loadXyoSdkModules<{ 
      QueryBoundWitnessBuilder: unknown;
      BoundWitnessBuilder: unknown;
    }>('@xyo-network/boundwitness-builder');
  },

  async archivistModel() {
    return loadXyoSdkModules<{ 
      ArchivistInsertQuerySchema: unknown;
      ArchivistGetQuerySchema: unknown;
    }>('@xyo-network/archivist-model');
  },

  async account() {
    try {
      return await loadXyoSdkModules<{ Account: unknown }>('@xyo-network/account');
    } catch {
      // Fallback to SDK
      const sdk = await loadXyoSdkModules<{ Account: unknown }>('@xyo-network/sdk-xyo-client-js');
      return sdk;
    }
  },

  async archivistApi() {
    return loadXyoSdkModules<{ ArchivistApi: unknown }>('@xyo-network/api');
  },

  async boundWitnessValidator() {
    try {
      return await loadXyoSdkModules<{ BoundWitnessValidator: unknown }>('@xyo-network/boundwitness-validator');
    } catch {
      return null;
    }
  },

  async xl1ProtocolSdk() {
    return loadXyoSdkModules<{
      generateXyoBaseWalletFromPhrase: unknown;
      ADDRESS_INDEX: unknown;
      confirmSubmittedTransaction: unknown;
      SimpleXyoSigner: unknown;
      SimpleXyoGateway: unknown;
      SimpleXyoGatewayRunner: unknown;
    }>('@xyo-network/xl1-protocol-sdk');
  },

  async xl1Rpc() {
    return loadXyoSdkModules<{ 
      RpcXyoConnection?: unknown;
      HttpRpcXyoConnection?: unknown;
      confirmSubmittedTransaction?: unknown;
    }>('@xyo-network/xl1-rpc');
  },

  async wallet() {
    return loadXyoSdkModules<{ HDWallet: unknown }>('@xyo-network/wallet');
  },

  async divinerModel() {
    return loadXyoSdkModules<{ DivinerDivineQuerySchema: unknown }>('@xyo-network/diviner-model');
  },

  async loadBoundWitnessWrapper() {
    return loadXyoSdkModules<{ BoundWitnessWrapper: unknown }>('@xyo-network/boundwitness-wrapper');
  }
};

