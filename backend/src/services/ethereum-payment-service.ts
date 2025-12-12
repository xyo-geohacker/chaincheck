/**
 * Ethereum Payment Service
 * 
 * Handles automatic payment release upon successful delivery verification using Ethereum blockchain.
 * Supports both mock mode (for development) and real Ethereum transactions.
 */

import { PaymentStatus } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { env } from '../lib/env.js';
import { logger } from '../lib/logger.js';

export interface PaymentResult {
  success: boolean;
  transactionHash?: string;
  blockNumber?: number;
  error?: string;
}

export class EthereumPaymentService {
  private mockMode: boolean;
  private provider: any; // ethers.js Provider or Web3 instance
  private wallet: any; // ethers.js Wallet or Web3 account

  constructor() {
    // Determine mock mode from environment configuration
    // Uses env.paymentMockMode which handles:
    // - PAYMENT_MOCK_MODE='true' → mock mode
    // - PAYMENT_MOCK_MODE='false' → real mode (if Ethereum configured)
    // - PAYMENT_MOCK_MODE not set → defaults to mock mode (safety)
    this.mockMode = env.paymentMockMode;
    
    // If explicitly set to false but Ethereum not configured, force mock mode for safety
    if (process.env.PAYMENT_MOCK_MODE === 'false' && (!env.ethereumRpcUrl || !env.ethereumPrivateKey)) {
      this.mockMode = true;
      logger.warn('PAYMENT_MOCK_MODE=false but Ethereum not configured. Forcing mock mode for safety.');
    }
    
    // Initialize Ethereum provider and wallet if not in mock mode
    if (!this.mockMode && env.ethereumRpcUrl && env.ethereumPrivateKey) {
      this.initializeEthereum();
    } else if (this.mockMode) {
      logger.info('Ethereum payment service running in MOCK MODE - no real transactions will be sent');
    }
  }

  /**
   * Initialize Ethereum provider and wallet
   */
  private async initializeEthereum() {
    try {
      // Dynamically import ethers.js to avoid requiring it if not needed
      const { ethers } = await import('ethers');
      
      // Create provider from RPC URL
      this.provider = new ethers.JsonRpcProvider(env.ethereumRpcUrl);
      
      // Create wallet from private key
      this.wallet = new ethers.Wallet(env.ethereumPrivateKey!, this.provider);
      
      logger.info(`Ethereum payment service initialized. Wallet address: ${this.wallet.address}`);
    } catch (error) {
      logger.error('Failed to initialize Ethereum payment service:', error);
      // Fall back to mock mode if initialization fails
      this.mockMode = true;
    }
  }

  /**
   * Release payment from buyer to seller upon successful delivery verification
   */
  async releasePayment(deliveryId: string): Promise<PaymentResult> {
    try {
      // Get delivery with payment information
      const delivery = await prisma.delivery.findUnique({
        where: { id: deliveryId }
      });

      if (!delivery) {
        throw new Error(`Delivery ${deliveryId} not found`);
      }

      // Check if payment is already processed
      if (delivery.paymentStatus === PaymentStatus.PAID) {
        logger.info(`Payment already processed for delivery ${deliveryId}`);
        return {
          success: true,
          transactionHash: delivery.paymentTransactionHash ?? undefined,
          blockNumber: delivery.paymentBlockNumber ?? undefined
        };
      }

      // Check if payment is required for this delivery
      if (!delivery.requiresPaymentOnDelivery) {
        logger.info(`Payment not required for delivery ${deliveryId} (requiresPaymentOnDelivery is false)`);
        return {
          success: true,
          // No transaction hash since payment was not required
        };
      }

      // Validate payment currency
      if (delivery.paymentCurrency !== 'ETH') {
        logger.warn(`Payment currency ${delivery.paymentCurrency} is not supported. Only ETH is supported.`);
        return {
          success: false,
          error: `Payment currency ${delivery.paymentCurrency} is not supported. Only ETH is supported.`
        };
      }

      // Validate payment information
      if (!delivery.buyerWalletAddress || !delivery.sellerWalletAddress || !delivery.paymentAmount) {
        logger.warn(`Delivery ${deliveryId} requires payment but payment information is not configured`);
        return {
          success: false,
          error: 'Payment information not configured for this delivery'
        };
      }

      // Validate Ethereum addresses
      if (!this.isValidEthereumAddress(delivery.buyerWalletAddress) || 
          !this.isValidEthereumAddress(delivery.sellerWalletAddress)) {
        return {
          success: false,
          error: 'Invalid Ethereum wallet addresses'
        };
      }

      // Validate payment amount
      if (delivery.paymentAmount <= 0) {
        throw new Error(`Invalid payment amount: ${delivery.paymentAmount}`);
      }

      // Check if delivery is verified
      if (delivery.status !== 'DELIVERED' || !delivery.proofHash) {
        throw new Error('Delivery must be verified before payment can be released');
      }

      // Update payment status to processing
      await prisma.delivery.update({
        where: { id: deliveryId },
        data: {
          paymentStatus: PaymentStatus.ESCROWED // Temporary status while processing
        }
      });

      // Execute payment transfer
      let paymentResult: PaymentResult;
      
      if (this.mockMode) {
        paymentResult = await this.mockPaymentTransfer(
          delivery.buyerWalletAddress,
          delivery.sellerWalletAddress,
          delivery.paymentAmount
        );
      } else {
        paymentResult = await this.realPaymentTransfer(
          delivery.buyerWalletAddress,
          delivery.sellerWalletAddress,
          delivery.paymentAmount
        );
      }

      // Update delivery with payment result
      if (paymentResult.success) {
        await prisma.delivery.update({
          where: { id: deliveryId },
          data: {
            paymentStatus: PaymentStatus.PAID,
            paymentTransactionHash: paymentResult.transactionHash ?? null,
            paymentBlockNumber: paymentResult.blockNumber ?? null,
            paymentError: null
          }
        });

        logger.info(`Payment released for delivery ${deliveryId}: ${paymentResult.transactionHash}`);
      } else {
        await prisma.delivery.update({
          where: { id: deliveryId },
          data: {
            paymentStatus: PaymentStatus.FAILED,
            paymentError: paymentResult.error ?? 'Payment transfer failed'
          }
        });

        logger.error(`Payment failed for delivery ${deliveryId}: ${paymentResult.error}`);
      }

      return paymentResult;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Error releasing payment for delivery ${deliveryId}:`, error);

      // Update delivery with error
      try {
        await prisma.delivery.update({
          where: { id: deliveryId },
          data: {
            paymentStatus: PaymentStatus.FAILED,
            paymentError: errorMessage
          }
        });
      } catch (updateError) {
        logger.error('Failed to update delivery payment status:', updateError);
      }

      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Mock payment transfer for development/testing
   * Generates a mock transaction hash without actual blockchain interaction
   */
  private async mockPaymentTransfer(
    buyerAddress: string,
    sellerAddress: string,
    amount: number
  ): Promise<PaymentResult> {
    logger.info(`[MOCK] Transferring ${amount} ETH from ${buyerAddress} to ${sellerAddress}`);

    // Generate a mock Ethereum transaction hash (64 hex characters)
    const mockHash = `0x${Array.from({ length: 64 }, () => 
      Math.floor(Math.random() * 16).toString(16)
    ).join('')}`;

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 100));

    return {
      success: true,
      transactionHash: mockHash,
      blockNumber: Math.floor(Date.now() / 1000) // Mock block number
    };
  }

  /**
   * Real payment transfer using Ethereum blockchain
   */
  private async realPaymentTransfer(
    buyerAddress: string,
    sellerAddress: string,
    amount: number
  ): Promise<PaymentResult> {
    try {
      if (!this.provider || !this.wallet) {
        throw new Error('Ethereum provider and wallet not initialized');
      }

      logger.info(`Transferring ${amount} ETH from ${buyerAddress} to ${sellerAddress}`);

      // Convert amount to wei (1 ETH = 10^18 wei)
      const amountWei = BigInt(Math.floor(amount * 1e18));

      // Note: In a real implementation, you would need the buyer's private key to send from their address
      // For now, we're using the configured wallet. In production, you might:
      // 1. Use a smart contract escrow that holds the buyer's funds
      // 2. Have the buyer sign a transaction offline
      // 3. Use a payment service that handles the buyer's private key securely

      // For demonstration, we'll send from the configured wallet
      // In production, this should be handled by a smart contract or payment service
      const transaction = await this.wallet.sendTransaction({
        to: sellerAddress,
        value: amountWei
      });

      logger.info(`Ethereum transaction submitted: ${transaction.hash}`);

      // Wait for transaction confirmation
      const receipt = await transaction.wait();
      
      if (!receipt) {
        throw new Error('Transaction receipt not received');
      }

      logger.info(`Ethereum transaction confirmed in block ${receipt.blockNumber}`);

      return {
        success: true,
        transactionHash: receipt.hash,
        blockNumber: Number(receipt.blockNumber)
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Ethereum payment transfer error:', error);
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Refund payment to buyer (e.g., for disputes or failed deliveries)
   */
  async refundPayment(deliveryId: string): Promise<PaymentResult> {
    try {
      const delivery = await prisma.delivery.findUnique({
        where: { id: deliveryId }
      });

      if (!delivery) {
        throw new Error(`Delivery ${deliveryId} not found`);
      }

      if (delivery.paymentStatus !== PaymentStatus.PAID) {
        throw new Error(`Payment must be PAID to refund. Current status: ${delivery.paymentStatus}`);
      }

      if (!delivery.buyerWalletAddress || !delivery.sellerWalletAddress || !delivery.paymentAmount) {
        throw new Error('Payment information not available for refund');
      }

      // Reverse the payment (seller -> buyer)
      let refundResult: PaymentResult;

      if (this.mockMode) {
        refundResult = await this.mockPaymentTransfer(
          delivery.sellerWalletAddress,
          delivery.buyerWalletAddress,
          delivery.paymentAmount
        );
      } else {
        refundResult = await this.realPaymentTransfer(
          delivery.sellerWalletAddress,
          delivery.buyerWalletAddress,
          delivery.paymentAmount
        );
      }

      if (refundResult.success) {
        await prisma.delivery.update({
          where: { id: deliveryId },
          data: {
            paymentStatus: PaymentStatus.REFUNDED,
            paymentError: null
          }
        });

        logger.info(`Payment refunded for delivery ${deliveryId}: ${refundResult.transactionHash}`);
      } else {
        await prisma.delivery.update({
          where: { id: deliveryId },
          data: {
            paymentError: refundResult.error ?? 'Refund failed'
          }
        });
      }

      return refundResult;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Error refunding payment for delivery ${deliveryId}:`, error);
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Get payment status for a delivery
   */
  async getPaymentStatus(deliveryId: string) {
    const delivery = await prisma.delivery.findUnique({
      where: { id: deliveryId },
      select: {
        id: true,
        orderId: true,
        requiresPaymentOnDelivery: true,
        paymentCurrency: true,
        buyerWalletAddress: true,
        sellerWalletAddress: true,
        paymentAmount: true,
        paymentStatus: true,
        paymentTransactionHash: true,
        paymentBlockNumber: true,
        paymentError: true
      }
    });

    if (!delivery) {
      throw new Error(`Delivery ${deliveryId} not found`);
    }

    return delivery;
  }

  /**
   * Validate Ethereum address format
   */
  private isValidEthereumAddress(address: string): boolean {
    // Ethereum addresses are 42 characters: 0x followed by 40 hex characters
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }
}

