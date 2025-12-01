'use client';

import { useState } from 'react';

import type { ArchivistSubmissionResult } from '@shared/types/xyo.types';

type Props = {
  archivistResponse?: ArchivistSubmissionResult | null;
  xl1TransactionHash?: string | null;
  archivistBoundWitnessHash?: string | null;
  boundWitness?: unknown; // XL1 bound witness containing payload_hashes
};

export function ArchivistPayloadPanel({ archivistResponse, xl1TransactionHash, archivistBoundWitnessHash, boundWitness }: Props) {
  const offChainPayload = archivistResponse?.offChainPayload;
  const hasPayload = offChainPayload && typeof offChainPayload === 'object';


  if (!archivistResponse) {
    return (
      <div className="glass-card rounded-3xl border border-[#2f2862] px-6 py-6 text-slate-100">
        <h2 className="text-lg font-semibold text-white mb-4">XYO (Archivist) Off-Chain Data</h2>
        <div className="text-sm text-slate-400">No Archivist data available</div>
      </div>
    );
  }

  if (!archivistResponse.success) {
    return (
      <div className="glass-card rounded-3xl border border-[#2f2862] px-6 py-6 text-slate-100">
        <h2 className="text-lg font-semibold text-white mb-4">XYO (Archivist) Off-Chain Data</h2>
        <div className="rounded-lg border border-rose-400/60 bg-rose-400/20 p-4 text-sm text-rose-200">
          <p className="font-semibold">Archivist Error:</p>
          <p className="mt-1">{archivistResponse.error || 'Unknown error'}</p>
        </div>
      </div>
    );
  }

  if (!hasPayload) {
    return (
      <div className="glass-card rounded-3xl border border-[#2f2862] px-6 py-6 text-slate-100">
        <h2 className="text-lg font-semibold text-white mb-4">XYO (Archivist) Off-Chain Data</h2>
        <div className="text-sm text-slate-400">No off-chain payload data available</div>
      </div>
    );
  }

  const payload = offChainPayload as Record<string, unknown>;
  const payloadData = payload.data as Record<string, unknown> | undefined;
  const schema = payload.schema as string | undefined;

  return (
      <div className="glass-card rounded-3xl border border-[#2f2862] px-6 py-6 text-slate-100">
        <div className="flex items-center gap-4 mb-4">
          <h2 className="text-lg font-semibold text-white flex-shrink-0">XYO (Archivist) Off-Chain Data</h2>
          <div className="flex flex-col items-end gap-2 flex-shrink-0 ml-auto">
            {/* Stored badge */}
            <span className="rounded-full bg-emerald-500/20 border border-emerald-500/40 px-3 py-1 text-xs font-semibold text-emerald-200 flex-shrink-0">
              ✓ Stored
            </span>
          </div>
        </div>

      {/* Correlation Information */}
      {(xl1TransactionHash || archivistBoundWitnessHash || payload) && (
        <div className="mb-4 rounded-lg border border-[#2f2862] bg-[#0a0815] p-4">
          <h3 className="text-xs uppercase tracking-[0.25em] text-[#8ea8ff] mb-2">Data Correlation</h3>
          <div className="space-y-2 text-xs">
            {xl1TransactionHash && (
              <div>
                <span className="text-slate-400">XL1 Bound Witness Hash:</span>
                <div className="mt-1 font-mono text-[#8fa5ff] break-all">{xl1TransactionHash}</div>
              </div>
            )}
            {payload && (() => {
              const payloadHash = (payload as Record<string, unknown>)._hash || (payload as Record<string, unknown>)._dataHash;
              return payloadHash ? (
                <div>
                  <span className="text-slate-400">XL1 Off-Chain Data Hash:</span>
                  <div className="mt-1 font-mono text-[#8fa5ff] break-all">{String(payloadHash)}</div>
                </div>
              ) : null;
            })()}
            {archivistBoundWitnessHash && (
              <div>
                <span className="text-slate-400">Archivist Bound Witness Hash:</span>
                <div className="mt-1 font-mono text-[#8fa5ff] break-all">{archivistBoundWitnessHash}</div>
                <p className="mt-1 text-slate-500 text-[10px]">Used for Diviner queries (different from XL1 hash)</p>
              </div>
            )}
            {xl1TransactionHash && archivistBoundWitnessHash && (
              <p className="mt-2 text-slate-500 text-[10px] italic">
                Note: These are different bound witnesses (on-chain vs off-chain) but share the same payload hashes
              </p>
            )}
          </div>
        </div>
      )}

      {/* Payload Schema */}
      {schema && (
        <div className="mb-4">
          <div className="text-xs uppercase tracking-[0.25em] text-[#8ea8ff]">Schema</div>
          <div className="mt-1 text-sm font-mono text-[#8fa5ff]">{schema}</div>
        </div>
      )}

      {/* Payload Data */}
      {payloadData && (
        <div>
          <div className="text-xs uppercase tracking-[0.25em] text-[#8ea8ff] mb-2">Payload Data</div>
          <div className="rounded-lg border border-[#2f2862] bg-[#0a0815] p-4">
            <dl className="space-y-3">
              {payloadData.latitude != null && payloadData.longitude != null && (
                <>
                  <div>
                    <dt className="text-xs text-slate-400">Location</dt>
                    <dd className="mt-1 text-sm font-medium text-white">
                      {Number(payloadData.latitude).toFixed(6)}, {Number(payloadData.longitude).toFixed(6)}
                    </dd>
                  </div>
                </>
              )}
              {payloadData.altitude != null && (
                <div>
                  <dt className="text-xs text-slate-400">Altitude</dt>
                  <dd className="mt-1 text-sm text-white">
                    {Number(payloadData.altitude).toFixed(2)} m
                  </dd>
                </div>
              )}
              {payloadData.barometricPressure != null && (
                <div>
                  <dt className="text-xs text-slate-400">Pressure</dt>
                  <dd className="mt-1 text-sm text-white">
                    {Number(payloadData.barometricPressure).toFixed(2)} hPa
                  </dd>
                </div>
              )}
              {payloadData.accelerometer != null && typeof payloadData.accelerometer === 'object' && (
                <div>
                  <dt className="text-xs text-slate-400">Acceleration</dt>
                  <dd className="mt-1 text-sm text-white font-mono">
                    X: {Number((payloadData.accelerometer as { x?: number }).x ?? 0).toFixed(3)} m/s²
                    <br />
                    Y: {Number((payloadData.accelerometer as { y?: number }).y ?? 0).toFixed(3)} m/s²
                    <br />
                    Z: {Number((payloadData.accelerometer as { z?: number }).z ?? 0).toFixed(3)} m/s²
                  </dd>
                  <p className="mt-1 text-[10px] text-slate-500 italic">
                    Low/zero values indicate device was stationary at verification time
                  </p>
                </div>
              )}
              {payloadData.photoHash != null && (
                <div>
                  <dt className="text-xs text-slate-400">Photo Hash</dt>
                  <dd className="mt-1">
                    <div className="text-sm font-mono text-[#8fa5ff] break-all">{String(payloadData.photoHash)}</div>
                    <p className="mt-1 text-[10px] text-slate-500 italic">
                      SHA-256 hash of delivery photo for tamper detection
                    </p>
                  </dd>
                </div>
              )}
              {payloadData.signatureHash != null && (
                <div>
                  <dt className="text-xs text-slate-400">Signature Hash</dt>
                  <dd className="mt-1">
                    <div className="text-sm font-mono text-[#8fa5ff] break-all">{String(payloadData.signatureHash)}</div>
                    <p className="mt-1 text-[10px] text-slate-500 italic">
                      SHA-256 hash of recipient signature for tamper detection
                    </p>
                  </dd>
                </div>
              )}
              {payloadData.timestamp != null && (
                <div>
                  <dt className="text-xs text-slate-400">Timestamp</dt>
                  <dd className="mt-1 text-sm text-white">
                    {(() => {
                      try {
                        // Handle different timestamp formats
                        const ts = payloadData.timestamp;
                        let date: Date;
                        
                        if (typeof ts === 'number') {
                          // Already a number (milliseconds or seconds)
                          date = new Date(ts > 1e12 ? ts : ts * 1000); // If less than 1e12, assume seconds
                        } else if (typeof ts === 'string') {
                          // Try parsing as number first
                          const numTs = Number(ts);
                          if (!isNaN(numTs)) {
                            date = new Date(numTs > 1e12 ? numTs : numTs * 1000);
                          } else {
                            // Try parsing as ISO string
                            date = new Date(ts);
                          }
                        } else {
                          return 'Invalid timestamp format';
                        }
                        
                        // Check if date is valid
                        if (isNaN(date.getTime())) {
                          return `Invalid Date (raw: ${String(ts)})`;
                        }
                        
                        return date.toLocaleString();
                      } catch (error) {
                        return `Error parsing timestamp: ${String(payloadData.timestamp)}`;
                      }
                    })()}
                  </dd>
                </div>
              )}
              {payloadData.orderId != null && (
                <div>
                  <dt className="text-xs text-slate-400">Order ID</dt>
                  <dd className="mt-1 text-sm text-white">{String(payloadData.orderId)}</dd>
                </div>
              )}
              {payloadData.driverId != null && (
                <div>
                  <dt className="text-xs text-slate-400">Driver ID</dt>
                  <dd className="mt-1 text-sm text-white">{String(payloadData.driverId)}</dd>
                </div>
              )}
              {payloadData.deliveryAddress != null && (
                <div>
                  <dt className="text-xs text-slate-400">Delivery Address</dt>
                  <dd className="mt-1 text-sm text-white">{String(payloadData.deliveryAddress)}</dd>
                </div>
              )}
              {payloadData.xyoNfcUserRecord != null && (
                <div>
                  <dt className="text-xs text-slate-400">XYO Driver Record</dt>
                  <dd className="mt-1">
                    <span className="text-sm text-white italic">Present</span>
                    <p className="mt-1 text-[10px] text-slate-500 italic">Not displayed for privacy (see JSON for full value)</p>
                  </dd>
                </div>
              )}
            </dl>
          </div>
        </div>
      )}

      {/* Full Payload JSON (Collapsible) */}
      <details className="mt-4">
        <summary className="cursor-pointer text-xs uppercase tracking-[0.25em] text-[#8ea8ff] hover:text-[#9b7bff] transition-colors">
          View Full Archivist Payload (JSON)
        </summary>
        <div className="mt-2 rounded-lg border border-[#2f2862] bg-[#07060e] p-4">
          <pre className="text-xs text-[#8fa5ff] overflow-auto max-h-96">
            {JSON.stringify(payload, null, 2)}
          </pre>
        </div>
      </details>

    </div>
  );
}

