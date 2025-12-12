/**
 * Ethereum Escrow Service
 * 
 * Handles escrow-based payments using a smart contract.
 * Funds are locked in escrow until delivery verification, then released to seller.
 */

import { ethers } from 'ethers';
import { PaymentStatus } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { env } from '../lib/env.js';
import { logger } from '../lib/logger.js';

// Escrow contract ABI (minimal interface)
const ESCROW_ABI = [
  'function deposit(bytes32 deliveryId, address seller) external payable',
  'function release(bytes32 deliveryId) external',
  'function refund(bytes32 deliveryId) external',
  'function getEscrow(bytes32 deliveryId) external view returns (tuple(address buyer, address seller, uint256 amount, bool released, bool refunded, uint256 createdAt, uint256 releaseDeadline))',
  'function canAutoRefund(bytes32 deliveryId) external view returns (bool)',
  'function autoRefund(bytes32 deliveryId) external',
  'event EscrowCreated(bytes32 indexed deliveryId, address indexed buyer, address indexed seller, uint256 amount)',
  'event EscrowReleased(bytes32 indexed deliveryId, address indexed seller, uint256 amount)',
  'event EscrowRefunded(bytes32 indexed deliveryId, address indexed buyer, uint256 amount)'
] as const;

export interface EscrowResult {
  success: boolean;
  transactionHash?: string;
  blockNumber?: number;
  error?: string;
}

export interface EscrowStatus {
  buyer: string;
  seller: string;
  amount: string; // Formatted as ETH (e.g., "0.1")
  released: boolean;
  refunded: boolean;
  createdAt: number;
  releaseDeadline: number;
}

export class EthereumEscrowService {
  private provider: ethers.JsonRpcProvider | null = null;
  private wallet: ethers.Wallet | null = null;
  private contract: ethers.Contract | null = null;
  private mockMode: boolean;

  constructor() {
    this.mockMode = env.paymentMockMode;
    
    if (!this.mockMode && env.ethereumRpcUrl && env.ethereumPrivateKey && env.ethereumEscrowContractAddress) {
      this.initializeEthereum();
    } else if (!this.mockMode) {
      logger.warn('Escrow service: Ethereum not fully configured. Forcing mock mode.');
      this.mockMode = true;
    }

    if (this.mockMode) {
      logger.info('Ethereum escrow service running in MOCK MODE - no real transactions will be sent');
    }
  }

  /**
   * Initialize Ethereum provider, wallet, and contract
   */
  private async initializeEthereum() {
    try {
      this.provider = new ethers.JsonRpcProvider(env.ethereumRpcUrl);
      this.wallet = new ethers.Wallet(env.ethereumPrivateKey!, this.provider);
      
      if (!env.ethereumEscrowContractAddress) {
        throw new Error('ETHEREUM_ESCROW_CONTRACT_ADDRESS not configured');
      }
      
      this.contract = new ethers.Contract(
        env.ethereumEscrowContractAddress,
        ESCROW_ABI,
        this.wallet
      );
      
      logger.info(`Ethereum escrow service initialized. Contract: ${env.ethereumEscrowContractAddress}, Wallet: ${this.wallet.address}`);
    } catch (error) {
      logger.error('Failed to initialize Ethereum escrow service:', error);
      this.mockMode = true;
      logger.warn('Falling back to MOCK MODE for escrow service due to initialization failure.');
    }
  }

  /**
   * Convert delivery ID string to bytes32 for contract
   */
  private deliveryIdToBytes32(deliveryId: string): string {
    return ethers.id(deliveryId);
  }

  /**
   * Create escrow deposit (called when order is placed)
   * Note: In production, buyer would typically call this directly from their wallet.
   * This method is for backend-initiated deposits (e.g., for testing/demo).
   */
  async createEscrowDeposit(
    deliveryId: string,
    buyerAddress: string,
    sellerAddress: string,
    amount: number
  ): Promise<EscrowResult> {
    if (this.mockMode) {
      return this.mockDeposit(deliveryId, sellerAddress, amount);
    }

    if (!this.contract || !this.wallet) {
      return {
        success: false,
        error: 'Ethereum escrow contract not initialized'
      };
    }

    try {
      const deliveryIdBytes = this.deliveryIdToBytes32(deliveryId);
      const amountWei = ethers.parseEther(amount.toString());

      // Note: In production, the buyer should call deposit() directly from their wallet.
      // For demo/testing, we use the service wallet (buyer must approve/transfer first).
      // This is a simplified approach - real implementation would use MetaMask/Web3 wallet.
      const tx = await this.contract.deposit(deliveryIdBytes, sellerAddress, {
        value: amountWei
      });

      logger.info(`Escrow deposit transaction submitted: ${tx.hash}`);
      const receipt = await tx.wait();
      
      if (!receipt) {
        throw new Error('Transaction receipt not received');
      }

      logger.info(`Escrow deposit confirmed in block ${receipt.blockNumber}`);

      return {
        success: true,
        transactionHash: receipt.hash,
        blockNumber: Number(receipt.blockNumber)
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Escrow deposit failed:', error);
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Release escrow to seller (called after delivery verification)
   */
  async releaseEscrow(deliveryId: string): Promise<EscrowResult> {
    if (this.mockMode) {
      return this.mockRelease(deliveryId);
    }

    if (!this.contract) {
      return {
        success: false,
        error: 'Ethereum escrow contract not initialized'
      };
    }

    try {
      const deliveryIdBytes = this.deliveryIdToBytes32(deliveryId);
      const tx = await this.contract.release(deliveryIdBytes);
      
      logger.info(`Escrow release transaction submitted: ${tx.hash}`);
      const receipt = await tx.wait();
      
      if (!receipt) {
        throw new Error('Transaction receipt not received');
      }

      logger.info(`Escrow released to seller in block ${receipt.blockNumber}`);

      return {
        success: true,
        transactionHash: receipt.hash,
        blockNumber: Number(receipt.blockNumber)
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Escrow release failed:', error);
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Refund escrow to buyer
   */
  async refundEscrow(deliveryId: string): Promise<EscrowResult> {
    if (this.mockMode) {
      return this.mockRefund(deliveryId);
    }

    if (!this.contract) {
      return {
        success: false,
        error: 'Ethereum escrow contract not initialized'
      };
    }

    try {
      const deliveryIdBytes = this.deliveryIdToBytes32(deliveryId);
      const tx = await this.contract.refund(deliveryIdBytes);
      
      logger.info(`Escrow refund transaction submitted: ${tx.hash}`);
      const receipt = await tx.wait();
      
      if (!receipt) {
        throw new Error('Transaction receipt not received');
      }

      logger.info(`Escrow refunded to buyer in block ${receipt.blockNumber}`);

      return {
        success: true,
        transactionHash: receipt.hash,
        blockNumber: Number(receipt.blockNumber)
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Escrow refund failed:', error);
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Get escrow status from contract
   */
  async getEscrowStatus(deliveryId: string): Promise<EscrowStatus | null> {
    if (this.mockMode || !this.contract) {
      return null;
    }

    try {
      const deliveryIdBytes = this.deliveryIdToBytes32(deliveryId);
      const escrow = await this.contract.getEscrow(deliveryIdBytes);
      
      return {
        buyer: escrow.buyer,
        seller: escrow.seller,
        amount: ethers.formatEther(escrow.amount),
        released: escrow.released,
        refunded: escrow.refunded,
        createdAt: Number(escrow.createdAt),
        releaseDeadline: Number(escrow.releaseDeadline)
      };
    } catch (error) {
      logger.error('Failed to get escrow status:', error);
      return null;
    }
  }

  /**
   * Check if escrow can be auto-refunded (past deadline)
   */
  async canAutoRefund(deliveryId: string): Promise<boolean> {
    if (this.mockMode || !this.contract) {
      return false;
    }

    try {
      const deliveryIdBytes = this.deliveryIdToBytes32(deliveryId);
      return await this.contract.canAutoRefund(deliveryIdBytes);
    } catch (error) {
      logger.error('Failed to check auto-refund status:', error);
      return false;
    }
  }

  /**
   * Auto-refund escrow if past deadline
   */
  async autoRefund(deliveryId: string): Promise<EscrowResult> {
    if (this.mockMode) {
      return this.mockRefund(deliveryId);
    }

    if (!this.contract) {
      return {
        success: false,
        error: 'Ethereum escrow contract not initialized'
      };
    }

    try {
      const deliveryIdBytes = this.deliveryIdToBytes32(deliveryId);
      const tx = await this.contract.autoRefund(deliveryIdBytes);
      
      logger.info(`Auto-refund transaction submitted: ${tx.hash}`);
      const receipt = await tx.wait();
      
      if (!receipt) {
        throw new Error('Transaction receipt not received');
      }

      return {
        success: true,
        transactionHash: receipt.hash,
        blockNumber: Number(receipt.blockNumber)
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Auto-refund failed:', error);
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  // Mock methods for development/testing
  private async mockDeposit(deliveryId: string, sellerAddress: string, amount: number): Promise<EscrowResult> {
    logger.info(`[MOCK] Creating escrow deposit: ${amount} ETH for delivery ${deliveryId}`);
    const mockTxHash = `0x${Buffer.from(`${deliveryId}-deposit-${Date.now()}`).toString('hex').slice(0, 64)}`;
    return {
      success: true,
      transactionHash: mockTxHash,
      blockNumber: Math.floor(Date.now() / 1000)
    };
  }

  private async mockRelease(deliveryId: string): Promise<EscrowResult> {
    logger.info(`[MOCK] Releasing escrow for delivery ${deliveryId}`);
    const mockTxHash = `0x${Buffer.from(`${deliveryId}-release-${Date.now()}`).toString('hex').slice(0, 64)}`;
    return {
      success: true,
      transactionHash: mockTxHash,
      blockNumber: Math.floor(Date.now() / 1000) + 1
    };
  }

  private async mockRefund(deliveryId: string): Promise<EscrowResult> {
    logger.info(`[MOCK] Refunding escrow for delivery ${deliveryId}`);
    const mockTxHash = `0x${Buffer.from(`${deliveryId}-refund-${Date.now()}`).toString('hex').slice(0, 64)}`;
    return {
      success: true,
      transactionHash: mockTxHash,
      blockNumber: Math.floor(Date.now() / 1000) + 2
    };
  }
}

