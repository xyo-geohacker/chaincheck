#!/usr/bin/env tsx
/**
 * Utility script to generate a 24-word mnemonic seed phrase for XL1 wallet
 * 
 * Usage:
 *   npm run generate-mnemonic
 *   or
 *   tsx scripts/generate-mnemonic.ts
 */

import { disableGloballyUnique } from '@xylabs/object';

async function generateMnemonic() {
  try {
    // MUST call this before importing XYO SDK to prevent "Global unique item" errors
    disableGloballyUnique();
    
    // Dynamically import packages
    const { HDWallet } = await import('@xyo-network/wallet');
    const { generateXyoBaseWalletFromPhrase, ADDRESS_INDEX } = await import('@xyo-network/xl1-protocol-sdk');
    
    // Generate a new 24-word mnemonic
    const mnemonic = HDWallet.generateMnemonic();
    
    // Verify it works by generating a wallet
    const wallet = await generateXyoBaseWalletFromPhrase(mnemonic);
    const account = await wallet.derivePath(ADDRESS_INDEX.XYO);
    
    console.log('\n✅ Generated XL1 Wallet Mnemonic\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n📝 Mnemonic (24 words):');
    console.log(`\n   ${mnemonic}\n`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n🔑 Derived XL1 Address:');
    console.log(`\n   ${account.address}\n`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n📋 Add to your .env file:');
    console.log(`\n   XYO_WALLET_MNEMONIC="${mnemonic}"\n`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n⚠️  IMPORTANT: Keep this mnemonic secure and never share it publicly!\n');
    
    return mnemonic;
  } catch (error) {
    console.error('❌ Error generating mnemonic:', error);
    process.exit(1);
  }
}

// Run if executed directly
generateMnemonic();

export { generateMnemonic };

