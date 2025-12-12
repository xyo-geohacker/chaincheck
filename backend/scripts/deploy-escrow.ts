/**
 * Deploy Escrow Contract Script
 * 
 * This script deploys the DeliveryEscrow smart contract to the configured Ethereum network.
 * 
 * Prerequisites:
 * 1. Compile the contract (requires Hardhat or similar)
 * 2. Set ETHEREUM_RPC_URL and ETHEREUM_PRIVATE_KEY in .env
 * 3. Ensure the wallet has sufficient ETH for gas
 * 
 * Usage:
 *   npm run deploy-escrow
 * 
 * Note: For production, use a proper Solidity development environment (Hardhat/Foundry)
 * This script provides a basic deployment using ethers.js directly.
 */

import { ethers } from 'ethers';
import { env } from '../src/lib/env.js';
import { logger } from '../src/lib/logger.js';
import fs from 'fs';
import path from 'path';

// Contract bytecode and ABI would normally come from Hardhat compilation
// For now, we'll provide instructions for manual compilation
const CONTRACT_SOURCE = path.join(process.cwd(), 'contracts', 'DeliveryEscrow.sol');

async function deployEscrow() {
  logger.info('--- Deploying DeliveryEscrow Contract ---');

  // Check prerequisites
  if (!env.ethereumRpcUrl) {
    logger.error('ETHEREUM_RPC_URL is not set in .env file');
    logger.info('Please set ETHEREUM_RPC_URL (e.g., https://sepolia.infura.io/v3/YOUR_PROJECT_ID)');
    process.exit(1);
  }

  if (!env.ethereumPrivateKey) {
    logger.error('ETHEREUM_PRIVATE_KEY is not set in .env file');
    logger.info('Please set ETHEREUM_PRIVATE_KEY (wallet private key for deployment)');
    process.exit(1);
  }

  // Check if contract source exists
  if (!fs.existsSync(CONTRACT_SOURCE)) {
    logger.error(`Contract source not found: ${CONTRACT_SOURCE}`);
    logger.info('Please ensure the contract file exists at contracts/DeliveryEscrow.sol');
    process.exit(1);
  }

  logger.info('Contract source found. Note: This script requires the contract to be compiled first.');
  logger.info('For production deployment, use Hardhat or Foundry to compile the contract.');
  logger.info('');
  logger.info('To compile with Hardhat:');
  logger.info('  1. Install Hardhat: npm install --save-dev hardhat');
  logger.info('  2. Initialize: npx hardhat init');
  logger.info('  3. Compile: npx hardhat compile');
  logger.info('  4. Deploy: npx hardhat run scripts/deploy.js --network sepolia');
  logger.info('');
  logger.info('For now, you can manually deploy using Remix IDE:');
  logger.info('  1. Go to https://remix.ethereum.org');
  logger.info('  2. Create a new file and paste the contract code');
  logger.info('  3. Compile the contract');
  logger.info('  4. Deploy using Injected Web3 (MetaMask)');
  logger.info('  5. Copy the deployed contract address to ETHEREUM_ESCROW_CONTRACT_ADDRESS');
  logger.info('');

  // Initialize provider and wallet
  try {
    const provider = new ethers.JsonRpcProvider(env.ethereumRpcUrl);
    const wallet = new ethers.Wallet(env.ethereumPrivateKey, provider);

    logger.info(`Deploying from wallet: ${wallet.address}`);

    // Check balance
    const balance = await provider.getBalance(wallet.address);
    const balanceEth = ethers.formatEther(balance);
    logger.info(`Wallet balance: ${balanceEth} ETH`);

    if (balance === BigInt(0)) {
      logger.warn('Wallet has 0 ETH. Deployment will fail. Please fund the wallet.');
      process.exit(1);
    }

    // For actual deployment, you would:
    // 1. Read compiled bytecode from artifacts
    // 2. Read ABI from artifacts
    // 3. Deploy using ContractFactory
    
    logger.info('');
    logger.info('=== Manual Deployment Instructions ===');
    logger.info('Since we need compiled bytecode, please use one of these methods:');
    logger.info('');
    logger.info('Method 1: Hardhat (Recommended)');
    logger.info('  1. cd backend');
    logger.info('  2. npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox');
    logger.info('  3. npx hardhat init (choose TypeScript)');
    logger.info('  4. Copy contracts/DeliveryEscrow.sol to hardhat/contracts/');
    logger.info('  5. npx hardhat compile');
    logger.info('  6. Create deploy script in hardhat/scripts/deploy.ts');
    logger.info('  7. npx hardhat run scripts/deploy.ts --network sepolia');
    logger.info('');
    logger.info('Method 2: Remix IDE (Quick Test)');
    logger.info('  1. Go to https://remix.ethereum.org');
    logger.info('  2. Create new file: DeliveryEscrow.sol');
    logger.info('  3. Paste contract code from contracts/DeliveryEscrow.sol');
    logger.info('  4. Compile (Solidity Compiler tab)');
    logger.info('  5. Deploy (Deploy & Run tab, use Injected Web3)');
    logger.info('  6. Copy contract address');
    logger.info('');
    logger.info('After deployment, add to your .env file:');
    logger.info(`  ETHEREUM_ESCROW_CONTRACT_ADDRESS=<deployed_address>`);
    logger.info(`  USE_ESCROW=true`);

  } catch (error) {
    logger.error('Deployment error:', error);
    process.exit(1);
  }
}

deployEscrow().catch(error => {
  logger.error('Script error:', error);
  process.exit(1);
});

