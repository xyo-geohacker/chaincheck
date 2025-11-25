import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ROIAnalyticsService } from '../services/roi-analytics-service.js';
import { prisma } from '../lib/prisma.js';
import { DeliveryStatus } from '@prisma/client';

// Mock Prisma
vi.mock('../lib/prisma.js', () => ({
  prisma: {
    delivery: {
      findMany: vi.fn()
    }
  }
}));

describe('ROI Analytics Service', () => {
  let roiService: ROIAnalyticsService;

  beforeEach(() => {
    vi.clearAllMocks();
    roiService = new ROIAnalyticsService();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('calculateROI', () => {
    it('should calculate ROI metrics with no deliveries', async () => {
      vi.mocked(prisma.delivery.findMany).mockResolvedValue([]);

      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');
      const metrics = await roiService.calculateROI(startDate, endDate);

      expect(metrics).toBeDefined();
      expect(metrics.fraudPrevention.totalDeliveries).toBe(0);
      expect(metrics.fraudPrevention.verifiedDeliveries).toBe(0);
      expect(metrics.disputeReduction.totalDisputes).toBe(0);
      expect(metrics.financialSummary.totalCostSavings).toBeGreaterThanOrEqual(0);
      expect(metrics.period.startDate).toBe(startDate.toISOString());
      expect(metrics.period.endDate).toBe(endDate.toISOString());
    });

    it('should calculate ROI metrics with verified deliveries', async () => {
      const mockDeliveries = [
        {
          id: '1',
          status: DeliveryStatus.DELIVERED,
          proofHash: 'proof-hash-1',
          verifiedAt: new Date('2024-01-15T10:00:00Z'),
          createdAt: new Date('2024-01-15T09:00:00Z'),
          boundWitnessData: { isValid: true }
        },
        {
          id: '2',
          status: DeliveryStatus.DELIVERED,
          proofHash: 'proof-hash-2',
          verifiedAt: new Date('2024-01-16T10:00:00Z'),
          createdAt: new Date('2024-01-16T09:00:00Z'),
          boundWitnessData: { isValid: true }
        }
      ];

      vi.mocked(prisma.delivery.findMany).mockResolvedValue(mockDeliveries as any);

      const metrics = await roiService.calculateROI();

      expect(metrics.fraudPrevention.totalDeliveries).toBe(2);
      expect(metrics.fraudPrevention.verifiedDeliveries).toBe(2);
      expect(metrics.fraudPrevention.verificationRate).toBe(100);
      expect(metrics.operationalEfficiency.verifiedDeliveries).toBe(2);
      expect(metrics.financialSummary.totalCostSavings).toBeGreaterThan(0);
    });

    it('should calculate dispute reduction correctly', async () => {
      const mockDeliveries = [
        {
          id: '1',
          status: DeliveryStatus.DISPUTED,
          proofHash: 'proof-hash-1',
          verifiedAt: new Date('2024-01-15T10:00:00Z'),
          createdAt: new Date('2024-01-15T09:00:00Z'),
          boundWitnessData: null
        },
        {
          id: '2',
          status: DeliveryStatus.DISPUTED,
          proofHash: null,
          verifiedAt: null,
          createdAt: new Date('2024-01-16T09:00:00Z'),
          boundWitnessData: null
        }
      ];

      vi.mocked(prisma.delivery.findMany).mockResolvedValue(mockDeliveries as any);

      const metrics = await roiService.calculateROI();

      expect(metrics.disputeReduction.totalDisputes).toBe(2);
      expect(metrics.disputeReduction.disputesWithProof).toBe(1);
      expect(metrics.disputeReduction.disputesWithoutProof).toBe(1);
    });

    it('should calculate average verification time', async () => {
      const mockDeliveries = [
        {
          id: '1',
          status: DeliveryStatus.DELIVERED,
          proofHash: 'proof-hash-1',
          verifiedAt: new Date('2024-01-15T10:00:00Z'),
          createdAt: new Date('2024-01-15T09:00:00Z'), // 1 hour = 3600 seconds
          boundWitnessData: null
        },
        {
          id: '2',
          status: DeliveryStatus.DELIVERED,
          proofHash: 'proof-hash-2',
          verifiedAt: new Date('2024-01-16T10:30:00Z'),
          createdAt: new Date('2024-01-16T10:00:00Z'), // 30 minutes = 1800 seconds
          boundWitnessData: null
        }
      ];

      vi.mocked(prisma.delivery.findMany).mockResolvedValue(mockDeliveries as any);

      const metrics = await roiService.calculateROI();

      // Average should be (3600 + 1800) / 2 = 2700 seconds
      expect(metrics.operationalEfficiency.avgVerificationTime).toBeGreaterThan(2000);
      expect(metrics.operationalEfficiency.avgVerificationTime).toBeLessThan(3000);
    });

    it('should handle date range filtering', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      vi.mocked(prisma.delivery.findMany).mockResolvedValue([]);

      await roiService.calculateROI(startDate, endDate);

      expect(prisma.delivery.findMany).toHaveBeenCalledWith({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate
          }
        },
        select: expect.any(Object)
      });
    });

    it('should calculate ROI percentage correctly', async () => {
      const mockDeliveries = Array.from({ length: 100 }, (_, i) => ({
        id: `delivery-${i}`,
        status: DeliveryStatus.DELIVERED,
        proofHash: `proof-hash-${i}`,
        verifiedAt: new Date(`2024-01-${(i % 28) + 1}T10:00:00Z`),
        createdAt: new Date(`2024-01-${(i % 28) + 1}T09:00:00Z`),
        boundWitnessData: null
      }));

      vi.mocked(prisma.delivery.findMany).mockResolvedValue(mockDeliveries as any);

      const metrics = await roiService.calculateROI();

      expect(metrics.financialSummary.roi).toBeDefined();
      expect(typeof metrics.financialSummary.roi).toBe('number');
      // ROI should be calculated based on savings vs implementation cost
      expect(metrics.financialSummary.roi).toBeGreaterThanOrEqual(0);
    });

    it('should handle deliveries without verification timestamps', async () => {
      const mockDeliveries = [
        {
          id: '1',
          status: DeliveryStatus.DELIVERED,
          proofHash: 'proof-hash-1',
          verifiedAt: null,
          createdAt: new Date('2024-01-15T09:00:00Z'),
          boundWitnessData: null
        }
      ];

      vi.mocked(prisma.delivery.findMany).mockResolvedValue(mockDeliveries as any);

      const metrics = await roiService.calculateROI();

      expect(metrics.operationalEfficiency.avgVerificationTime).toBe(0);
    });

    it('should calculate period days correctly', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      vi.mocked(prisma.delivery.findMany).mockResolvedValue([]);

      const metrics = await roiService.calculateROI(startDate, endDate);

      // 31 days
      expect(metrics.period.days).toBe(31);
    });

    it('should use default date range when not provided', async () => {
      vi.mocked(prisma.delivery.findMany).mockResolvedValue([]);

      await roiService.calculateROI();

      expect(prisma.delivery.findMany).toHaveBeenCalled();
      const callArgs = vi.mocked(prisma.delivery.findMany).mock.calls[0][0];
      expect(callArgs.where.createdAt).toBeDefined();
    });
  });
});

