import request from 'supertest';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { app } from '../index.js';
import { ROIAnalyticsService } from '../services/roi-analytics-service.js';

// Mock ROI Analytics Service
vi.mock('../services/roi-analytics-service.js', () => {
  const mockCalculateROI = vi.fn();
  return {
    ROIAnalyticsService: vi.fn().mockImplementation(() => ({
      calculateROI: mockCalculateROI
    }))
  };
});

describe('Analytics Routes', () => {
  let mockRoiService: { calculateROI: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.clearAllMocks();
    const RoiServiceConstructor = ROIAnalyticsService as unknown as ReturnType<typeof vi.fn>;
    mockRoiService = new RoiServiceConstructor() as { calculateROI: ReturnType<typeof vi.fn> };
  });

  describe('GET /api/analytics/roi', () => {
    it('should return ROI metrics without date range', async () => {
      const mockMetrics = {
        disputeReduction: {
          totalDisputes: 0,
          disputesWithProof: 0,
          disputesWithoutProof: 0,
          reductionPercent: 0,
          estimatedCostSavings: 0,
          avgDisputeResolutionTime: 4,
          avgDisputeCost: 50
        },
        fraudPrevention: {
          totalDeliveries: 10,
          verifiedDeliveries: 8,
          verificationRate: 80,
          tamperDetections: 0,
          estimatedFraudPrevented: 0.64
        },
        operationalEfficiency: {
          totalDeliveries: 10,
          verifiedDeliveries: 8,
          avgVerificationTime: 0,
          customerServiceCallsReduced: 0.8,
          timeSavedOnDisputes: 0
        },
        financialSummary: {
          totalCostSavings: 4,
          disputeCostSavings: 0,
          fraudPreventionSavings: 0.64,
          operationalEfficiencySavings: 4,
          roi: -99.96
        },
        period: {
          startDate: new Date().toISOString(),
          endDate: new Date().toISOString(),
          days: 90
        }
      };

      mockRoiService.calculateROI.mockResolvedValue(mockMetrics);

      const response = await request(app)
        .get('/api/analytics/roi');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.metrics).toBeDefined();
      expect(response.body.metrics.fraudPrevention.totalDeliveries).toBe(10);
    });

    it('should accept startDate and endDate query parameters', async () => {
      const startDate = '2024-01-01T00:00:00.000Z';
      const endDate = '2024-01-31T23:59:59.999Z';

      mockRoiService.calculateROI.mockResolvedValue({
        disputeReduction: { totalDisputes: 0, disputesWithProof: 0, disputesWithoutProof: 0, reductionPercent: 0, estimatedCostSavings: 0, avgDisputeResolutionTime: 4, avgDisputeCost: 50 },
        fraudPrevention: { totalDeliveries: 0, verifiedDeliveries: 0, verificationRate: 0, tamperDetections: 0, estimatedFraudPrevented: 0 },
        operationalEfficiency: { totalDeliveries: 0, verifiedDeliveries: 0, avgVerificationTime: 0, customerServiceCallsReduced: 0, timeSavedOnDisputes: 0 },
        financialSummary: { totalCostSavings: 0, disputeCostSavings: 0, fraudPreventionSavings: 0, operationalEfficiencySavings: 0, roi: 0 },
        period: { startDate, endDate, days: 31 }
      });

      const response = await request(app)
        .get(`/api/analytics/roi?startDate=${startDate}&endDate=${endDate}`);

      expect(response.status).toBe(200);
      expect(mockRoiService.calculateROI).toHaveBeenCalledWith(
        new Date(startDate),
        new Date(endDate)
      );
    });

    it('should handle service errors gracefully', async () => {
      mockRoiService.calculateROI.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/analytics/roi');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to calculate ROI metrics');
      expect(response.body.message).toBeDefined();
    });

    it('should work without authentication (optional auth)', async () => {
      mockRoiService.calculateROI.mockResolvedValue({
        disputeReduction: { totalDisputes: 0, disputesWithProof: 0, disputesWithoutProof: 0, reductionPercent: 0, estimatedCostSavings: 0, avgDisputeResolutionTime: 4, avgDisputeCost: 50 },
        fraudPrevention: { totalDeliveries: 0, verifiedDeliveries: 0, verificationRate: 0, tamperDetections: 0, estimatedFraudPrevented: 0 },
        operationalEfficiency: { totalDeliveries: 0, verifiedDeliveries: 0, avgVerificationTime: 0, customerServiceCallsReduced: 0, timeSavedOnDisputes: 0 },
        financialSummary: { totalCostSavings: 0, disputeCostSavings: 0, fraudPreventionSavings: 0, operationalEfficiencySavings: 0, roi: 0 },
        period: { startDate: new Date().toISOString(), endDate: new Date().toISOString(), days: 90 }
      });

      const response = await request(app)
        .get('/api/analytics/roi');

      expect(response.status).toBe(200);
    });
  });
});

