'use client';

import { useEffect, useState } from 'react';
import { fetchNetworkStatistics, type NetworkStatistics } from '@lib/api';

export function NetworkStatsPanel() {
  const [stats, setStats] = useState<NetworkStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadStats() {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchNetworkStatistics();
        setStats(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load network statistics');
      } finally {
        setLoading(false);
      }
    }

    loadStats();
  }, []);

  if (loading) {
    return (
      <div className="glass-card rounded-3xl border border-[#2f2862] px-8 py-8 text-slate-100">
        <h2 className="text-lg font-semibold text-white">Network Statistics</h2>
        <div className="mt-4 text-sm text-slate-400">Loading...</div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="glass-card rounded-3xl border border-[#2f2862] px-8 py-8 text-slate-100">
        <h2 className="text-lg font-semibold text-white">Network Statistics</h2>
        <div className="mt-4 rounded-lg border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200">
          <p>{error || 'Failed to load network statistics'}</p>
        </div>
      </div>
    );
  }

  const healthColor = 
    stats.networkHealth === 'excellent' ? 'emerald' :
    stats.networkHealth === 'good' ? 'emerald' :
    stats.networkHealth === 'fair' ? 'amber' :
    'rose';

  const healthTextColor = 
    healthColor === 'emerald' ? 'text-emerald-200' :
    healthColor === 'amber' ? 'text-amber-200' :
    'text-rose-200';

  const healthBgColor = 
    healthColor === 'emerald' ? 'bg-emerald-500/20 border-emerald-500/40' :
    healthColor === 'amber' ? 'bg-amber-500/20 border-amber-500/40' :
    'bg-rose-500/20 border-rose-500/40';

  return (
    <div className="glass-card rounded-3xl border border-[#2f2862] px-8 py-8 text-slate-100">
      <div className="flex items-center justify-between gap-4 mb-6">
        <h2 className="text-lg font-semibold text-white">Network Statistics</h2>
        <div className="flex items-center gap-2 flex-shrink-0">
          {stats.isMocked && (
            <span className="rounded-full bg-amber-500/20 border border-amber-500/40 px-3 py-1 text-xs font-semibold text-amber-200" title="Mock data for development">
              🧪 Mock
            </span>
          )}
          <span className={`rounded-full ${healthBgColor} border px-3 py-1 text-xs font-semibold ${healthTextColor}`}>
            {stats.networkHealth.charAt(0).toUpperCase() + stats.networkHealth.slice(1)}
          </span>
        </div>
      </div>
      
      {/* Show note about data sources */}
      {!stats.isMocked && (
        <div className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-200">
          <div className="font-semibold mb-1">ℹ️ Data Source</div>
          <div>Node counts, delivery statistics, and coverage area are extracted from XL1 blockchain transactions and delivery records.</div>
          {stats.deliveries && stats.deliveries.total > 0 && (
            <div className="mt-1">Coverage calculated from actual delivery locations.</div>
          )}
        </div>
      )}

      <div className="space-y-6">
        {/* Node Counts */}
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-lg border border-[#2f2862] bg-white/5 p-4">
            <div className="text-sm text-slate-400">Total Nodes</div>
            <div className="mt-1 text-2xl font-bold text-white">{stats.totalNodes.toLocaleString()}</div>
          </div>
          <div className="rounded-lg border border-[#2f2862] bg-white/5 p-4">
            <div className="text-sm text-slate-400">Active Nodes</div>
            <div className="mt-1 text-2xl font-bold text-emerald-200">{stats.activeNodes.toLocaleString()}</div>
          </div>
        </div>

        {/* Node Types */}
        <div>
          <h3 className="text-sm font-semibold text-slate-300 mb-3">Node Types</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between rounded-lg border border-[#2f2862] bg-white/5 px-4 py-2">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-blue-400"></div>
                <span className="text-sm text-slate-300">Sentinels</span>
              </div>
              <span className="text-sm font-semibold text-white">{stats.nodeTypes.sentinel.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-[#2f2862] bg-white/5 px-4 py-2">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-purple-400"></div>
                <span className="text-sm text-slate-300">Bridges</span>
              </div>
              <span className="text-sm font-semibold text-white">{stats.nodeTypes.bridge.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-[#2f2862] bg-white/5 px-4 py-2">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-cyan-400"></div>
                <span className="text-sm text-slate-300">Diviners</span>
              </div>
              <span className="text-sm font-semibold text-white">{stats.nodeTypes.diviner.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Delivery Statistics */}
        {stats.deliveries && (
          <div>
            <h3 className="text-sm font-semibold text-slate-300 mb-3">Delivery Activity</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg border border-[#2f2862] bg-white/5 p-4">
                <div className="text-xs text-slate-400">Total Deliveries</div>
                <div className="mt-1 text-lg font-semibold text-white">{stats.deliveries.total.toLocaleString()}</div>
              </div>
              <div className="rounded-lg border border-[#2f2862] bg-white/5 p-4">
                <div className="text-xs text-slate-400">Verified</div>
                <div className="mt-1 text-lg font-semibold text-emerald-200">{stats.deliveries.verified.toLocaleString()}</div>
              </div>
              <div className="rounded-lg border border-[#2f2862] bg-white/5 p-4">
                <div className="text-xs text-slate-400">Active Drivers</div>
                <div className="mt-1 text-lg font-semibold text-white">{stats.deliveries.uniqueDrivers.toLocaleString()}</div>
              </div>
              <div className="rounded-lg border border-[#2f2862] bg-white/5 p-4">
                <div className="text-xs text-slate-400">Locations</div>
                <div className="mt-1 text-lg font-semibold text-white">{stats.deliveries.uniqueLocations.toLocaleString()}</div>
              </div>
            </div>
          </div>
        )}

        {/* Coverage Area */}
        <div>
          <h3 className="text-sm font-semibold text-slate-300 mb-3">Coverage</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg border border-[#2f2862] bg-white/5 p-4">
              <div className="text-xs text-slate-400">Service Area</div>
              <div className="mt-1 text-lg font-semibold text-white">
                {stats.coverageArea.totalKm2 >= 1_000_000 
                  ? `${(stats.coverageArea.totalKm2 / 1_000_000).toFixed(1)}M km²`
                  : stats.coverageArea.totalKm2 >= 1_000
                  ? `${(stats.coverageArea.totalKm2 / 1_000).toFixed(1)}K km²`
                  : `${stats.coverageArea.totalKm2.toLocaleString()} km²`}
              </div>
              {stats.deliveries && stats.deliveries.uniqueLocations === 1 && (
                <div className="text-xs text-slate-500 mt-1">(estimated from single location)</div>
              )}
            </div>
            <div className="rounded-lg border border-[#2f2862] bg-white/5 p-4">
              <div className="text-xs text-slate-400">Countries</div>
              <div className="mt-1 text-lg font-semibold text-white">{stats.coverageArea.countries}</div>
            </div>
          </div>
        </div>

        {/* Last Updated */}
        <div className="text-xs text-slate-400">
          Last updated: {new Date(stats.lastUpdated).toLocaleString()}
        </div>
      </div>
    </div>
  );
}

