/**
 * Customer Deposit Script
 * 
 * Helper script for customers to deposit funds to escrow contract.
 * 
 * NOTE: In production, customers should use MetaMask or their own wallet.
 * This script is for testing/demo purposes only.
 * 
 * Usage:
 *   CUSTOMER_PRIVATE_KEY=0x... \
 *   DELIVERY_ID=123e4567-e89b-12d3-a456-426614174000 \
 *   SELLER_ADDRESS=0x... \
 *   PAYMENT_AMOUNT=0.0001 \
 *   npm run customer-deposit
 * 
 * Or add to .env:
 *   CUSTOMER_PRIVATE_KEY=0x...
 *   DELIVERY_ID=123e4567-e89b-12d3-a456-426614174000
 *   SELLER_ADDRESS=0x...
 *   PAYMENT_AMOUNT=0.0001
 */

import { ethers } from 'ethers';
import { env } from '../src/lib/env.js';
import { logger } from '../lib/logger.js';
import dotenv from 'dotenv';

dotenv.config();

async function customerDeposit() {
  // Get configuration from environment
  const customerPrivateKey = process.env.CUSTOMER_PRIVATE_KEY;
  const deliveryId = process.env.DELIVERY_ID;
  const sellerAddress = process.env.SELLER_ADDRESS;
  const amount = parseFloat(process.env.PAYMENT_AMOUNT || '0.0001');

  // Validate required parameters
  if (!customerPrivateKey) {
    logger.error('CUSTOMER_PRIVATE_KEY is required');
    logger.info('Set it in .env or as environment variable');
    process.exit(1);
  }

  if (!deliveryId) {
    logger.error('DELIVERY_ID is required');
    logger.info('Set it in .env or as environment variable (delivery UUID)');
    process.exit(1);
  }

  if (!sellerAddress) {
    logger.error('SELLER_ADDRESS is required');
    logger.info('Set it in .env or as environment variable (seller wallet address)');
    process.exit(1);
  }

  if (!env.ethereumRpcUrl) {
    logger.error('ETHEREUM_RPC_URL is not set in backend .env');
    process.exit(1);
  }

  if (!env.ethereumEscrowContractAddress) {
    logger.error('ETHEREUM_ESCROW_CONTRACT_ADDRESS is not set in backend .env');
    process.exit(1);
  }

  try {
    // Initialize provider and customer wallet
    const provider = new ethers.JsonRpcProvider(env.ethereumRpcUrl);
    const customerWallet = new ethers.Wallet(customerPrivateKey, provider);

    logger.info(`Customer wallet address: ${customerWallet.address}`);
    logger.info(`Escrow contract: ${env.ethereumEscrowContractAddress}`);
    logger.info(`Seller address: ${sellerAddress}`);
    logger.info(`Payment amount: ${amount} ETH`);

    // Check customer balance
    const balance = await provider.getBalance(customerWallet.address);
    const balanceEth = ethers.formatEther(balance);
    logger.info(`Customer balance: ${balanceEth} ETH`);

    if (balance === BigInt(0)) {
      logger.error('Customer wallet has 0 ETH. Please fund the wallet with Sepolia ETH.');
      logger.info('Get test ETH from: https://sepoliafaucet.com/');
      process.exit(1);
    }

    // Contract ABI (minimal - just the deposit function)
    const contractABI = [
      'function deposit(bytes32 deliveryId, address seller) external payable'
    ];

    const contract = new ethers.Contract(
      env.ethereumEscrowContractAddress,
      contractABI,
      customerWallet
    );

    // Convert delivery ID to bytes32 (keccak256 hash)
    const deliveryIdBytes = ethers.id(deliveryId);
    const amountWei = ethers.parseEther(amount.toString());

    logger.info('');
    logger.info('--- Deposit Details ---');
    logger.info(`Delivery ID (string): ${deliveryId}`);
    logger.info(`Delivery ID (bytes32): ${deliveryIdBytes}`);
    logger.info(`Amount (ETH): ${amount}`);
    logger.info(`Amount (wei): ${amountWei.toString()}`);
    logger.info('');

    // Estimate gas
    try {
      const gasEstimate = await contract.deposit.estimateGas(
        deliveryIdBytes,
        sellerAddress,
        { value: amountWei }
      );
      logger.info(`Estimated gas: ${gasEstimate.toString()}`);
    } catch (error) {
      logger.warn('Could not estimate gas (may fail if escrow already exists)');
    }

    // Confirm before proceeding
    logger.info('Ready to deposit. Submitting transaction...');
    logger.info('');

    // Call deposit function
    const tx = await contract.deposit(deliveryIdBytes, sellerAddress, {
      value: amountWei
    });

    logger.info(`Transaction submitted: ${tx.hash}`);
    logger.info(`Waiting for confirmation...`);

    const receipt = await tx.wait();

    if (!receipt) {
      throw new Error('Transaction receipt not received');
    }

    logger.info('');
    logger.info('✅ Deposit successful!');
    logger.info(`Transaction hash: ${receipt.hash}`);
    logger.info(`Block number: ${receipt.blockNumber}`);
    logger.info(`Gas used: ${receipt.gasUsed.toString()}`);
    logger.info('');

    // View on Etherscan
    const network = env.ethereumChainId === 11155111 ? 'sepolia' : 'mainnet';
    const explorerUrl = network === 'sepolia' 
      ? `https://sepolia.etherscan.io/tx/${receipt.hash}`
      : `https://etherscan.io/tx/${receipt.hash}`;
    
    logger.info(`View on Etherscan: ${explorerUrl}`);
    logger.info('');

    // Next steps
    logger.info('Next steps:');
    logger.info('1. Update database with deposit info:');
    logger.info(`   escrowDepositTxHash: ${receipt.hash}`);
    logger.info(`   escrowDepositBlock: ${receipt.blockNumber}`);
    logger.info(`   paymentStatus: ESCROWED`);
    logger.info('2. Verify delivery to release escrow');
    logger.info('');

  } catch (error) {
    logger.error('Deposit failed:', error);
    
    if (error instanceof Error) {
      // Check for common errors
      if (error.message.includes('Escrow already exists')) {
        logger.error('An escrow already exists for this delivery ID.');
        logger.info('Each delivery can only have one escrow deposit.');
      } else if (error.message.includes('insufficient funds')) {
        logger.error('Insufficient funds for deposit + gas fees.');
        logger.info('Get more Sepolia ETH from: https://sepoliafaucet.com/');
      } else if (error.message.includes('user rejected')) {
        logger.error('Transaction was rejected by user.');
      } else {
        logger.error(`Error: ${error.message}`);
      }
    }
    
    process.exit(1);
  }
}

customerDeposit().catch(error => {
  logger.error('Script error:', error);
  process.exit(1);
});

