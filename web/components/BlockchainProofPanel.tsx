'use client';

import { useState } from 'react';

import { fetchProofDetails, validateBoundWitness } from '@lib/api';
import type { ProofVerificationResult } from '@shared/types/xyo.types';

type Props = {
  proofHash: string;
  proofDataForDisplay: unknown;
  orderId: string;
  boundWitnessData?: {
    isXL1?: boolean;
    xl1TransactionHash?: string;
    isMocked?: boolean;
  } | null;
};

type ValidationResult = {
  isValid: boolean;
  errors: string[];
};

export function BlockchainProofPanel({ proofHash, proofDataForDisplay, orderId, boundWitnessData: boundWitnessDataProp }: Props) {
  // Determine if this is an XL1 transaction and which network (Sequence or Mainnet)
  const isXL1 = boundWitnessDataProp?.isXL1 ?? false;
  const isMocked = boundWitnessDataProp?.isMocked ?? false;
  const xl1TransactionHash = boundWitnessDataProp?.xl1TransactionHash ?? proofHash;
  
  // Build explorer URL based on transaction type
  // For XL1: Use Sequence testnet URL (can be enhanced to detect mainnet vs testnet)
  // For bound witness: Use legacy bound witness explorer URL
  const explorerUrl = isXL1
    ? `https://explore.xyo.network/xl1/sequence/transaction/${xl1TransactionHash}`
    : `https://explore.xyo.network/bound-witness/${proofHash}`;
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [boundWitnessData, setBoundWitnessData] = useState<ProofVerificationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [isValidationModalOpen, setIsValidationModalOpen] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleGetBoundWitness = async () => {
    setIsLoading(true);
    setError(null);
    setIsModalOpen(true);

    try {
      const data = await fetchProofDetails(proofHash);
      setBoundWitnessData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch bound witness');
      setBoundWitnessData(null);
    } finally {
      setIsLoading(false);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setBoundWitnessData(null);
    setError(null);
  };

  const handleValidateBoundWitness = async () => {
    setIsValidating(true);
    setValidationError(null);
    setIsValidationModalOpen(true);

    try {
      const result = await validateBoundWitness(proofHash);
      setValidationResult(result);
    } catch (err) {
      setValidationError(err instanceof Error ? err.message : 'Failed to validate bound witness');
      setValidationResult(null);
    } finally {
      setIsValidating(false);
    }
  };

  const closeValidationModal = () => {
    setIsValidationModalOpen(false);
    setValidationResult(null);
    setValidationError(null);
  };

  // Render bound witness data if available
  const boundWitnessDisplay = proofDataForDisplay && typeof proofDataForDisplay === 'object' ? (
    <div>
      <h3 className="text-xs uppercase tracking-[0.25em] text-[#8ea8ff] mb-2">Bound Witness Data</h3>
      <pre className="max-h-72 overflow-auto rounded-2xl border border-[#2f2862] bg-[#07060e] p-4 text-xs text-[#8fa5ff]">
        {String(JSON.stringify(proofDataForDisplay, null, 2))}
      </pre>
    </div>
  ) : null;

  return (
    <>
      <div className="glass-card rounded-3xl border border-[#2f2862] px-8 py-8 text-slate-100">
        <div className="flex items-center justify-between gap-4 mb-4">
          <h2 className="text-lg font-semibold text-white">Blockchain Proof</h2>
          {isMocked && (
            <span className="rounded-full bg-amber-500/20 border border-amber-500/40 px-3 py-1 text-xs font-semibold text-amber-200" title="Mock transaction for development">
              🧪 Mock
            </span>
          )}
        </div>
        <div className="mt-4 space-y-4">
          {/* Show bound witness data if available */}
          {boundWitnessDisplay}
          
          {/* Show payload hashes if available in bound witness */}
          {proofDataForDisplay && typeof proofDataForDisplay === 'object' && 'tuple' in proofDataForDisplay && Array.isArray((proofDataForDisplay as any).tuple) && (proofDataForDisplay as any).tuple.length > 0 ? (
            <div>
              <h3 className="text-xs uppercase tracking-[0.25em] text-[#8ea8ff] mb-2">Payload Hashes</h3>
              <div className="rounded-lg border border-[#2f2862] bg-[#0a0815] p-4">
                {(() => {
                  const tuple = (proofDataForDisplay as any).tuple[0];
                  const boundWitness = tuple?.boundWitness;
                  if (boundWitness && typeof boundWitness === 'object') {
                    const payloadHashes = (boundWitness as any).payload_hashes || [];
                    const payloadSchemas = (boundWitness as any).payload_schemas || [];
                    return (
                      <div className="space-y-2 text-xs">
                        {payloadHashes.map((hash: string, index: number) => (
                          <div key={index} className="flex items-start gap-2">
                            <span className="text-slate-400 min-w-[80px]">
                              {payloadSchemas[index] || 'unknown'}:
                            </span>
                            <span className="font-mono text-[#8fa5ff] break-all">{hash}</span>
                          </div>
                        ))}
                        {payloadHashes.length === 0 && (
                          <div className="text-slate-400">No payload hashes found</div>
                        )}
                      </div>
                    );
                  }
                  return <div className="text-slate-400 text-xs">No bound witness data available</div>;
                })()}
              </div>
            </div>
          ) : null}
        </div>
        <div className="mt-4 flex flex-col items-center gap-3">
          <a
            href={explorerUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center text-sm font-semibold text-[#7aa7ff] transition hover:text-[#9b7bff]"
          >
            View on XYO Explorer {isXL1 ? '(XL1)' : '(Bound Witness)'} →
          </a>
          <a
            href={`http://localhost:4000/api/deliveries/by-order/${orderId}/diagnostic`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center text-sm font-semibold text-[#7aa7ff] transition hover:text-[#9b7bff]"
          >
            Diagnostic Info →
          </a>
          {/* Temporarily commented out for development - mocking transaction hash */}
          {/* <button
            onClick={handleValidateBoundWitness}
            disabled={isValidating}
            className="w-fit rounded-full border border-[#7aa7ff]/60 bg-[#7aa7ff]/20 px-4 py-1 text-xs font-semibold uppercase tracking-wide text-[#7aa7ff] transition hover:bg-[#7aa7ff]/30 hover:border-[#7aa7ff]/80 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isValidating ? 'Validating...' : 'Bound Witness Valid?'}
          </button>
          <button
            onClick={handleGetBoundWitness}
            disabled={isLoading}
            className="w-fit rounded-full border border-[#7aa7ff]/60 bg-[#7aa7ff]/20 px-4 py-1 text-xs font-semibold uppercase tracking-wide text-[#7aa7ff] transition hover:bg-[#7aa7ff]/30 hover:border-[#7aa7ff]/80 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? 'Loading...' : 'Get Bound Witness (JSON)'}
          </button> */}
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={closeModal}
        >
          <div
            className="glass-card max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-3xl border border-[#2f2862] bg-[#0a0815] p-6 text-slate-100 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl font-semibold text-white">Bound Witness Data</h3>
              <button
                onClick={closeModal}
                className="rounded-lg px-3 py-1 text-sm font-medium text-[#8fa5ff] transition hover:bg-[#1b1631]"
              >
                ✕ Close
              </button>
            </div>

            <div className="overflow-auto rounded-2xl border border-[#2f2862] bg-[#07060e] p-4">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-sm text-[#8fa5ff]">Loading bound witness data...</div>
                </div>
              ) : error ? (
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
                  <p className="font-semibold">Error:</p>
                  <p className="mt-1">{error}</p>
                </div>
              ) : boundWitnessData ? (
                <pre className="text-xs text-[#8fa5ff]">
                  {JSON.stringify(boundWitnessData, null, 2)}
                </pre>
              ) : null}
            </div>

            {boundWitnessData && (
              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(JSON.stringify(boundWitnessData, null, 2));
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

      {/* Validation Modal */}
      {isValidationModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={closeValidationModal}
        >
          <div
            className="glass-card max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-3xl border border-[#2f2862] bg-[#0a0815] p-6 text-slate-100 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl font-semibold text-white">Bound Witness Validation</h3>
              <button
                onClick={closeValidationModal}
                className="rounded-lg px-3 py-1 text-sm font-medium text-[#8fa5ff] transition hover:bg-[#1b1631]"
              >
                ✕ Close
              </button>
            </div>

            <div className="space-y-4">
              {isValidating ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-sm text-[#8fa5ff]">Validating bound witness...</div>
                </div>
              ) : validationError ? (
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
                  <p className="font-semibold">Error:</p>
                  <p className="mt-1">{validationError}</p>
                </div>
              ) : validationResult ? (
                <>
                  <div
                    className={`rounded-lg border p-4 ${
                      validationResult.isValid
                        ? 'border-emerald-400/60 bg-emerald-400/20 text-emerald-200'
                        : 'border-rose-400/60 bg-rose-400/20 text-rose-200'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-semibold">
                        {validationResult.isValid ? '✓ Valid' : '✗ Invalid'}
                      </span>
                    </div>
                    {validationResult.errors.length > 0 && (
                      <div className="mt-3">
                        <p className="text-xs font-semibold uppercase tracking-wide opacity-80">
                          Validation Errors:
                        </p>
                        <ul className="mt-2 list-disc list-inside space-y-1 text-xs">
                          {validationResult.errors.map((err, index) => (
                            <li key={index}>{err}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

