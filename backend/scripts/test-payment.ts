/**
 * Quick test script to verify Ethereum payment configuration
 * 
 * Usage: tsx scripts/test-payment.ts
 */

import { EthereumPaymentService } from '../src/services/ethereum-payment-service.js';
import { env } from '../src/lib/env.js';

async function testPaymentConfiguration() {
  console.log('\n=== Ethereum Payment Configuration Test ===\n');

  // Check environment variables
  console.log('1. Environment Configuration:');
  console.log(`   ENABLE_PAYMENT_ON_VERIFICATION: ${env.enablePaymentOnVerification}`);
  console.log(`   PAYMENT_MOCK_MODE: ${env.paymentMockMode}`);
  console.log(`   ETHEREUM_RPC_URL: ${env.ethereumRpcUrl ? '✅ Set' : '❌ Not set'}`);
  console.log(`   ETHEREUM_PRIVATE_KEY: ${env.ethereumPrivateKey ? '✅ Set' : '❌ Not set'}`);
  console.log(`   ETHEREUM_CHAIN_ID: ${env.ethereumChainId || 'Auto-detect'}`);

  // Test service initialization
  console.log('\n2. Payment Service Initialization:');
  try {
    const paymentService = new EthereumPaymentService();
    console.log('   ✅ Payment service created successfully');
    
    // Check if in mock mode
    const isMockMode = (paymentService as any).mockMode;
    if (isMockMode) {
      console.log('   ⚠️  Running in MOCK MODE (no real transactions)');
      console.log('   To enable real transactions:');
      console.log('   - Set PAYMENT_MOCK_MODE=false');
      console.log('   - Ensure ETHEREUM_RPC_URL and ETHEREUM_PRIVATE_KEY are set');
    } else {
      console.log('   ✅ Running in REAL MODE (will send actual transactions)');
    }
  } catch (error) {
    console.log('   ❌ Failed to create payment service:', error);
    return;
  }

  // Test Ethereum connection (if not in mock mode)
  if (!env.paymentMockMode && env.ethereumRpcUrl) {
    console.log('\n3. Ethereum Connection Test:');
    try {
      const { ethers } = await import('ethers');
      const provider = new ethers.JsonRpcProvider(env.ethereumRpcUrl);
      const blockNumber = await provider.getBlockNumber();
      console.log(`   ✅ Connected to Ethereum network`);
      console.log(`   Current block: ${blockNumber}`);
      
      // Check wallet balance if private key is set
      if (env.ethereumPrivateKey) {
        const wallet = new ethers.Wallet(env.ethereumPrivateKey, provider);
        const balance = await provider.getBalance(wallet.address);
        const balanceEth = ethers.formatEther(balance);
        console.log(`   Payment service wallet: ${wallet.address}`);
        console.log(`   Balance: ${balanceEth} ETH`);
        
        if (parseFloat(balanceEth) < 0.001) {
          console.log('   ⚠️  Low balance! Add ETH for gas fees.');
        } else {
          console.log('   ✅ Sufficient balance for gas fees');
        }
      }
    } catch (error) {
      console.log('   ❌ Failed to connect to Ethereum:', error);
      if (error instanceof Error) {
        console.log(`   Error: ${error.message}`);
      }
    }
  }

  console.log('\n=== Test Complete ===\n');
}

testPaymentConfiguration().catch(console.error);

