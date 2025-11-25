'use client';

import { useEffect, useState } from 'react';
import { fetchROIMetrics, type ROIMetrics } from '@lib/api';

export function ROIDashboard() {
  const [metrics, setMetrics] = useState<ROIMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<'30' | '90' | '365' | 'all'>('90');

  useEffect(() => {
    async function loadMetrics() {
      try {
        setLoading(true);
        setError(null);
        
        let startDate: string | undefined;
        const endDate = new Date().toISOString();
        
        if (dateRange !== 'all') {
          const days = parseInt(dateRange);
          const start = new Date();
          start.setDate(start.getDate() - days);
          startDate = start.toISOString();
        }
        
        const data = await fetchROIMetrics(startDate, endDate);
        setMetrics(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load ROI metrics');
      } finally {
        setLoading(false);
      }
    }

    loadMetrics();
  }, [dateRange]);

  if (loading) {
    return (
      <div className="glass-card rounded-3xl border border-[#2f2862] px-6 py-6 text-slate-100">
        <div className="text-center py-12">
          <div className="text-slate-400">Loading ROI metrics...</div>
        </div>
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <div className="glass-card rounded-3xl border border-[#2f2862] px-6 py-6 text-slate-100">
        <div className="text-center py-12">
          <div className="text-rose-400">Error: {error || 'Failed to load metrics'}</div>
        </div>
      </div>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 1
    }).format(value);
  };

  return (
    <div className="space-y-6">
      {/* Header with Date Range Selector */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-white">ROI Dashboard</h1>
          <p className="text-sm text-slate-400 mt-1">
            Business value metrics and return on investment analysis
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-300">Period:</label>
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as '30' | '90' | '365' | 'all')}
            className="rounded-lg border border-[#2f2862] bg-[#0a0815] px-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#8ea8ff]"
          >
            <option value="30">Last 30 Days</option>
            <option value="90">Last 90 Days</option>
            <option value="365">Last Year</option>
            <option value="all">All Time</option>
          </select>
        </div>
      </div>

      {/* Financial Summary - Hero Section */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="glass-card rounded-3xl border border-emerald-500/40 bg-emerald-500/10 px-6 py-6">
          <div className="text-xs uppercase tracking-[0.25em] text-emerald-300 mb-2">Total Cost Savings</div>
          <div className="text-4xl font-bold text-emerald-200 mb-1">
            {formatCurrency(metrics.financialSummary.totalCostSavings)}
          </div>
          <div className="text-xs text-emerald-300/80">
            Over {metrics.period.days} days
          </div>
        </div>

        <div className="glass-card rounded-3xl border border-[#8ea8ff]/40 bg-[#8ea8ff]/10 px-6 py-6">
          <div className="text-xs uppercase tracking-[0.25em] text-[#8ea8ff] mb-2">Return on Investment</div>
          <div className="text-4xl font-bold text-[#8ea8ff] mb-1">
            {formatNumber(metrics.financialSummary.roi)}%
          </div>
          <div className="text-xs text-[#8ea8ff]/80">
            {metrics.financialSummary.roi > 0 ? 'Positive ROI' : 'Calculating...'}
          </div>
        </div>

        <div className="glass-card rounded-3xl border border-amber-500/40 bg-amber-500/10 px-6 py-6">
          <div className="text-xs uppercase tracking-[0.25em] text-amber-300 mb-2">Verified Deliveries</div>
          <div className="text-4xl font-bold text-amber-200 mb-1">
            {formatNumber(metrics.fraudPrevention.verifiedDeliveries)}
          </div>
          <div className="text-xs text-amber-300/80">
            {formatNumber(metrics.fraudPrevention.verificationRate)}% verification rate
          </div>
        </div>
      </div>

      {/* Detailed Metrics */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Dispute Reduction */}
        <div className="glass-card rounded-3xl border border-[#2f2862] px-6 py-6">
          <h2 className="text-lg font-semibold text-white mb-4">Dispute Reduction</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-300">Total Disputes</span>
              <span className="text-sm font-semibold text-white">{metrics.disputeReduction.totalDisputes}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-300">Disputes with Proof</span>
              <span className="text-sm font-semibold text-emerald-200">{metrics.disputeReduction.disputesWithProof}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-300">Disputes without Proof</span>
              <span className="text-sm font-semibold text-rose-200">{metrics.disputeReduction.disputesWithoutProof}</span>
            </div>
            <div className="pt-3 border-t border-[#2f2862]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-emerald-200">Cost Savings</span>
                <span className="text-lg font-bold text-emerald-200">
                  {formatCurrency(metrics.disputeReduction.estimatedCostSavings)}
                </span>
              </div>
              <div className="text-xs text-slate-400">
                Based on {formatNumber(metrics.disputeReduction.avgDisputeCost)} avg cost per dispute
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-300">Time Saved</span>
              <span className="text-sm font-semibold text-white">
                {formatNumber(metrics.operationalEfficiency.timeSavedOnDisputes)} hours
              </span>
            </div>
          </div>
        </div>

        {/* Fraud Prevention */}
        <div className="glass-card rounded-3xl border border-[#2f2862] px-6 py-6">
          <h2 className="text-lg font-semibold text-white mb-4">Fraud Prevention</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-300">Total Deliveries</span>
              <span className="text-sm font-semibold text-white">{formatNumber(metrics.fraudPrevention.totalDeliveries)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-300">Verified Deliveries</span>
              <span className="text-sm font-semibold text-emerald-200">{formatNumber(metrics.fraudPrevention.verifiedDeliveries)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-300">Verification Rate</span>
              <span className="text-sm font-semibold text-emerald-200">{formatNumber(metrics.fraudPrevention.verificationRate)}%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-300">Tamper Detections</span>
              <span className="text-sm font-semibold text-amber-200">{metrics.fraudPrevention.tamperDetections}</span>
            </div>
            <div className="pt-3 border-t border-[#2f2862]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-emerald-200">Fraud Prevented</span>
                <span className="text-lg font-bold text-emerald-200">
                  {formatCurrency(metrics.fraudPrevention.estimatedFraudPrevented)}
                </span>
              </div>
              <div className="text-xs text-slate-400">
                Estimated savings from verified deliveries
              </div>
            </div>
          </div>
        </div>

        {/* Operational Efficiency */}
        <div className="glass-card rounded-3xl border border-[#2f2862] px-6 py-6">
          <h2 className="text-lg font-semibold text-white mb-4">Operational Efficiency</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-300">Avg Verification Time</span>
              <span className="text-sm font-semibold text-white">
                {formatNumber(metrics.operationalEfficiency.avgVerificationTime)}s
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-300">CS Calls Reduced</span>
              <span className="text-sm font-semibold text-emerald-200">
                {formatNumber(metrics.operationalEfficiency.customerServiceCallsReduced)}
              </span>
            </div>
            <div className="pt-3 border-t border-[#2f2862]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-emerald-200">Efficiency Savings</span>
                <span className="text-lg font-bold text-emerald-200">
                  {formatCurrency(metrics.financialSummary.operationalEfficiencySavings)}
                </span>
              </div>
              <div className="text-xs text-slate-400">
                Reduced customer service overhead
              </div>
            </div>
          </div>
        </div>

        {/* Cost Breakdown */}
        <div className="glass-card rounded-3xl border border-[#2f2862] px-6 py-6">
          <h2 className="text-lg font-semibold text-white mb-4">Cost Savings Breakdown</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-300">Dispute Reduction</span>
              <span className="text-sm font-semibold text-emerald-200">
                {formatCurrency(metrics.financialSummary.disputeCostSavings)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-300">Fraud Prevention</span>
              <span className="text-sm font-semibold text-emerald-200">
                {formatCurrency(metrics.financialSummary.fraudPreventionSavings)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-300">Operational Efficiency</span>
              <span className="text-sm font-semibold text-emerald-200">
                {formatCurrency(metrics.financialSummary.operationalEfficiencySavings)}
              </span>
            </div>
            <div className="pt-3 border-t border-[#2f2862]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-white">Total Savings</span>
                <span className="text-lg font-bold text-emerald-200">
                  {formatCurrency(metrics.financialSummary.totalCostSavings)}
                </span>
              </div>
              <div className="text-xs text-slate-400">
                Period: {new Date(metrics.period.startDate).toLocaleDateString()} - {new Date(metrics.period.endDate).toLocaleDateString()}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

