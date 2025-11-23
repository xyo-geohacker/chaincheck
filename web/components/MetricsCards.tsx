'use client';

import { DeliveryStatus } from '@shared/types/delivery.types';

type Metric = {
  label: string;
  value: number;
  description?: string;
  statusFilter?: DeliveryStatus | 'all';
};

type Props = {
  metrics: Metric[];
  onMetricClick: (statusFilter: DeliveryStatus | 'all') => void;
};

export function MetricsCards({ metrics, onMetricClick }: Props) {
  return (
    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {metrics.map((metric) => (
        <button
          key={metric.label}
          onClick={() => onMetricClick(metric.statusFilter || 'all')}
          className="glass-card rounded-2xl border border-[#2e2458] px-6 py-8 text-left transition hover:border-[#705cf6] hover:shadow-lg hover:shadow-[#705cf6]/20 cursor-pointer"
          type="button"
        >
          <p className="text-xs uppercase tracking-[0.25em] text-[#8ea8ff]">{metric.label}</p>
          <p className="mt-4 text-4xl font-semibold text-white">{metric.value}</p>
          {metric.description && (
            <p className="mt-2 text-xs text-slate-400">{metric.description}</p>
          )}
        </button>
      ))}
    </section>
  );
}

