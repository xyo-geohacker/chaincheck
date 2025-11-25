/**
 * Analytics API Routes
 * Provides ROI and business metrics for enterprise partners
 */

import { Router } from 'express';
import { z } from 'zod';
import { ROIAnalyticsService } from '../services/roi-analytics-service.js';
import { optionalAuthenticateToken } from '../middleware/auth-middleware.js';
import { validateRequest } from '../middleware/validation-middleware.js';
import { logger } from '../lib/logger.js';

const router = Router();
const roiService = new ROIAnalyticsService();

// Query schema for date range
const dateRangeQuerySchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional()
});

/**
 * @swagger
 * /api/analytics/roi:
 *   get:
 *     summary: Get ROI metrics
 *     description: Calculate and return business value metrics including dispute reduction, fraud prevention, operational efficiency, and financial summary
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Start date for metrics calculation (ISO 8601 format)
 *         example: "2024-01-01T00:00:00.000Z"
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: End date for metrics calculation (ISO 8601 format)
 *         example: "2024-12-31T23:59:59.999Z"
 *     responses:
 *       200:
 *         description: ROI metrics calculated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 metrics:
 *                   $ref: '#/components/schemas/ROIMetrics'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// GET /api/analytics/roi - Get ROI metrics
router.get(
  '/analytics/roi',
  optionalAuthenticateToken,
  validateRequest(dateRangeQuerySchema, 'query'),
  async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      
      const start = startDate ? new Date(startDate as string) : undefined;
      const end = endDate ? new Date(endDate as string) : undefined;
      
      const metrics = await roiService.calculateROI(start, end);
      
      return res.json({
        success: true,
        metrics
      });
    } catch (error) {
      logger.error('ROI analytics calculation error', error);
      return res.status(500).json({
        error: 'Failed to calculate ROI metrics',
        message: error instanceof Error ? error.message : String(error)
      });
    }
  }
);

export default router;

