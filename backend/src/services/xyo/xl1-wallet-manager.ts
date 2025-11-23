/**
 * Manages XL1 wallet and account creation
 */

import { env } from '../../lib/env.js';
import { XyoSdkLoader } from './sdk-loader.js';

export class Xl1WalletManager {
  /**
   * Get or create wallet account for XL1 transactions
   */
  async getAccount(): Promise<{ account: any }> {
    const [xl1ProtocolSdkModule, walletModule] = await Promise.all([
      XyoSdkLoader.xl1ProtocolSdk(),
      XyoSdkLoader.wallet()
    ]);

    const { generateXyoBaseWalletFromPhrase, ADDRESS_INDEX } = xl1ProtocolSdkModule;
    const { HDWallet } = walletModule;

    // Generate or use existing wallet
    const HDWalletClass = HDWallet as any;
    const generateFn = generateXyoBaseWalletFromPhrase as any;
    const addressIndex = ADDRESS_INDEX as any;
    
    // Require mnemonic unless in mock mode (where transactions aren't actually posted)
    if (!env.xyoWalletMnemonic && !env.mockXl1Transactions) {
      throw new Error(
        'XYO_WALLET_MNEMONIC is required for XL1 transaction submission. ' +
        'Set XYO_WALLET_MNEMONIC in your environment variables, or set MOCK_XL1_TRANSACTIONS=true for development.'
      );
    }

    // In mock mode, we can generate a temporary mnemonic (won't be used for real transactions)
    const mnemonic = env.xyoWalletMnemonic ?? HDWalletClass.generateMnemonic();
    
    if (!env.xyoWalletMnemonic && env.mockXl1Transactions) {
      // eslint-disable-next-line no-console
      console.warn('No XYO_WALLET_MNEMONIC found in environment, using generated mnemonic (mock mode - transactions will not be posted)');
    }

    const wallet = await generateFn(mnemonic);
    const account = await wallet.derivePath(addressIndex.XYO);

    return { account };
  }
}

