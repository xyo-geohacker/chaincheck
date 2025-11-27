/**
 * ROI Analytics Service
 * Calculates business value metrics for enterprise partners
 */

import { prisma } from '../lib/prisma.js';
import { DeliveryStatus } from '@prisma/client';

export interface ROIMetrics {
  // Dispute Reduction
  disputeReduction: {
    totalDisputes: number;
    disputesWithProof: number;
    disputesWithoutProof: number;
    reductionPercent: number;
    estimatedCostSavings: number; // in dollars
    avgDisputeResolutionTime: number; // in hours
    avgDisputeCost: number; // in dollars
  };
  
  // Fraud Prevention
  fraudPrevention: {
    totalDeliveries: number;
    verifiedDeliveries: number;
    verificationRate: number;
    tamperDetections: number;
    estimatedFraudPrevented: number; // in dollars
  };
  
  // Operational Efficiency
  operationalEfficiency: {
    totalDeliveries: number;
    verifiedDeliveries: number;
    avgVerificationTime: number; // in seconds
    customerServiceCallsReduced: number; // estimated
    timeSavedOnDisputes: number; // in hours
  };
  
  // Financial Summary
  financialSummary: {
    totalCostSavings: number; // in dollars
    disputeCostSavings: number; // in dollars
    fraudPreventionSavings: number; // in dollars
    operationalEfficiencySavings: number; // in dollars
    roi: number; // return on investment percentage
  };
  
  // Time Period
  period: {
    startDate: string;
    endDate: string;
    days: number;
  };
}

export class ROIAnalyticsService {
  // Average cost to resolve a dispute (in dollars)
  private readonly AVG_DISPUTE_COST = 50;
  
  // Average time to resolve a dispute (in hours)
  private readonly AVG_DISPUTE_RESOLUTION_TIME = 4;
  
  // Average cost of fraud per delivery (in dollars)
  private readonly AVG_FRAUD_COST = 100;
  
  // Estimated customer service calls reduced per verified delivery
  private readonly CS_CALLS_REDUCED_PER_VERIFIED = 0.1;
  
  // Average cost per customer service call (in dollars)
  private readonly AVG_CS_CALL_COST = 5;
  
  // Estimated time saved per verified delivery (in minutes)
  private readonly TIME_SAVED_PER_VERIFIED = 2;

  /**
   * Calculate ROI metrics for a given time period
   */
  async calculateROI(startDate?: Date, endDate?: Date): Promise<ROIMetrics> {
    const now = new Date();
    const defaultStartDate = startDate || new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000); // 90 days ago
    const defaultEndDate = endDate || now;
    
    // Calculate days using Math.round() to handle time component differences
    // This ensures "Last 90 Days" displays as "90 days" instead of "91 days"
    const days = Math.round((defaultEndDate.getTime() - defaultStartDate.getTime()) / (1000 * 60 * 60 * 24));

    // Get all deliveries in the period
    const deliveries = await prisma.delivery.findMany({
      where: {
        createdAt: {
          gte: defaultStartDate,
          lte: defaultEndDate
        }
      },
      select: {
        id: true,
        status: true,
        proofHash: true,
        verifiedAt: true,
        createdAt: true,
        boundWitnessData: true
      }
    });

    const totalDeliveries = deliveries.length;
    const verifiedDeliveries = deliveries.filter(d => d.proofHash !== null).length;
    const disputes = deliveries.filter(d => d.status === DeliveryStatus.DISPUTED);
    const disputesWithProof = disputes.filter(d => d.proofHash !== null);
    const disputesWithoutProof = disputes.filter(d => d.proofHash === null);

    // Calculate dispute reduction
    const totalDisputes = disputes.length;
    const disputeReductionPercent = totalDisputes > 0
      ? ((disputesWithoutProof.length - disputesWithProof.length) / totalDisputes) * 100
      : 0;
    
    // Estimate cost savings from dispute reduction
    // Assumption: Verified deliveries reduce disputes by 60% on average
    const estimatedDisputesPrevented = verifiedDeliveries * 0.006; // 0.6% dispute rate, 60% reduction
    const disputeCostSavings = estimatedDisputesPrevented * this.AVG_DISPUTE_COST;
    const timeSavedOnDisputes = estimatedDisputesPrevented * this.AVG_DISPUTE_RESOLUTION_TIME;

    // Calculate fraud prevention
    const verificationRate = totalDeliveries > 0
      ? (verifiedDeliveries / totalDeliveries) * 100
      : 0;
    
    // Check for tamper detections in bound witness data
    let tamperDetections = 0;
    for (const delivery of deliveries) {
      if (delivery.boundWitnessData && typeof delivery.boundWitnessData === 'object') {
        const bwData = delivery.boundWitnessData as Record<string, unknown>;
        // Check if tampering was detected (this would be stored in the data)
        // For now, we'll estimate based on verification status
        if (delivery.proofHash && delivery.status === DeliveryStatus.DISPUTED) {
          tamperDetections++;
        }
      }
    }
    
    // Estimate fraud prevented (verified deliveries reduce fraud by 80%)
    const estimatedFraudPrevented = verifiedDeliveries * 0.008 * this.AVG_FRAUD_COST; // 0.8% fraud rate, 80% reduction

    // Calculate operational efficiency
    const customerServiceCallsReduced = verifiedDeliveries * this.CS_CALLS_REDUCED_PER_VERIFIED;
    const operationalEfficiencySavings = customerServiceCallsReduced * this.AVG_CS_CALL_COST;
    
    // Calculate average verification time (if we have verifiedAt timestamps)
    let totalVerificationTime = 0;
    let verificationCount = 0;
    for (const delivery of deliveries) {
      if (delivery.verifiedAt && delivery.createdAt) {
        const timeDiff = delivery.verifiedAt.getTime() - delivery.createdAt.getTime();
        totalVerificationTime += timeDiff / 1000; // Convert to seconds
        verificationCount++;
      }
    }
    const avgVerificationTime = verificationCount > 0
      ? totalVerificationTime / verificationCount
      : 0;

    // Calculate total cost savings
    const totalCostSavings = disputeCostSavings + estimatedFraudPrevented + operationalEfficiencySavings;
    
    // Calculate ROI (assuming implementation cost of $10,000 for first year)
    // ROI = (Total Savings - Implementation Cost) / Implementation Cost * 100
    const implementationCost = 10000;
    
    // If there are no verified deliveries, ROI cannot be calculated yet (return 0%)
    // This prevents showing -100% ROI when the system is just starting
    let roi = 0;
    if (verifiedDeliveries > 0) {
      roi = implementationCost > 0
        ? ((totalCostSavings - implementationCost) / implementationCost) * 100
        : (totalCostSavings / 1000) * 100; // If no implementation cost, show ROI per $1000
    }

    return {
      disputeReduction: {
        totalDisputes,
        disputesWithProof: disputesWithProof.length,
        disputesWithoutProof: disputesWithoutProof.length,
        reductionPercent: Math.max(0, disputeReductionPercent),
        estimatedCostSavings: Math.round(disputeCostSavings * 100) / 100,
        avgDisputeResolutionTime: this.AVG_DISPUTE_RESOLUTION_TIME,
        avgDisputeCost: this.AVG_DISPUTE_COST
      },
      fraudPrevention: {
        totalDeliveries,
        verifiedDeliveries,
        verificationRate: Math.round(verificationRate * 10) / 10,
        tamperDetections,
        estimatedFraudPrevented: Math.round(estimatedFraudPrevented * 100) / 100
      },
      operationalEfficiency: {
        totalDeliveries,
        verifiedDeliveries,
        avgVerificationTime: Math.round(avgVerificationTime * 10) / 10,
        customerServiceCallsReduced: Math.round(customerServiceCallsReduced * 10) / 10,
        timeSavedOnDisputes: Math.round(timeSavedOnDisputes * 10) / 10
      },
      financialSummary: {
        totalCostSavings: Math.round(totalCostSavings * 100) / 100,
        disputeCostSavings: Math.round(disputeCostSavings * 100) / 100,
        fraudPreventionSavings: Math.round(estimatedFraudPrevented * 100) / 100,
        operationalEfficiencySavings: Math.round(operationalEfficiencySavings * 100) / 100,
        roi: Math.round(roi * 10) / 10
      },
      period: {
        startDate: defaultStartDate.toISOString(),
        endDate: defaultEndDate.toISOString(),
        days
      }
    };
  }
}

