import { Router } from 'express';
import { EthereumPaymentService } from '../services/ethereum-payment-service.js';
import { EthereumEscrowService } from '../services/ethereum-escrow-service.js';
import { prisma } from '../lib/prisma.js';
import { env } from '../lib/env.js';
import { authenticateToken } from '../middleware/auth-middleware.js';
import { validateRequest } from '../middleware/validation-middleware.js';
import { z } from 'zod';
import { logger } from '../lib/logger.js';
import { PaymentStatus } from '@prisma/client';

const router = Router();
const paymentService = new EthereumPaymentService();
const escrowService = new EthereumEscrowService();

// Schema for delivery ID parameter
const deliveryIdParamSchema = z.object({
  id: z.string().uuid('Invalid delivery ID format')
});

/**
 * @swagger
 * /api/deliveries/{id}/payment:
 *   get:
 *     summary: Get payment status for a delivery
 *     description: Returns payment information including status, transaction hash, and amount
 *     tags: [Payment]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Delivery ID
 *     responses:
 *       200:
 *         description: Payment status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 orderId:
 *                   type: string
 *                 buyerWalletAddress:
 *                   type: string
 *                 sellerWalletAddress:
 *                   type: string
 *                 paymentAmount:
 *                   type: number
 *                 paymentStatus:
 *                   type: string
 *                   enum: [PENDING, ESCROWED, PAID, FAILED, REFUNDED]
 *                 paymentTransactionHash:
 *                   type: string
 *                   nullable: true
 *                 paymentBlockNumber:
 *                   type: integer
 *                   nullable: true
 *                 paymentError:
 *                   type: string
 *                   nullable: true
 *       404:
 *         description: Delivery not found
 *       500:
 *         description: Server error
 */
router.get(
  '/deliveries/:id/payment',
  authenticateToken,
  validateRequest(deliveryIdParamSchema, 'params'),
  async (req, res) => {
    try {
      const { id } = req.params;
      
      // Get payment status from database
      const delivery = await prisma.delivery.findUnique({
        where: { id },
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
          paymentError: true,
          escrowContractAddress: true,
          escrowDepositTxHash: true,
          escrowDepositBlock: true,
          escrowReleaseTxHash: true,
          escrowReleaseBlock: true,
          escrowRefundTxHash: true,
          escrowRefundBlock: true
        }
      });

      if (!delivery) {
        return res.status(404).json({ error: 'Delivery not found' });
      }

      // If using escrow, get on-chain status
      let escrowStatus = null;
      if (env.useEscrow && delivery.escrowContractAddress) {
        escrowStatus = await escrowService.getEscrowStatus(id);
      }

      return res.json({
        ...delivery,
        escrowStatus // Include on-chain escrow status if available
      });
    } catch (error) {
      logger.error('Error getting payment status:', error);
      if (error instanceof Error && error.message.includes('not found')) {
        return res.status(404).json({ error: error.message });
      }
      return res.status(500).json({ 
        error: 'Failed to get payment status',
        message: error instanceof Error ? error.message : String(error)
      });
    }
  }
);

/**
 * @swagger
 * /api/deliveries/{id}/payment/release:
 *   post:
 *     summary: Manually release payment for a delivery
 *     description: Manually trigger payment release (useful if automatic release failed)
 *     tags: [Payment]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Delivery ID
 *     responses:
 *       200:
 *         description: Payment released successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 transactionHash:
 *                   type: string
 *                   nullable: true
 *                 blockNumber:
 *                   type: integer
 *                   nullable: true
 *                 error:
 *                   type: string
 *                   nullable: true
 *       400:
 *         description: Invalid request (e.g., payment already processed)
 *       404:
 *         description: Delivery not found
 *       500:
 *         description: Server error
 */
router.post(
  '/deliveries/:id/payment/release',
  authenticateToken,
  validateRequest(deliveryIdParamSchema, 'params'),
  async (req, res) => {
    try {
      const { id } = req.params;
      
      // Check if using escrow
      if (env.useEscrow) {
        const delivery = await prisma.delivery.findUnique({
          where: { id },
          select: { paymentStatus: true, escrowContractAddress: true }
        });

        if (!delivery) {
          return res.status(404).json({ error: 'Delivery not found' });
        }

        if (delivery.paymentStatus !== PaymentStatus.ESCROWED) {
          return res.status(400).json({ 
            error: 'Payment must be in ESCROWED status to release',
            currentStatus: delivery.paymentStatus
          });
        }

        const result = await escrowService.releaseEscrow(id);
        
        if (result.success) {
          // Update delivery with release details
          await prisma.delivery.update({
            where: { id },
            data: {
              paymentStatus: PaymentStatus.PAID,
              paymentTransactionHash: result.transactionHash ?? null,
              paymentBlockNumber: result.blockNumber ?? null,
              escrowReleaseTxHash: result.transactionHash ?? null,
              escrowReleaseBlock: result.blockNumber ?? null,
              paymentError: null
            }
          });
        } else {
          // Update delivery with error
          await prisma.delivery.update({
            where: { id },
            data: {
              paymentError: result.error ?? 'Escrow release failed'
            }
          });
        }

        if (result.success) {
          return res.json(result);
        } else {
          return res.status(400).json(result);
        }
      } else {
        // Direct transfer (original implementation)
        const result = await paymentService.releasePayment(id);
        
        if (result.success) {
          return res.json(result);
        } else {
          return res.status(400).json(result);
        }
      }
    } catch (error) {
      logger.error('Error releasing payment:', error);
      if (error instanceof Error && error.message.includes('not found')) {
        return res.status(404).json({ error: error.message });
      }
      return res.status(500).json({ 
        error: 'Failed to release payment',
        message: error instanceof Error ? error.message : String(error)
      });
    }
  }
);

/**
 * @swagger
 * /api/deliveries/{id}/payment/refund:
 *   post:
 *     summary: Refund payment to buyer
 *     description: Refund payment from seller back to buyer (e.g., for disputes or failed deliveries)
 *     tags: [Payment]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Delivery ID
 *     responses:
 *       200:
 *         description: Payment refunded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 transactionHash:
 *                   type: string
 *                   nullable: true
 *                 blockNumber:
 *                   type: integer
 *                   nullable: true
 *                 error:
 *                   type: string
 *                   nullable: true
 *       400:
 *         description: Invalid request (e.g., payment not yet paid)
 *       404:
 *         description: Delivery not found
 *       500:
 *         description: Server error
 */
router.post(
  '/deliveries/:id/payment/refund',
  authenticateToken,
  validateRequest(deliveryIdParamSchema, 'params'),
  async (req, res) => {
    try {
      const { id } = req.params;
      
      // Check if using escrow
      if (env.useEscrow) {
        const delivery = await prisma.delivery.findUnique({
          where: { id },
          select: { paymentStatus: true, escrowContractAddress: true }
        });

        if (!delivery) {
          return res.status(404).json({ error: 'Delivery not found' });
        }

        if (delivery.paymentStatus !== PaymentStatus.ESCROWED) {
          return res.status(400).json({ 
            error: 'Payment must be in ESCROWED status to refund',
            currentStatus: delivery.paymentStatus
          });
        }

        const result = await escrowService.refundEscrow(id);
        
        if (result.success) {
          // Update delivery with refund details
          await prisma.delivery.update({
            where: { id },
            data: {
              paymentStatus: PaymentStatus.REFUNDED,
              paymentTransactionHash: result.transactionHash ?? null,
              paymentBlockNumber: result.blockNumber ?? null,
              escrowRefundTxHash: result.transactionHash ?? null,
              escrowRefundBlock: result.blockNumber ?? null,
              paymentError: null
            }
          });
        } else {
          // Update delivery with error
          await prisma.delivery.update({
            where: { id },
            data: {
              paymentError: result.error ?? 'Escrow refund failed'
            }
          });
        }

        if (result.success) {
          return res.json(result);
        } else {
          return res.status(400).json(result);
        }
      } else {
        // Direct transfer refund (original implementation)
        const result = await paymentService.refundPayment(id);
        
        if (result.success) {
          return res.json(result);
        } else {
          return res.status(400).json(result);
        }
      }
    } catch (error) {
      logger.error('Error refunding payment:', error);
      if (error instanceof Error && error.message.includes('not found')) {
        return res.status(404).json({ error: error.message });
      }
      return res.status(500).json({ 
        error: 'Failed to refund payment',
        message: error instanceof Error ? error.message : String(error)
      });
    }
  }
);

export default router;

