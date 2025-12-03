'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { NetworkStatsPanel } from '@components/NetworkStatsPanel';
import { WitnessNodeMap } from '@components/WitnessNodeMap';
import { fetchNetworkStatistics } from '@lib/api';

export default function NetworkPage() {
  const [nodeTypeFilter, setNodeTypeFilter] = useState<'sentinel' | 'bridge' | 'diviner' | undefined>(undefined);
  const [statusFilter, setStatusFilter] = useState<'active' | 'inactive' | undefined>(undefined);
  const [isMocked, setIsMocked] = useState(true);

  useEffect(() => {
    async function loadMockStatus() {
      try {
        const stats = await fetchNetworkStatistics();
        setIsMocked(stats.isMocked ?? true);
      } catch {
        // Keep default mocked state
      }
    }
    loadMockStatus();
  }, []);

  return (
    <main className="min-h-screen p-6 lg:p-12">
      <div className="mx-auto max-w-[100rem]">
        <Link
          href="/"
          className="rounded-lg border border-[#2f2862] bg-white/5 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10 transition-colors inline-block mb-8"
        >
          ← Back to Dashboard
        </Link>

        {/* Header */}
        <div className="mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">XYO Network Overview</h1>
            <p className="text-slate-400">Explore the decentralized network infrastructure</p>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <label htmlFor="node-type-filter" className="text-sm text-slate-300">Node Type:</label>
            <select
              id="node-type-filter"
              value={nodeTypeFilter || ''}
              onChange={(e) => setNodeTypeFilter(e.target.value as 'sentinel' | 'bridge' | 'diviner' | '' || undefined)}
              className="rounded-lg border border-[#2f2862] bg-white/5 px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#6654dd]"
            >
              <option value="">All Types</option>
              <option value="sentinel">Sentinels</option>
              <option value="bridge">Bridges</option>
              <option value="diviner">Diviners</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="status-filter" className="text-sm text-slate-300">Status:</label>
            <select
              id="status-filter"
              value={statusFilter || ''}
              onChange={(e) => setStatusFilter(e.target.value as 'active' | 'inactive' | '' || undefined)}
              className="rounded-lg border border-[#2f2862] bg-white/5 px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#6654dd]"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Network Statistics */}
          <div className="lg:col-span-1">
            <NetworkStatsPanel />
          </div>

          {/* Right Column: Node Map */}
          <div className="lg:col-span-2">
            <WitnessNodeMap 
              filters={{
                type: nodeTypeFilter,
                status: statusFilter
              }}
              isMocked={isMocked}
            />
          </div>
        </div>

        {/* Info Section */}
        <div className="mt-6 glass-card rounded-3xl border border-[#2f2862] px-8 py-6 text-slate-100">
          <h3 className="text-lg font-semibold text-white mb-4">About XYO Network</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
            <div>
              <h4 className="font-semibold text-slate-200 mb-2">Sentinels</h4>
              <p className="text-slate-400">
                Devices that witness and record location data, creating the foundation of the XYO Network&apos;s location verification system.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-slate-200 mb-2">Bridges</h4>
              <p className="text-slate-400">
                Nodes that aggregate and process data from multiple Sentinels, enabling efficient data transmission across the network.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-slate-200 mb-2">Diviners</h4>
              <p className="text-slate-400">
                Specialized nodes that answer location queries by analyzing data from Sentinels and Bridges, providing consensus-based verification.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

