'use client';

import { useState, useCallback } from 'react';
import type { DeliveryRecord } from '@shared/types/delivery.types';
import { DeliveryStatus } from '@shared/types/delivery.types';
import { fetchDeliveries } from '@lib/api';
import { DeliveryTable } from './DeliveryTable';
import { MetricsCards } from './MetricsCards';

type Props = {
  deliveries: DeliveryRecord[];
  metrics: Array<{
    label: string;
    value: number;
    description?: string;
    statusFilter?: DeliveryStatus | 'all';
  }>;
};

function calculateMetrics(deliveries: DeliveryRecord[]): Array<{
  label: string;
  value: number;
  description?: string;
  statusFilter?: DeliveryStatus | 'all';
}> {
  const totalDeliveries = deliveries.length;
  const verifiedProofs = deliveries.filter((d) => d.status === DeliveryStatus.DELIVERED).length;
  const inTransit = deliveries.filter((d) => d.status === DeliveryStatus.IN_TRANSIT).length;
  const pending = deliveries.filter((d) => d.status === DeliveryStatus.PENDING).length;
  const failed = deliveries.filter((d) => d.status === DeliveryStatus.FAILED).length;
  const disputed = deliveries.filter((d) => d.status === DeliveryStatus.DISPUTED).length;

  const verificationRate =
    totalDeliveries > 0 ? ((verifiedProofs / totalDeliveries) * 100).toFixed(1) : '0.0';

  return [
    {
      label: 'Total Deliveries',
      value: totalDeliveries,
      description: 'All time',
      statusFilter: 'all' as const
    },
    {
      label: 'Verified Proofs',
      value: verifiedProofs,
      description: `${verificationRate}% verification rate`,
      statusFilter: DeliveryStatus.DELIVERED
    },
    {
      label: 'In Transit',
      value: inTransit,
      description: 'Active deliveries',
      statusFilter: DeliveryStatus.IN_TRANSIT
    },
    {
      label: 'Pending',
      value: pending,
      description: 'Awaiting pickup',
      statusFilter: DeliveryStatus.PENDING
    },
    {
      label: 'Failed',
      value: failed,
      description: 'Delivery attempts',
      statusFilter: DeliveryStatus.FAILED
    },
    {
      label: 'Disputes',
      value: disputed,
      description: 'Requires attention',
      statusFilter: DeliveryStatus.DISPUTED
    }
  ];
}

export function DashboardContent({ deliveries: initialDeliveries, metrics: initialMetrics }: Props) {
  const [deliveries, setDeliveries] = useState<DeliveryRecord[]>(initialDeliveries);
  const [metrics, setMetrics] = useState(initialMetrics);
  const [statusFilter, setStatusFilter] = useState<DeliveryStatus | 'all'>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const refreshedDeliveries = await fetchDeliveries();
      setDeliveries(refreshedDeliveries);
      const refreshedMetrics = calculateMetrics(refreshedDeliveries);
      setMetrics(refreshedMetrics);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to refresh deliveries:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  return (
    <>
      <MetricsCards metrics={metrics} onMetricClick={setStatusFilter} />
      <section className="glass-card overflow-hidden rounded-3xl border border-[#2e2458]">
        <div className="border-b border-[#2e2458] px-6 py-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold text-white">All Deliveries</h2>
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="rounded-lg bg-[#1b1631] px-3 py-1.5 text-xs font-semibold text-[#9b7bff] border border-[#3b2e6f] hover:bg-[#241d3d] hover:border-[#4b3e8f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                title="Refresh deliveries"
              >
                <svg
                  className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                {isRefreshing ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>
            <span className="rounded-full bg-[#1b1631] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[#9b7bff] border border-[#3b2e6f]">
              {deliveries.length} records
            </span>
          </div>
        </div>
        <DeliveryTable deliveries={deliveries} initialStatusFilter={statusFilter} />
      </section>
    </>
  );
}

