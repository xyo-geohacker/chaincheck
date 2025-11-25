'use client';

import { useState } from 'react';

import type { ArchivistSubmissionResult } from '@shared/types/xyo.types';
import { CollapsibleSection } from './CollapsibleSection';
import { calculatePayloadHash } from '../lib/payload-hash';

type Props = {
  storedPayload?: unknown; // The payload stored in our database
  xl1TransactionHash?: string | null;
  boundWitness?: unknown; // XL1 bound witness containing payload_hashes
  proofHash?: string | null; // The proof hash to fetch from Archivist
};

type TamperStatus = {
  status: 'idle' | 'checking' | 'verified' | 'tampered' | 'error';
  message: string;
  details?: {
    storedHash?: string;
    archivistHash?: string;
    archivistStoredHash?: string; // The _hash field from Archivist
    recalculatedArchivistHash?: string; // Hash recalculated from actual data
    xl1Hash?: string;
    hashMatch?: boolean;
    payloadMatch?: boolean;
    error?: string;
  };
};

export function TamperDetectionPanel({ storedPayload, xl1TransactionHash, boundWitness, proofHash }: Props) {
  const [tamperStatus, setTamperStatus] = useState<TamperStatus>({
    status: 'idle',
    message: 'Click "Check for Tampering" to verify data integrity'
  });
  const [isChecking, setIsChecking] = useState(false);

  // Extract XL1 payload hash from bound witness
  const getXL1PayloadHash = (): string | null => {
    if (!boundWitness || typeof boundWitness !== 'object') {
      return null;
    }

    const bw = boundWitness as Record<string, unknown>;
    const payloadHashes = (bw.payload_hashes as string[] | undefined) || [];
    const payloadSchemas = (bw.payload_schemas as string[] | undefined) || [];

    const chaincheckIndex = payloadSchemas.indexOf('network.xyo.chaincheck');
    if (chaincheckIndex >= 0 && chaincheckIndex < payloadHashes.length) {
      return payloadHashes[chaincheckIndex];
    }

    return null;
  };

  // Extract hash from payload
  const getPayloadHash = (payload: unknown): string | null => {
    if (!payload || typeof payload !== 'object') {
      return null;
    }

    const payloadObj = payload as Record<string, unknown>;
    return (payloadObj._hash || payloadObj._dataHash) as string | null;
  };

  // Compare two payloads (excluding metadata fields)
  // Payloads may have different structures:
  // - Stored payload: { schema, timestamp, message, data: {...} }
  // - Archivist payload: { schema, timestamp, message, data: {...}, _hash, _dataHash, _timestamp, _sequence, ... }
  const comparePayloads = (payload1: unknown, payload2: unknown): boolean => {
    if (!payload1 || !payload2) {
      return false;
    }

    // Remove metadata fields for comparison
    // Also handle nested data structures
    const cleanPayload = (payload: unknown): unknown => {
      if (!payload || typeof payload !== 'object') {
        return payload;
      }

      const obj = payload as Record<string, unknown>;
      
      // Remove all XYO metadata fields (prefixed with _)
      const cleaned: Record<string, unknown> = {};
      for (const key in obj) {
        if (!key.startsWith('_')) {
          cleaned[key] = obj[key];
        }
      }
      
      return cleaned;
    };

    const cleaned1 = cleanPayload(payload1);
    const cleaned2 = cleanPayload(payload2);

    // Use sorted keys for comparison to handle key order differences
    const normalizeForComparison = (obj: unknown): string => {
      if (typeof obj !== 'object' || obj === null) {
        return JSON.stringify(obj);
      }
      
      const sorted = Object.keys(obj as Record<string, unknown>)
        .sort()
        .reduce((acc, key) => {
          acc[key] = (obj as Record<string, unknown>)[key];
          return acc;
        }, {} as Record<string, unknown>);
      
      return JSON.stringify(sorted);
    };

    return normalizeForComparison(cleaned1) === normalizeForComparison(cleaned2);
  };

  const handleCheckTampering = async () => {
    if (!proofHash) {
      setTamperStatus({
        status: 'error',
        message: 'Cannot check for tampering: Proof hash is missing',
        details: { error: 'Proof hash is required to fetch payload from Archivist' }
      });
      return;
    }

    setIsChecking(true);
    setTamperStatus({
      status: 'checking',
      message: 'Checking for tampering...'
    });

    try {
      // Get the payload hash from XL1 bound witness
      const xl1PayloadHash = getXL1PayloadHash();
      if (!xl1PayloadHash) {
        throw new Error('Cannot check for tampering: XL1 payload hash not found in bound witness');
      }

      // Fetch payload from Archivist using the payload hash (not the proof hash)
      // The /api/payloads/:hash endpoint fetches the payload directly from Archivist
      // Use the backend API URL (not Next.js server)
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const response = await fetch(`${apiUrl}/api/payloads/${xl1PayloadHash}`);
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Payload not found in Archivist');
        }
        throw new Error(`Failed to fetch payload from Archivist: ${response.statusText}`);
      }

      const payloadResponse = await response.json();
      
      // The endpoint returns { success: boolean, data: payload }
      let archivistPayload: unknown = null;
      
      if (payloadResponse.success && payloadResponse.data) {
        const data = payloadResponse.data;
        
        // Check if it's a payload object with schema
        if (typeof data === 'object' && data !== null) {
          const payloadObj = data as Record<string, unknown>;
          if (payloadObj.schema === 'network.xyo.chaincheck') {
            archivistPayload = payloadObj;
          } else if (Array.isArray(data)) {
            // Might be an array of payloads
            archivistPayload = data.find((p: unknown) => {
              if (typeof p === 'object' && p !== null) {
                const payload = p as Record<string, unknown>;
                return payload.schema === 'network.xyo.chaincheck';
              }
              return false;
            });
          } else {
            archivistPayload = data;
          }
        }
      }

      if (!archivistPayload) {
        setTamperStatus({
          status: 'error',
          message: 'Could not retrieve payload from Archivist',
          details: { error: 'Archivist did not return payload data' }
        });
        setIsChecking(false);
        return;
      }

      // CRITICAL SECURITY: Recalculate hash from actual payload data to detect tampering
      // If someone modifies the data (e.g., location) but doesn't update the _hash field,
      // comparing stored hashes would show a false positive. By recalculating the hash
      // from the actual data, we ensure any tampering is detected.
      
      // Extract the payload structure for hashing
      // The XYO SDK hashes the full payload: { schema, timestamp, message, data: {...} }
      // We need to hash the same structure that was originally hashed
      const extractPayloadForHashing = (payload: unknown): unknown => {
        if (!payload || typeof payload !== 'object') {
          return payload;
        }
        
        const obj = payload as Record<string, unknown>;
        
        // The XYO SDK hashes the entire payload structure: { schema, timestamp, message, data }
        // Remove only metadata fields (prefixed with _), keep schema, timestamp, message, data
        const {
          _hash,
          _dataHash,
          _timestamp,
          _sequence,
          ...payloadForHashing
        } = obj;
        
        return payloadForHashing;
      };
      
      const archivistPayloadForHashing = extractPayloadForHashing(archivistPayload);
      
      // Recalculate hash from Archivist payload data (this detects tampering even if _hash field wasn't updated)
      const recalculatedArchivistHash = await calculatePayloadHash(archivistPayloadForHashing);
      const xl1Hash = getXL1PayloadHash();
      
      // Also get stored hashes for display purposes
      const storedHash = storedPayload ? getPayloadHash(storedPayload) : null;
      const archivistStoredHash = getPayloadHash(archivistPayload); // The _hash field from Archivist

      // Compare recalculated hash with XL1 hash (this is the critical check)
      // If data was tampered with, recalculated hash won't match XL1 hash
      const hashMatch = recalculatedArchivistHash && xl1Hash 
        ? recalculatedArchivistHash.toLowerCase() === xl1Hash.toLowerCase() 
        : false;
      
      // Extract the actual data field from payloads for comparison
      // Payloads are structured as { schema, timestamp, message, data: {...} }
      // We want to compare the actual data content, not the wrapper
      const extractPayloadData = (payload: unknown): unknown => {
        if (!payload || typeof payload !== 'object') {
          return payload;
        }
        
        const obj = payload as Record<string, unknown>;
        
        // If payload has a 'data' field, use that for comparison
        // Otherwise, use the entire payload (excluding metadata)
        if ('data' in obj && typeof obj.data === 'object' && obj.data !== null) {
          return obj.data;
        }
        
        return payload;
      };
      
      const storedPayloadData = storedPayload ? extractPayloadData(storedPayload) : null;
      const archivistPayloadData = extractPayloadData(archivistPayload);
      
      const payloadMatch = storedPayloadData && archivistPayloadData 
        ? comparePayloads(storedPayloadData, archivistPayloadData) 
        : false;

      // Determine tampering status
      // CRITICAL: We recalculate the hash from the actual payload data
      // This detects tampering even if the _hash field in the Archivist wasn't updated
      // If someone modifies the data (e.g., location) but doesn't update _hash, 
      // the recalculated hash won't match the XL1 hash, detecting the tampering
      if (!hashMatch) {
        // Recalculated hash doesn't match XL1 hash - data was tampered with
        setTamperStatus({
          status: 'tampered',
          message: 'Tampering Detected: XYO Archivist data does not match blockchain proof',
          details: {
            storedHash: storedHash || undefined,
            archivistStoredHash: archivistStoredHash || undefined, // The _hash field from Archivist
            recalculatedArchivistHash: recalculatedArchivistHash || undefined, // Hash recalculated from data
            xl1Hash: xl1Hash || undefined,
            hashMatch: false,
            payloadMatch: payloadMatch,
            error: 'Recalculated hash from XYO Archivist data does not match XL1 hash. Data has been tampered with.'
          }
        });
      } else {
        // Recalculated hash matches XL1 hash - data is cryptographically verified
        // Payload structure differences are non-critical if hash matches
        // (may be due to metadata fields, ordering, or nested structure differences)
        setTamperStatus({
          status: 'verified',
          message: 'Verified: XYO Archivist data matches blockchain proof. No tampering detected.',
          details: {
            storedHash: storedHash || undefined,
            archivistStoredHash: archivistStoredHash || undefined, // The _hash field from Archivist
            recalculatedArchivistHash: recalculatedArchivistHash || undefined, // Hash recalculated from data
            xl1Hash: xl1Hash || undefined,
            hashMatch: true,
            payloadMatch: payloadMatch
          }
        });
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Tamper detection error:', error);
      setTamperStatus({
        status: 'error',
        message: 'Failed to check for tampering',
        details: {
          error: error instanceof Error ? error.message : String(error)
        }
      });
    } finally {
      setIsChecking(false);
    }
  };

  const xl1Hash = getXL1PayloadHash();
  const storedHash = storedPayload ? getPayloadHash(storedPayload) : null;

  return (
    <div className="glass-card rounded-3xl border border-[#2f2862] px-6 py-6 text-slate-100">
      <h2 className="text-lg font-semibold text-white mb-4">Tamper Detection</h2>

      {/* Status Display */}
      <div className="mb-4">
        <div className={`rounded-lg border p-4 ${
          tamperStatus.status === 'verified'
            ? 'border-emerald-500/40 bg-emerald-500/10'
            : tamperStatus.status === 'tampered'
            ? 'border-rose-500/40 bg-rose-500/10'
            : tamperStatus.status === 'error'
            ? 'border-amber-500/40 bg-amber-500/10'
            : tamperStatus.status === 'checking'
            ? 'border-[#8ea8ff]/40 bg-[#8ea8ff]/10'
            : 'border-[#2f2862] bg-[#0a0815]'
        }`}>
          <div className="flex items-center justify-center gap-2 mb-2">
            {tamperStatus.status === 'verified' && (
              <span className="text-emerald-400 text-xl">✓</span>
            )}
            {tamperStatus.status === 'tampered' && (
              <span className="text-rose-400 text-xl">⚠️</span>
            )}
            {tamperStatus.status === 'error' && (
              <span className="text-amber-400 text-xl">⚠</span>
            )}
            {tamperStatus.status === 'checking' && (
              <span className="text-[#8ea8ff] text-xl animate-pulse">⟳</span>
            )}
            <p className={`font-semibold text-center ${
              tamperStatus.status === 'verified'
                ? 'text-emerald-200'
                : tamperStatus.status === 'tampered'
                ? 'text-rose-200'
                : tamperStatus.status === 'error'
                ? 'text-amber-200'
                : tamperStatus.status === 'checking'
                ? 'text-[#8ea8ff]'
                : 'text-slate-300'
            }`}>
              {tamperStatus.message}
            </p>
          </div>

          {/* Details */}
          {tamperStatus.details && (
            <div className="mt-3 space-y-2 text-xs">
              {tamperStatus.details.xl1Hash && (
                <div className="flex justify-between">
                  <span className="text-slate-400">XL1 Hash:</span>
                  <span className="font-mono text-slate-300">{tamperStatus.details.xl1Hash.substring(0, 16)}...</span>
                </div>
              )}
              {tamperStatus.details.archivistHash && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Archivist Hash:</span>
                  <span className={`font-mono ${
                    tamperStatus.details.hashMatch ? 'text-emerald-300' : 'text-rose-300'
                  }`}>
                    {tamperStatus.details.archivistHash.substring(0, 16)}...
                  </span>
                </div>
              )}
              {tamperStatus.details.storedHash && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Stored Hash:</span>
                  <span className="font-mono text-slate-300">{tamperStatus.details.storedHash.substring(0, 16)}...</span>
                </div>
              )}
              {tamperStatus.details.recalculatedArchivistHash && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Calculated Hash:</span>
                  <span className={`font-mono ${
                    tamperStatus.details.hashMatch ? 'text-emerald-300' : 'text-rose-300'
                  }`}>
                    {tamperStatus.details.recalculatedArchivistHash.substring(0, 16)}...
                  </span>
                </div>
              )}
              {tamperStatus.details.hashMatch !== undefined && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Hash Match:</span>
                  <span className={tamperStatus.details.hashMatch ? 'text-emerald-300' : 'text-rose-300'}>
                    {tamperStatus.details.hashMatch ? '✓ Yes' : '✗ No'}
                  </span>
                </div>
              )}
              {tamperStatus.details.error && (
                <div className="mt-2 p-2 rounded bg-amber-500/20 border border-amber-500/40">
                  <p className="text-amber-200 text-xs">{tamperStatus.details.error}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Check Button */}
      <button
        onClick={handleCheckTampering}
        disabled={isChecking || !proofHash}
        className={`w-full rounded-lg border px-4 py-3 font-semibold transition-all ${
          isChecking || !proofHash
            ? 'border-[#2f2862] bg-[#0a0815] text-slate-500 cursor-not-allowed'
            : 'border-[#8ea8ff]/40 bg-[#8ea8ff]/20 text-[#8ea8ff] hover:bg-[#8ea8ff]/30 hover:scale-[1.02] cursor-pointer'
        }`}
      >
        {isChecking ? 'Checking...' : 'Check for Tampering'}
      </button>

      {/* How It Works - Collapsible */}
      <CollapsibleSection title="How It Works" defaultOpen={false}>
        <div className="text-sm text-slate-300 leading-relaxed space-y-3">
          <p>
            This verification checks if the delivery data stored in the XYO Archivist has been tampered with since it was originally recorded. It compares the current data in the Archivist with the blockchain proof to ensure they match.
          </p>
          <p className="font-semibold text-slate-200 mb-2">The verification process:</p>
          <ol className="list-decimal list-inside space-y-1.5 ml-1 mb-3">
            <li>Fetches the current payload data from the XYO Archivist</li>
            <li>Recalculates the cryptographic hash from the actual payload data</li>
            <li>Compares the recalculated hash with the hash stored on the XL1 blockchain</li>
            <li>Detects any changes made after the original recording, even if the stored hash field wasn't updated</li>
          </ol>
          <p className="text-xs text-slate-400 italic">
            Note: By recalculating the hash from the actual data, this method ensures that any tampering is detected, even if someone modifies the data but forgets to update the stored hash field.
          </p>
        </div>
      </CollapsibleSection>
    </div>
  );
}

