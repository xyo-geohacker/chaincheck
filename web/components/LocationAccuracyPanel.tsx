'use client';

import { useEffect, useState } from 'react';

import { fetchLocationAccuracy, type LocationAccuracyResult } from '@lib/api';

type Props = {
  proofHash: string;
  latitude?: number;
  longitude?: number;
};

export function LocationAccuracyPanel({ proofHash, latitude, longitude }: Props) {
  const [accuracy, setAccuracy] = useState<LocationAccuracyResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadAccuracy() {
      try {
        setLoading(true);
        setError(null);
        const result = await fetchLocationAccuracy(proofHash);
        setAccuracy(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load location accuracy');
      } finally {
        setLoading(false);
      }
    }

    if (proofHash) {
      loadAccuracy();
    }
  }, [proofHash]);

  if (loading) {
    return (
      <div className="glass-card rounded-3xl border border-[#2f2862] px-6 py-6 text-slate-100">
        <h2 className="text-lg font-semibold text-white">XYO Location Accuracy</h2>
        <div className="mt-4 text-sm text-slate-400">Loading accuracy metrics...</div>
      </div>
    );
  }

  if (error || !accuracy) {
    return (
      <div className="glass-card rounded-3xl border border-[#2f2862] px-6 py-6 text-slate-100">
        <h2 className="text-lg font-semibold text-white">XYO Location Accuracy</h2>
        <div className="mt-4 text-sm text-rose-400">Error: {error || 'Failed to load accuracy data'}</div>
      </div>
    );
  }

  const confidenceColors = {
    high: 'bg-emerald-500/20 border-emerald-500/40 text-emerald-200',
    medium: 'bg-amber-500/20 border-amber-500/40 text-amber-200',
    low: 'bg-rose-500/20 border-rose-500/40 text-rose-200'
  };

  const confidenceLabels = {
    high: 'High Confidence',
    medium: 'Medium Confidence',
    low: 'Low Confidence'
  };

  return (
    <div className="glass-card rounded-3xl border border-[#2f2862] px-6 py-6 text-slate-100">
      <div className="flex items-center justify-between gap-4 mb-6">
        <h2 className="text-lg font-semibold text-white">XYO Location Accuracy</h2>
        <div className="flex items-center gap-2 flex-shrink-0">
          {accuracy.isMocked && (
            <span className="rounded-full bg-amber-500/20 border border-amber-500/40 px-3 py-1 text-xs font-semibold text-amber-200" title="Mock data for development">
              🧪 Mock
            </span>
          )}
          <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${confidenceColors[accuracy.confidenceLevel]}`}>
            {confidenceLabels[accuracy.confidenceLevel]}
          </span>
        </div>
      </div>

      {/* Accuracy Score Display */}
      <div className="mb-6">
        <div className="flex items-baseline gap-3 mb-2">
          <span className="text-3xl font-bold text-white">
            ±{accuracy.accuracyScore}m
          </span>
          <span className="text-sm text-slate-400">precision</span>
        </div>
        <p className="text-xs text-slate-500">
          XYO Network accuracy: ±{accuracy.xyoNetworkAccuracy}m
        </p>
      </div>

      {/* GPS vs XYO Network Comparison */}
      <div className="mb-6 rounded-lg border border-[#2f2862] bg-[#0a0815] p-4">
        <h3 className="text-xs uppercase tracking-[0.25em] text-[#8ea8ff] mb-3">Accuracy Comparison</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-300">GPS Accuracy</span>
            <span className="text-sm font-semibold text-slate-200">±{accuracy.gpsAccuracy}m</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-300">XYO Network</span>
            <span className="text-sm font-semibold text-emerald-200">±{accuracy.xyoNetworkAccuracy}m</span>
          </div>
          {accuracy.accuracyImprovement > 0 && (
            <div className="pt-2 border-t border-[#2f2862]">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-emerald-200">Improvement</span>
                <span className="text-sm font-bold text-emerald-200">+{accuracy.accuracyImprovement}%</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="rounded-lg border border-[#2f2862] bg-[#0a0815] p-3">
          <div className="text-xs uppercase tracking-[0.25em] text-[#8ea8ff] mb-1">Witness Nodes</div>
          <div className="text-lg font-semibold text-white">{accuracy.witnessNodeCount}</div>
        </div>
        <div className="rounded-lg border border-[#2f2862] bg-[#0a0815] p-3">
          <div className="text-xs uppercase tracking-[0.25em] text-[#8ea8ff] mb-1">Precision Radius</div>
          <div className="text-lg font-semibold text-white">±{accuracy.precisionRadius}m</div>
        </div>
        <div className="rounded-lg border border-[#2f2862] bg-[#0a0815] p-3">
          <div className="text-xs uppercase tracking-[0.25em] text-[#8ea8ff] mb-1">Consensus</div>
          <div className="text-lg font-semibold text-white">{accuracy.consensusAgreement.toFixed(0)}%</div>
        </div>
        <div className="rounded-lg border border-[#2f2862] bg-[#0a0815] p-3">
          <div className="text-xs uppercase tracking-[0.25em] text-[#8ea8ff] mb-1">Node Proximity</div>
          <div className="text-lg font-semibold text-white">{accuracy.nodeProximityScore.toFixed(0)}%</div>
        </div>
      </div>

      {/* Accuracy Improvement Badge */}
      {accuracy.accuracyImprovement > 0 && (
        <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-4">
          <div className="flex items-center gap-2">
            <span className="text-emerald-200 text-lg">✓</span>
            <div>
              <div className="text-sm font-semibold text-emerald-200">
                XYO Network improves accuracy by {accuracy.accuracyImprovement}%
              </div>
              <div className="text-xs text-emerald-300/80 mt-0.5">
                Multi-node verification provides better precision than GPS alone
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

