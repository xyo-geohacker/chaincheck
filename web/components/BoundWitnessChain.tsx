'use client';

import { useEffect, useState } from 'react';

import { fetchBoundWitnessChain } from '@lib/api';

type Props = {
  proofHash: string;
  maxDepth?: number;
  isMocked?: boolean;
  xl1TransactionHash?: string;
  isXL1?: boolean;
};

type ChainItem = {
  hash: string;
  previousHash: string | null;
  timestamp?: number;
  addresses?: string[];
  payloadHashes?: string[];
};

export function BoundWitnessChain({ proofHash, maxDepth = 5, isMocked, xl1TransactionHash, isXL1 }: Props) {
  const [chain, setChain] = useState<ChainItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadChain() {
      try {
        setLoading(true);
        setError(null);
        const result = await fetchBoundWitnessChain(proofHash, maxDepth);
        
        // Transform chain data into display format
        const chainItems: ChainItem[] = result.chain.map((bw: unknown) => {
          const boundWitness = bw as Record<string, unknown>;
          return {
            hash: (boundWitness._hash || boundWitness.hash || '') as string,
            previousHash: Array.isArray(boundWitness.previous_hashes) && boundWitness.previous_hashes.length > 0
              ? (boundWitness.previous_hashes[0] as string | null)
              : null,
            timestamp: boundWitness.timestamp as number | undefined,
            addresses: boundWitness.addresses as string[] | undefined,
            payloadHashes: boundWitness.payload_hashes as string[] | undefined
          };
        });
        
        setChain(chainItems);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load bound witness chain');
      } finally {
        setLoading(false);
      }
    }

    if (proofHash) {
      loadChain();
    }
  }, [proofHash, maxDepth]);

  // Determine if data is mocked: only if we explicitly know it's mocked AND we have no real data
  // If we successfully fetched data from Archivist (chain has items), it's real data even if isMocked prop is true
  const isMockedData = (isMocked === true && chain.length === 0) || (chain.length === 0 && error !== null);

  if (loading) {
    return (
      <div className="glass-card rounded-3xl border border-[#2f2862] px-6 py-6 text-slate-100">
        <div className="flex items-center justify-between gap-4 mb-4">
          <h2 className="text-lg font-semibold text-white">XYO Proof Chain</h2>
          {isMocked === true && (
            <span className="rounded-full bg-amber-500/20 border border-amber-500/40 px-3 py-1 text-xs font-semibold text-amber-200 flex-shrink-0" title="Mock data for development">
              🧪 Mock
            </span>
          )}
        </div>
        <div className="mt-4 text-sm text-slate-400">Loading chain...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-card rounded-3xl border border-[#2f2862] px-6 py-6 text-slate-100">
        <div className="flex items-center justify-between gap-4 mb-4">
          <h2 className="text-lg font-semibold text-white">XYO Proof Chain</h2>
          <span className="rounded-full bg-amber-500/20 border border-amber-500/40 px-3 py-1 text-xs font-semibold text-amber-200 flex-shrink-0" title="Mock data for development">
            🧪 Mock
          </span>
        </div>
        <div className="mt-4 text-sm text-rose-400">Error: {error}</div>
      </div>
    );
  }

  if (chain.length === 0) {
    return (
      <div className="glass-card rounded-3xl border border-[#2f2862] px-6 py-6 text-slate-100">
        <div className="flex items-center justify-between gap-4 mb-4">
          <h2 className="text-lg font-semibold text-white">XYO Proof Chain</h2>
          <span className="rounded-full bg-amber-500/20 border border-amber-500/40 px-3 py-1 text-xs font-semibold text-amber-200 flex-shrink-0" title="Mock data for development">
            🧪 Mock
          </span>
        </div>
        <div className="mt-4 text-sm text-slate-400">No chain data available</div>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-3xl border border-[#2f2862] px-6 py-6 text-slate-100">
      <div className="flex items-center justify-between gap-4 mb-6">
        <h2 className="text-lg font-semibold text-white">XYO Proof Chain</h2>
        <div className="flex items-center gap-2 flex-shrink-0">
          {isMockedData && (
            <span className="rounded-full bg-amber-500/20 border border-amber-500/40 px-3 py-1 text-xs font-semibold text-amber-200" title="Mock data for development">
              🧪 Mock
            </span>
          )}
          <span className="text-xs text-slate-400">Depth: {chain.length}</span>
        </div>
      </div>

      <div className="space-y-3 max-h-[600px] overflow-y-auto">
        {chain.map((item, index) => {
          const isFirst = index === 0;
          const isLast = index === chain.length - 1;
          const hasPrevious = item.previousHash !== null && item.previousHash !== '' && !/^0+$/.test(item.previousHash);

          return (
            <div key={item.hash || index} className="relative">
              {/* Chain connector line */}
              {!isLast && (
                <div className="absolute left-[11px] top-6 bottom-0 w-px bg-gradient-to-b from-[#7a5bff] to-[#3fb4ff]" />
              )}

              {/* Chain item */}
              <div className="relative flex items-start gap-3">
                {/* Chain node */}
                <div className="relative z-10 flex-shrink-0">
                  <div className={`h-5 w-5 rounded-full ${
                    isFirst 
                      ? 'bg-gradient-to-br from-[#7a5bff] to-[#3fb4ff] ring-2 ring-[#7a5bff]/50' 
                      : 'bg-[#2f2862] border-2 border-[#7a5bff]'
                  }`} />
                </div>

                {/* Chain content */}
                <div className="flex-1 min-w-0 pt-0.5">
                  <div className="rounded-lg border border-[#2f2862] bg-[#0a0815] p-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-semibold text-[#8ea8ff] uppercase tracking-wide">
                        {isFirst ? 'Current Proof' : `Link ${index + 1}`}
                      </span>
                      {item.timestamp && (
                        <span className="text-xs text-slate-500">
                          {new Date(item.timestamp).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    
                    <div className="space-y-1.5">
                      <div>
                        <span className="text-xs text-slate-500">XL1 Proof Hash:</span>
                        <div className="mt-0.5 font-mono text-xs text-slate-300 break-all line-clamp-2">
                          {item.hash || 'N/A'}
                        </div>
                      </div>

                      {hasPrevious && (
                        <div>
                          <span className="text-xs text-slate-500">Previous:</span>
                          <div className="mt-0.5 font-mono text-xs text-slate-400 break-all line-clamp-1">
                            {item.previousHash?.substring(0, 16)}...
                          </div>
                        </div>
                      )}

                      {!hasPrevious && !isLast && (
                        <div className="text-xs text-slate-500 italic">Chain origin</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {chain.length >= maxDepth && (
        <div className="mt-4 text-xs text-slate-500 text-center">
          Maximum depth reached ({maxDepth} links)
        </div>
      )}

      {/* XL1 Transaction Link */}
      {isXL1 && (
        <div className="mt-6 pt-6 border-t border-[#2f2862] flex justify-center">
          <a
            href={`https://explore.xyo.network/xl1/sequence/transaction/${xl1TransactionHash ?? proofHash}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center text-sm font-semibold text-[#7aa7ff] transition hover:text-[#9b7bff]"
          >
            View XL1 Transaction →
          </a>
        </div>
      )}
    </div>
  );
}

