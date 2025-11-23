'use client';

import { useEffect, useState } from 'react';

import { fetchCryptographicDetails, type CryptographicDetails } from '@lib/api';

type Props = {
  proofHash: string;
};

export function CryptographicDetails({ proofHash }: Props) {
  const [details, setDetails] = useState<CryptographicDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(true);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isExplanationModalOpen, setIsExplanationModalOpen] = useState(false);

  useEffect(() => {
    async function loadDetails() {
      try {
        setLoading(true);
        setError(null);
        const result = await fetchCryptographicDetails(proofHash);
        setDetails(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load cryptographic details');
      } finally {
        setLoading(false);
      }
    }

    if (proofHash) {
      loadDetails();
    }
  }, [proofHash]);

  const copyToClipboard = async (text: string, fieldName: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to copy to clipboard:', err);
    }
  };

  if (loading) {
    return (
      <div className="glass-card rounded-3xl border border-[#2f2862] px-6 py-6 text-slate-100">
        <h2 className="text-lg font-semibold text-white">XYO Cryptographic Details</h2>
        <div className="mt-4 text-sm text-slate-400">Loading...</div>
      </div>
    );
  }

  if (error || !details) {
    return (
      <div className="glass-card rounded-3xl border border-[#2f2862] px-6 py-6 text-slate-100">
        <h2 className="text-lg font-semibold text-white">XYO Cryptographic Details</h2>
        <div className="mt-4 text-sm text-rose-400">Error: {error || 'Failed to load details'}</div>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-3xl border border-[#2f2862] px-6 py-6 text-slate-100">
      <div className="flex items-center justify-between gap-4 mb-6">
        <h2 className="text-lg font-semibold text-white">XYO Cryptographic Details</h2>
        <div className="flex items-center gap-2 flex-shrink-0">
          {details.isMocked === true && (
            <span className="rounded-full bg-amber-500/20 border border-amber-500/40 px-3 py-1 text-xs font-semibold text-amber-200" title="Mock data for development">
              🧪 Mock
            </span>
          )}
          {details.signatureValid ? (
            <button
              onClick={() => setIsExplanationModalOpen(true)}
              className="rounded-full bg-emerald-500/20 border border-emerald-500/40 px-3 py-1 text-xs font-semibold text-emerald-200 hover:bg-emerald-500/30 transition-colors cursor-pointer"
              type="button"
              title="Click to learn what this means"
            >
              ✓ Verified
            </button>
          ) : (
            <span className="rounded-full bg-rose-500/20 border border-rose-500/40 px-3 py-1 text-xs font-semibold text-rose-200">
              ⚠ Invalid
            </span>
          )}
        </div>
      </div>

      {/* Summary Section */}
      <div className="space-y-4">
        {/* Signature Status */}
        <div className={`rounded-lg border p-4 ${
          details.signatureValid
            ? 'border-emerald-400/60 bg-emerald-400/20'
            : 'border-rose-400/60 bg-rose-400/20'
        }`}>
          <div className="flex items-center justify-between">
            {details.signatureValid ? (
              <button
                onClick={() => setIsExplanationModalOpen(true)}
                className="text-sm font-semibold text-white hover:text-emerald-200 transition-colors cursor-pointer text-left"
                type="button"
                title="Click to learn what this means"
              >
                Cryptographically Verified
              </button>
            ) : (
              <span className="text-sm font-semibold text-white">
                Cryptographic Verification Failed
              </span>
            )}
            <span className={`text-lg ${details.signatureValid ? 'text-emerald-200' : 'text-rose-200'}`}>
              {details.signatureValid ? '✓' : '✗'}
            </span>
          </div>
          {details.errors.length > 0 && (
            <div className="mt-2 space-y-1">
              {details.errors.map((err, i) => (
                <div key={i} className="text-xs text-rose-300">{err}</div>
              ))}
            </div>
          )}
        </div>

        {/* Expandable Details */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between rounded-lg border border-[#2f2862] bg-[#0a0815] p-4 text-left transition hover:bg-[#0f0d1a]"
        >
          <span className="text-sm font-semibold text-white">
            {isExpanded ? 'Hide' : 'Show'} XYO Cryptographic Details
          </span>
          <span className="text-slate-400">{isExpanded ? '▲' : '▼'}</span>
        </button>

        {isExpanded && (
          <div className="space-y-4 rounded-lg border border-[#2f2862] bg-[#0a0815] p-5">
            {/* Bound Witness Hash */}
            {details.boundWitnessHash && (
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs uppercase tracking-[0.25em] text-[#8ea8ff]">Bound Witness Hash</span>
                  <button
                    onClick={() => copyToClipboard(details.boundWitnessHash!, 'boundWitnessHash')}
                    className="text-xs text-[#7aa7ff] hover:text-[#9b7bff] transition"
                  >
                    {copiedField === 'boundWitnessHash' ? '✓ Copied' : 'Copy'}
                  </button>
                </div>
                <div className="font-mono text-xs text-slate-300 break-all rounded bg-[#07060e] p-2">
                  {details.boundWitnessHash}
                </div>
              </div>
            )}

            {/* Data Hash */}
            {details.dataHash && (
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs uppercase tracking-[0.25em] text-[#8ea8ff]">Data Hash</span>
                  <button
                    onClick={() => copyToClipboard(details.dataHash!, 'dataHash')}
                    className="text-xs text-[#7aa7ff] hover:text-[#9b7bff] transition"
                  >
                    {copiedField === 'dataHash' ? '✓ Copied' : 'Copy'}
                  </button>
                </div>
                <div className="font-mono text-xs text-slate-300 break-all rounded bg-[#07060e] p-2">
                  {details.dataHash}
                </div>
              </div>
            )}

            {/* Sequence Number (XL1) */}
            {details.sequence && (
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs uppercase tracking-[0.25em] text-[#8ea8ff]">Sequence Number (XL1)</span>
                  <button
                    onClick={() => copyToClipboard(details.sequence!, 'sequence')}
                    className="text-xs text-[#7aa7ff] hover:text-[#9b7bff] transition"
                  >
                    {copiedField === 'sequence' ? '✓ Copied' : 'Copy'}
                  </button>
                </div>
                <div className="font-mono text-xs text-slate-300 break-all rounded bg-[#07060e] p-2">
                  {details.sequence}
                </div>
              </div>
            )}

            {/* Signatures */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs uppercase tracking-[0.25em] text-[#8ea8ff]">
                  Signatures ({details.signatures.length})
                </span>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {details.signatures.length > 0 ? (
                  details.signatures.map((sig, i) => (
                    <div key={i} className="flex items-start gap-2 rounded border border-[#2f2862] bg-[#07060e] p-2">
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-slate-500 mb-1">Signature {i + 1}</div>
                        <div className="font-mono text-xs text-slate-300 break-all">{sig}</div>
                      </div>
                      <button
                        onClick={() => copyToClipboard(sig, `signature-${i}`)}
                        className="text-xs text-[#7aa7ff] hover:text-[#9b7bff] transition flex-shrink-0"
                      >
                        {copiedField === `signature-${i}` ? '✓' : 'Copy'}
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-slate-500 italic">No signatures found</div>
                )}
              </div>
            </div>

            {/* Hash Chain */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs uppercase tracking-[0.25em] text-[#8ea8ff]">
                  Hash Chain ({details.hashChain.length} links)
                </span>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {details.hashChain.length > 0 ? (
                  details.hashChain.map((hash, i) => (
                    <div key={i} className="flex items-start gap-2 rounded border border-[#2f2862] bg-[#07060e] p-2">
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-slate-500 mb-1">Previous Hash {i + 1}</div>
                        <div className="font-mono text-xs text-slate-300 break-all">{hash}</div>
                      </div>
                      <button
                        onClick={() => copyToClipboard(hash, `hash-${i}`)}
                        className="text-xs text-[#7aa7ff] hover:text-[#9b7bff] transition flex-shrink-0"
                      >
                        {copiedField === `hash-${i}` ? '✓' : 'Copy'}
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-slate-500 italic">No previous hashes (chain origin)</div>
                )}
              </div>
            </div>

            {/* Addresses */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs uppercase tracking-[0.25em] text-[#8ea8ff]">
                  Addresses ({details.addresses.length})
                </span>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {details.addresses.length > 0 ? (
                  details.addresses.map((addr, i) => (
                    <div key={i} className="flex items-start gap-2 rounded border border-[#2f2862] bg-[#07060e] p-2">
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-slate-500 mb-1">Address {i + 1}</div>
                        <div className="font-mono text-xs text-slate-300 break-all">{addr}</div>
                      </div>
                      <button
                        onClick={() => copyToClipboard(addr, `address-${i}`)}
                        className="text-xs text-[#7aa7ff] hover:text-[#9b7bff] transition flex-shrink-0"
                      >
                        {copiedField === `address-${i}` ? '✓' : 'Copy'}
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-slate-500 italic">No addresses found</div>
                )}
              </div>
            </div>

            {/* Payload Hashes */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs uppercase tracking-[0.25em] text-[#8ea8ff]">
                  Payload Hashes ({details.payloadHashes.length})
                </span>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {details.payloadHashes.length > 0 ? (
                  details.payloadHashes.map((hash, i) => (
                    <div key={i} className="flex items-start gap-2 rounded border border-[#2f2862] bg-[#07060e] p-2">
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-slate-500 mb-1">Payload Hash {i + 1}</div>
                        <div className="font-mono text-xs text-slate-300 break-all">{hash}</div>
                      </div>
                      <button
                        onClick={() => copyToClipboard(hash, `payload-${i}`)}
                        className="text-xs text-[#7aa7ff] hover:text-[#9b7bff] transition flex-shrink-0"
                      >
                        {copiedField === `payload-${i}` ? '✓' : 'Copy'}
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-slate-500 italic">No payload hashes found</div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Explanation Modal */}
      {isExplanationModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setIsExplanationModalOpen(false)}
        >
          <div
            className="glass-card rounded-3xl border border-[#2f2862] px-8 py-8 text-slate-100 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setIsExplanationModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
              type="button"
              aria-label="Close modal"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>

            {/* Content */}
            <div className="space-y-6">
              <div>
                <h3 className="text-2xl font-semibold text-white mb-2">
                  What Does "Cryptographically Verified" Mean?
                </h3>
                <p className="text-sm text-slate-400">
                  In simple terms, this means your delivery proof has been mathematically verified and cannot be faked or tampered with.
                </p>
              </div>

              <div className="space-y-4">
                <div className="rounded-lg border border-[#2f2862] bg-[#0a0815] p-4">
                  <h4 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                    <span className="text-emerald-400">✓</span>
                    What This Means for You
                  </h4>
                  <ul className="space-y-2 text-sm text-slate-300">
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-400 mt-1">•</span>
                      <span><strong>Authenticity:</strong> The delivery proof was created by the actual delivery system and hasn't been altered.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-400 mt-1">•</span>
                      <span><strong>Integrity:</strong> All the data (location, time, photos, signatures) is exactly as it was recorded and hasn't been changed.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-400 mt-1">•</span>
                      <span><strong>Blockchain Proof:</strong> The proof is permanently recorded on the blockchain, creating an unchangeable record.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-400 mt-1">•</span>
                      <span><strong>Mathematical Verification:</strong> Advanced cryptography ensures that any attempt to modify the data would be immediately detected.</span>
                    </li>
                  </ul>
                </div>

                <div className="rounded-lg border border-[#2f2862] bg-[#0a0815] p-4">
                  <h4 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                    <span className="text-[#8ea8ff]">🔐</span>
                    How It Works
                  </h4>
                  <div className="space-y-3 text-sm text-slate-300">
                    <p>
                      When a delivery is verified, the system creates a <strong>digital signature</strong> using cryptographic techniques. This signature is like a unique fingerprint that:
                    </p>
                    <ul className="space-y-2 ml-4">
                      <li className="list-disc">Proves the data came from the authorized delivery system</li>
                      <li className="list-disc">Detects any changes to the data (even a single character)</li>
                      <li className="list-disc">Links the proof to the blockchain for permanent verification</li>
                    </ul>
                    <p className="mt-3">
                      The "Cryptographically Verified" status means all these checks have passed, and your delivery proof is authentic and tamper-proof.
                    </p>
                  </div>
                </div>

                <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-4">
                  <h4 className="text-lg font-semibold text-emerald-200 mb-2">
                    Why This Matters
                  </h4>
                  <p className="text-sm text-emerald-100">
                    This verification ensures that delivery records can be trusted for legal, insurance, or business purposes. The cryptographic proof provides mathematical certainty that the data is authentic and hasn't been modified since it was originally recorded.
                  </p>
                </div>
              </div>

              {/* Close button at bottom */}
              <div className="flex justify-center pt-4">
                <button
                  onClick={() => setIsExplanationModalOpen(false)}
                  className="rounded-lg border border-[#2f2862] bg-white/5 px-6 py-2 text-sm font-semibold text-white hover:bg-white/10 transition-colors"
                  type="button"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

