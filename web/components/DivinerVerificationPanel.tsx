'use client';

import { useEffect, useState } from 'react';
import type { DivinerVerificationResult } from '@shared/types/xyo.types';

type Props = {
  proofHash: string;
  latitude?: number;
  longitude?: number;
  timestamp?: number;
  divinerVerification?: DivinerVerificationResult | null; // Use stored data from boundWitnessData
};

export function DivinerVerificationPanel({ proofHash, latitude, longitude, timestamp, divinerVerification: propDivinerVerification }: Props) {
  const [divinerData, setDivinerData] = useState<DivinerVerificationResult | null>(propDivinerVerification ?? null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Update state when prop changes (e.g., when data is loaded from boundWitnessData)
  useEffect(() => {
    if (propDivinerVerification) {
      setDivinerData(propDivinerVerification);
    }
  }, [propDivinerVerification]);

  useEffect(() => {
    // Only fetch if we don't have data from props
    if (proofHash && !propDivinerVerification) {
      fetchDivinerVerification();
    }
  }, [proofHash, propDivinerVerification]);

  const fetchDivinerVerification = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Use relative URL when on HTTPS to avoid mixed content errors
      // Next.js rewrite will proxy to backend
      const apiUrl = typeof window !== 'undefined' && window.location.protocol === 'https:'
        ? '' // Relative URL - Next.js rewrite handles it
        : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000');
      const response = await fetch(`${apiUrl}/api/proofs/${proofHash}/diviner`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch Diviner verification: ${response.statusText}`);
      }

      const data = await response.json();
      // eslint-disable-next-line no-console
      console.log('Diviner verification data:', data);
      // eslint-disable-next-line no-console
      console.log('Is mocked?', data.isMocked);
      setDivinerData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load Diviner verification');
      // eslint-disable-next-line no-console
      console.error('Diviner verification error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="glass-card rounded-3xl border border-[#2f2862] px-6 py-6 text-slate-100">
        <h2 className="text-lg font-semibold text-white">XYO Network Verification</h2>
        <div className="mt-4 flex items-center justify-center py-8">
          <div className="text-sm text-[#8fa5ff]">Querying Diviner network...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-card rounded-3xl border border-[#2f2862] px-6 py-6 text-slate-100">
        <h2 className="text-lg font-semibold text-white">XYO Network Verification</h2>
        <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
          <p className="font-semibold">Unable to verify with Diviner:</p>
          <p className="mt-1">{error}</p>
        </div>
      </div>
    );
  }

  if (!divinerData) {
    return null;
  }

  const { verified, confidence, nodeCount, consensus, locationMatch, distanceFromClaimed, details, isMocked } = divinerData;
  
  // Debug: Log mock status
  // eslint-disable-next-line no-console
  console.log('Diviner panel - isMocked:', isMocked, 'type:', typeof isMocked);

  const consensusColor = 
    consensus === 'high' ? 'emerald' :
    consensus === 'medium' ? 'amber' :
    'rose';

  const confidenceColor = 
    confidence >= 90 ? 'emerald' :
    confidence >= 70 ? 'amber' :
    'rose';

  // Text color classes
  const confidenceTextClass = 
    confidenceColor === 'emerald' ? 'text-emerald-200' :
    confidenceColor === 'amber' ? 'text-amber-200' :
    'text-rose-200';

  const consensusTextClass = 
    consensusColor === 'emerald' ? 'text-emerald-200' :
    consensusColor === 'amber' ? 'text-amber-200' :
    'text-rose-200';

  // Background gradient classes
  const confidenceBgClass = 
    confidenceColor === 'emerald' ? 'from-emerald-500 to-emerald-600' :
    confidenceColor === 'amber' ? 'from-amber-500 to-amber-600' :
    'from-rose-500 to-rose-600';

  const consensusBgClass = 
    consensusColor === 'emerald' ? 'border-emerald-400/60 bg-emerald-400/20' :
    consensusColor === 'amber' ? 'border-amber-400/60 bg-amber-400/20' :
    'border-rose-400/60 bg-rose-400/20';

  return (
    <div className="glass-card rounded-3xl border border-[#2f2862] px-8 py-8 text-slate-100">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-lg font-semibold text-white flex-shrink-0 min-w-0">XYO Network Verification</h2>
        <div className="flex items-center gap-2 flex-shrink-0">
                {isMocked === true && (
                  <span className="rounded-full bg-amber-500/20 border border-amber-500/40 px-4 py-1 text-xs font-semibold text-amber-200 whitespace-nowrap" title="Mock data for development">
                    🧪 Mock
                  </span>
                )}
          {verified && (
            <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-200">
              ✓ Verified
            </span>
          )}
        </div>
      </div>

      <div className="mt-6 space-y-4">
        {/* Verification Status */}
        <div className={`rounded-lg border p-5 ${
          verified 
            ? 'border-emerald-400/60 bg-emerald-400/20' 
            : 'border-rose-400/60 bg-rose-400/20'
        }`}>
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm font-semibold text-white flex-1 min-w-0 break-words">
              {verified ? 'Location Verified by Diviner Network' : 'Location Not Verified'}
            </span>
            <span className={`text-lg font-bold flex-shrink-0 ${
              verified ? 'text-emerald-200' : 'text-rose-200'
            }`}>
              {verified ? '✓' : '✗'}
            </span>
          </div>
        </div>

        {/* Confidence Score */}
        <div className="rounded-lg border border-[#2f2862] bg-[#0a0815] p-5">
          <div className="mb-2 flex items-center justify-between gap-4">
            <span className="text-xs uppercase tracking-[0.25em] text-[#8ea8ff] flex-shrink-0">Confidence Score</span>
            <span className={`text-lg font-bold ${confidenceTextClass} flex-shrink-0`}>
              {confidence}%
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-[#1b1631]">
            <div
              className={`h-full bg-gradient-to-r ${confidenceBgClass} transition-all duration-500`}
              style={{ width: `${confidence}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-slate-400">
            Based on consensus from {nodeCount} witness node{nodeCount !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Consensus Level */}
        <div className="grid grid-cols-3 gap-3">
          <div className={`rounded-lg border p-4 text-center ${consensusBgClass}`}>
            <div className="text-xs uppercase tracking-[0.25em] text-[#8ea8ff]">Consensus</div>
            <div className={`mt-1 text-sm font-semibold ${consensusTextClass}`}>
              {consensus.toUpperCase()}
            </div>
          </div>
          <div className="rounded-lg border border-[#2f2862] bg-[#0a0815] p-4 text-center">
            <div className="text-xs uppercase tracking-[0.25em] text-[#8ea8ff]">Nodes</div>
            <div className="mt-1 text-sm font-semibold text-slate-300">{nodeCount}</div>
          </div>
          <div className={`rounded-lg border p-4 text-center ${
            locationMatch 
              ? 'border-emerald-400/60 bg-emerald-400/20' 
              : 'border-rose-400/60 bg-rose-400/20'
          }`}>
            <div className="text-xs uppercase tracking-[0.25em] text-[#8ea8ff]">Match</div>
            <div className={`mt-1 text-sm font-semibold ${
              locationMatch ? 'text-emerald-200' : 'text-rose-200'
            }`}>
              {locationMatch ? 'Yes' : 'No'}
            </div>
          </div>
        </div>

        {/* Location Accuracy */}
        {distanceFromClaimed !== undefined && (
          <div className="rounded-lg border border-[#2f2862] bg-[#0a0815] p-4">
            <div className="text-xs uppercase tracking-[0.25em] text-[#8ea8ff]">Location Accuracy</div>
            <div className="mt-1 text-sm font-semibold text-slate-300">
              ±{distanceFromClaimed.toFixed(1)} meters from claimed location
            </div>
          </div>
        )}

        {/* Witness Nodes */}
        {details?.witnessNodes && details.witnessNodes.length > 0 && (
          <div className="rounded-lg border border-[#2f2862] bg-[#0a0815] p-4">
            <div className="mb-3 text-xs uppercase tracking-[0.25em] text-[#8ea8ff]">
              Witness Nodes ({details.witnessNodes.length})
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {details.witnessNodes.map((node, index) => (
                <div key={index} className="flex items-center justify-between rounded border border-[#2f2862] bg-[#07060e] p-2">
                  <div className="flex-1">
                    <div className="text-xs font-medium text-slate-300">
                      {node.type ? node.type.charAt(0).toUpperCase() + node.type.slice(1) : 'Node'}
                    </div>
                    <div className="text-xs text-slate-500 font-mono">
                      {node.address.substring(0, 10)}...{node.address.substring(node.address.length - 8)}
                    </div>
                  </div>
                  {node.verified && (
                    <span className="ml-2 rounded bg-emerald-500/20 px-2 py-0.5 text-xs text-emerald-200">
                      ✓
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Location Data */}
        {details?.locationData && (
          <div className="rounded-lg border border-[#2f2862] bg-[#0a0815] p-4">
            <div className="text-xs uppercase tracking-[0.25em] text-[#8ea8ff]">Diviner Location Data</div>
            <div className="mt-2 space-y-1 text-sm text-slate-300">
              <div>Lat: {details.locationData.latitude.toFixed(6)}</div>
              <div>Lon: {details.locationData.longitude.toFixed(6)}</div>
              {details.locationData.accuracy && (
                <div>Accuracy: ±{details.locationData.accuracy.toFixed(1)}m</div>
              )}
              <div className="text-xs text-slate-500">
                Source: {details.locationData.source.toUpperCase()}
              </div>
            </div>
          </div>
        )}

        {/* Educational Info */}
        <div className="rounded-lg border border-[#2f2862] bg-[#0a0815] p-4">
          <div className="text-xs uppercase tracking-[0.25em] text-[#8ea8ff] mb-2">About XYO Diviner</div>
          <p className="text-xs text-slate-400 leading-relaxed">
            The XYO Diviner Network aggregates location data from multiple independent witness nodes 
            to provide decentralized location verification. This consensus-based approach enhances 
            accuracy and prevents location spoofing.
          </p>
          <a
            href="https://docs.xyo.network/"
            target="_blank"
            rel="noreferrer noopener"
            className="mt-2 inline-block text-xs text-[#7aa7ff] hover:text-[#9b7bff] transition"
          >
            Learn more about XYO Diviner →
          </a>
        </div>

        {/* Diagnostic Info Link */}
        <div className="mt-4 flex justify-center">
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center text-sm font-semibold text-[#7aa7ff] transition hover:text-[#9b7bff]"
          >
            Diagnostic Info →
          </button>
        </div>
      </div>

      {/* Diagnostic Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="glass-card max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-3xl border border-[#2f2862] bg-[#0a0815] p-6 text-slate-100 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h3 className="text-xl font-semibold text-white">Diviner Verification Data</h3>
                {isMocked === true && (
                  <span className="rounded-full bg-amber-500/20 border border-amber-500/40 px-4 py-1 text-xs font-semibold text-amber-200 whitespace-nowrap" title="Mock data for development">
                    🧪 Mock
                  </span>
                )}
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg px-3 py-1 text-sm font-medium text-[#8fa5ff] transition hover:bg-[#1b1631]"
              >
                ✕ Close
              </button>
            </div>

            <div className="overflow-auto rounded-2xl border border-[#2f2862] bg-[#07060e] p-4">
              {divinerData ? (
                <pre className="text-xs text-[#8fa5ff]">
                  {JSON.stringify(divinerData, null, 2)}
                </pre>
              ) : (
                <div className="flex items-center justify-center py-8">
                  <div className="text-sm text-[#8fa5ff]">No Diviner data available</div>
                </div>
              )}
            </div>

            {divinerData && (
              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(JSON.stringify(divinerData, null, 2));
                  }}
                  className="rounded-lg border border-[#2f2862] bg-[#1b1631] px-4 py-2 text-sm font-medium text-[#8fa5ff] transition hover:bg-[#2f2862]"
                >
                  Copy JSON
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

