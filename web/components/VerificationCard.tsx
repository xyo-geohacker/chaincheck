'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { fetchActualBlockNumber } from '@lib/api';

type VerificationStatus = 'success' | 'pending' | 'error';

type Props = {
  isValid: boolean;
  proofHash: string;
  blockNumber?: number | null;
  timestamp?: string | Date | null;
  archivistStatus?: VerificationStatus;
  boundWitnessData?: {
    isXL1?: boolean;
    xl1TransactionHash?: string;
    isMocked?: boolean;
  } | null;
  xl1Nbf?: number | null;
  xl1Exp?: number | null;
  xl1ActualBlockNumber?: number | null;
};

export function VerificationCard({
  isValid,
  proofHash,
  blockNumber,
  timestamp,
  archivistStatus,
  boundWitnessData,
  xl1Nbf,
  xl1Exp,
  xl1ActualBlockNumber: initialActualBlockNumber
}: Props) {
  const [actualBlockNumber, setActualBlockNumber] = useState<number | null>(initialActualBlockNumber ?? null);
  const [isCheckingBlock, setIsCheckingBlock] = useState(false);
  const [blockCheckError, setBlockCheckError] = useState<string | null>(null);

  // Check for actual block number on mount if we don't have one yet and this is an XL1 transaction
  useEffect(() => {
    // Only check if:
    // 1. This is an XL1 transaction
    // 2. We don't already have an actual block number
    // 3. We have a valid proof hash
    if (
      boundWitnessData?.isXL1 &&
      actualBlockNumber === null &&
      initialActualBlockNumber === null &&
      proofHash &&
      !isCheckingBlock
    ) {
      // Check for actual block number on page load
      handleCheckActualBlock();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount

  const handleCheckActualBlock = async () => {
    if (isCheckingBlock) return;
    
    setIsCheckingBlock(true);
    setBlockCheckError(null);
    
    try {
      const result = await fetchActualBlockNumber(proofHash);
      if (result.actualBlockNumber !== null) {
        setActualBlockNumber(result.actualBlockNumber);
      } else {
        setBlockCheckError('Transaction not yet committed to a block');
      }
    } catch (error) {
      setBlockCheckError(error instanceof Error ? error.message : 'Failed to check block number');
    } finally {
      setIsCheckingBlock(false);
    }
  };
  // Determine status: only show success if verification actually succeeded
  // Check if boundWitnessData indicates successful verification (not mocked or explicitly successful)
  const hasValidVerification = isValid && (
    archivistStatus === 'success' || 
    boundWitnessData?.isMocked === true
  );
  
  const status: VerificationStatus = archivistStatus ?? (hasValidVerification ? 'success' : 'pending');

  const statusConfig: Record<
    VerificationStatus,
    { label: string; className: string }
  > = {
    success: {
      label: 'Verified',
      className: 'border border-emerald-400/60 bg-emerald-400/20 text-emerald-200'
    },
    pending: {
      label: 'Verification required',
      className: 'border border-amber-300/60 bg-amber-300/20 text-amber-100'
    },
    error: {
      label: 'Verification failed',
      className: 'border border-rose-400/60 bg-rose-400/20 text-rose-200'
    }
  };

  const { label, className } = statusConfig[status];

  // Build explorer URL - only show if we have a valid XL1 transaction
  // Don't show link if verification failed (no valid transaction hash)
  const isXL1 = boundWitnessData?.isXL1 ?? false;
  const hasValidTransaction = hasValidVerification && (boundWitnessData?.xl1TransactionHash || proofHash);
  const xl1TransactionHash = boundWitnessData?.xl1TransactionHash ?? proofHash;
  const explorerUrl = isXL1 && hasValidTransaction
    ? `https://explore.xyo.network/xl1/sequence/transaction/${xl1TransactionHash}`
    : hasValidTransaction
      ? `https://explore.xyo.network/bound-witness/${proofHash}`
      : null;

  return (
    <div className="glass-card grid gap-6 rounded-3xl border border-[#2f2862] px-6 py-7 text-slate-100">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-[0.3em] text-[#8ea8ff]">XL1 Proof Hash</p>
          <p className="font-mono text-sm text-white break-all">
            {(() => {
              // Validate that proofHash is a valid hex string (not a JSON object)
              // If it looks like JSON or is invalid, show an error message
              if (!proofHash || typeof proofHash !== 'string') {
                return <span className="text-rose-400">Invalid proof hash</span>;
              }
              
              // Check if it looks like JSON (starts with { or [)
              if (proofHash.trim().startsWith('{') || proofHash.trim().startsWith('[')) {
                return (
                  <span className="text-amber-400" title="This appears to be invalid data. Please check the diagnostic endpoint.">
                    Invalid format (JSON detected) - Check diagnostic info
                  </span>
                );
              }
              
              // Check if it's a valid hex string (64 characters for SHA256)
              const hexPattern = /^[0-9a-fA-F]+$/;
              if (!hexPattern.test(proofHash) || proofHash.length < 32) {
                return (
                  <span className="text-amber-400" title="This hash format appears invalid">
                    {proofHash.substring(0, 64)}...
                  </span>
                );
              }
              
              return proofHash;
            })()}
          </p>
        </div>
        {status === 'success' ? (
          <Link
            href={`/verify/${proofHash}/network`}
            className={`rounded-full px-4 py-1 text-xs font-semibold uppercase tracking-wide ${className} transition hover:opacity-80 cursor-pointer inline-block`}
          >
            {label}
          </Link>
        ) : (
          <span className={`rounded-full px-4 py-1 text-xs font-semibold uppercase tracking-wide ${className}`}>
            {label}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-[#8ea8ff]">Timestamp</p>
          <p className="mt-1 text-sm font-semibold text-white">
            {timestamp ? new Date(timestamp).toLocaleString() : 'Awaiting verification'}
          </p>
        </div>
        {/* XL1 Block section - only show for XL1 transactions, otherwise show regular block */}
        {boundWitnessData?.isXL1 ? (
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-[#8ea8ff]">XL1 Block</p>
            <div className="mt-1">
              {actualBlockNumber !== null ? (
                <a
                  href={`https://explore.xyo.network/xl1/sequence/block/number/${actualBlockNumber}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-semibold text-[#7aa7ff] transition hover:text-[#9b7bff]"
                >
                  {actualBlockNumber} →
                </a>
              ) : (
                <div className="flex flex-col gap-1">
                  <button
                    onClick={handleCheckActualBlock}
                    disabled={isCheckingBlock}
                    className="text-sm font-semibold text-[#7aa7ff] transition hover:text-[#9b7bff] disabled:opacity-50 disabled:cursor-not-allowed text-left"
                    title="Check if transaction has been committed to a block"
                  >
                    {isCheckingBlock ? 'Checking...' : 'Check Block →'}
                  </button>
                  {blockCheckError && (
                    <p className="text-xs text-amber-400">{blockCheckError}</p>
                  )}
                  {!isCheckingBlock && !blockCheckError && (
                    <p className="text-xs text-slate-400">Block not yet available</p>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-[#8ea8ff]">Block</p>
            <p className="mt-1 text-sm font-semibold text-white">
              {blockNumber ?? 'Pending'}
            </p>
          </div>
        )}
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-[#8ea8ff]">XYO/XL1 Explorer</p>
          {explorerUrl ? (
            <a
              href={explorerUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-block text-sm font-semibold text-[#7aa7ff] transition hover:text-[#9b7bff]"
            >
              {isXL1 ? 'View XL1 Transaction →' : 'View on Explorer →'}
            </a>
          ) : (
            <p className="mt-1 text-sm font-semibold text-slate-400">
              {status === 'success' ? 'N/A' : 'Verification required'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

