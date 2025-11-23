import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import type { DeliveryRecord } from '@shared/types/delivery.types';
import { ArchivistPayloadPanel } from '@components/ArchivistPayloadPanel';
import { CollapsibleSection } from '@components/CollapsibleSection';
import { DeliveryMap } from '@components/DeliveryMap';
import { DriverVerificationBadge } from '@components/DriverVerificationBadge';
import { ProofTimeline } from '@components/ProofTimeline';
import { TamperDetectionPanel } from '@components/TamperDetectionPanel';
import { VerificationCard } from '@components/VerificationCard';
import { fetchDeliveryByProof, fetchProofDetails } from '@lib/api';
import type { ArchivistSubmissionResult, DivinerVerificationResult } from '@shared/types/xyo.types';

type VerifyPageProps = {
  params: { proofHash: string };
};

export default async function VerifyPage({ params }: VerifyPageProps) {
  const { proofHash } = params;

  let delivery: DeliveryRecord | null = null;

  try {
    delivery = await fetchDeliveryByProof(proofHash);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to fetch delivery for proof hash:', error);
    notFound();
  }

  if (!delivery) {
    notFound();
  }

  let proof: Awaited<ReturnType<typeof fetchProofDetails>> | null = null;

  try {
    proof = await fetchProofDetails(proofHash);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn('No proof details available for proof hash:', proofHash, error);
  }

  const boundWitnessData = (delivery.boundWitnessData as { 
    archivistResponse?: ArchivistSubmissionResult; 
    payloads?: unknown;
    divinerVerification?: DivinerVerificationResult;
    isXL1?: boolean;
    isMocked?: boolean;
    xl1TransactionHash?: string;
    archivistBoundWitnessHash?: string;
    xl1BlockNumber?: number | null;
    xl1Nbf?: number | null;
    xl1Exp?: number | null;
    xl1ActualBlockNumber?: number | null;
    boundWitness?: unknown; // The actual bound witness tuple [boundWitness, payloads] from XL1
  } | null) ?? null;
  const archivistResponse = boundWitnessData?.archivistResponse;
  const divinerVerification = boundWitnessData?.divinerVerification;

  const payloadsFromSubmission = boundWitnessData?.payloads ?? [];
  const { payloads: _, archivistResponse: __, divinerVerification: ___, ...boundWitnessWithoutMeta } = boundWitnessData ?? {};

  // Extract the actual bound witness from proof data or boundWitnessData
  // The bound witness should have payload_hashes and payload_schemas for verification
  // IMPORTANT: The bound witness from XL1 is stored in boundWitnessData.boundWitness
  // and is in tuple format: [boundWitness, payloads] where boundWitness has payload_hashes
  let actualBoundWitness: unknown = null;
  
  // First, try to get it from proof.data (tuple format: [boundWitness, payloads])
  // proof.data is an array of tuples: [[boundWitness, payloads], ...]
  if (proof?.data && Array.isArray(proof.data) && proof.data.length > 0) {
    const firstTuple = proof.data[0];
    // Tuple format: [boundWitness, payloads] or {boundWitness: ..., payloads: ...}
    if (Array.isArray(firstTuple) && firstTuple.length > 0) {
      // Direct tuple format: [boundWitness, payloads]
      actualBoundWitness = firstTuple[0];
      // eslint-disable-next-line no-console
      console.log('Extracted bound witness from proof.data[0][0] (tuple format)');
    } else if (firstTuple && typeof firstTuple === 'object' && 'boundWitness' in firstTuple) {
      // Object format: {boundWitness: ..., payloads: ...}
      actualBoundWitness = (firstTuple as { boundWitness: unknown }).boundWitness;
      // eslint-disable-next-line no-console
      console.log('Extracted bound witness from proof.data[0].boundWitness (object format)');
    }
  }
  
  // If not found, try to get it from boundWitnessData.boundWitness (if stored directly)
  // boundWitnessData.boundWitness is the tuple [boundWitness, payloads] from XL1 transaction
  if (!actualBoundWitness && boundWitnessData && typeof boundWitnessData === 'object' && 'boundWitness' in boundWitnessData) {
    const storedBoundWitness = (boundWitnessData as { boundWitness?: unknown }).boundWitness;
    
    // Check if it's a tuple format [boundWitness, payloads]
    if (Array.isArray(storedBoundWitness) && storedBoundWitness.length > 0) {
      actualBoundWitness = storedBoundWitness[0];
      // eslint-disable-next-line no-console
      console.log('Extracted bound witness from boundWitnessData.boundWitness[0] (tuple format)');
    } else if (storedBoundWitness && typeof storedBoundWitness === 'object' && !Array.isArray(storedBoundWitness)) {
      // It's already the bound witness object
      actualBoundWitness = storedBoundWitness;
      // eslint-disable-next-line no-console
      console.log('Extracted bound witness from boundWitnessData.boundWitness (object format)');
    }
  }
  
  // Debug: Log what we're passing to the component
  // eslint-disable-next-line no-console
  console.log('Bound witness extraction result:', {
    hasActualBoundWitness: !!actualBoundWitness,
    actualBoundWitnessType: actualBoundWitness ? (Array.isArray(actualBoundWitness) ? 'array' : typeof actualBoundWitness) : 'null',
    actualBoundWitnessKeys: actualBoundWitness && typeof actualBoundWitness === 'object' && !Array.isArray(actualBoundWitness) 
      ? Object.keys(actualBoundWitness as Record<string, unknown>) 
      : [],
    hasPayloadHashes: actualBoundWitness && typeof actualBoundWitness === 'object' && !Array.isArray(actualBoundWitness)
      ? 'payload_hashes' in (actualBoundWitness as Record<string, unknown>)
      : false,
    boundWitnessDataKeys: boundWitnessData && typeof boundWitnessData === 'object' ? Object.keys(boundWitnessData as Record<string, unknown>) : []
  });
  
  // If still not found, log a warning but don't use boundWitnessWithoutMeta (it doesn't have payload_hashes)
  if (!actualBoundWitness) {
    // eslint-disable-next-line no-console
    console.warn('Could not extract bound witness with payload_hashes. boundWitnessWithoutMeta will not have the required fields.');
    // eslint-disable-next-line no-console
    console.warn('boundWitnessData structure:', boundWitnessData);
    // eslint-disable-next-line no-console
    console.warn('proof.data structure:', proof?.data);
  }

  const fallbackTuple =
    boundWitnessData != null
      ? [
          {
            boundWitness: actualBoundWitness,
            payloads: payloadsFromSubmission
          }
        ]
      : null;

  const tupleData = proof?.data ?? fallbackTuple;

  const proofDataForDisplay =
    archivistResponse !== undefined || tupleData !== null
      ? {
          archivistResponse: archivistResponse ?? null,
          tuple: tupleData,
          submittedBoundWitness: boundWitnessData ? boundWitnessWithoutMeta : null
        }
      : {};

  const archivistStatus =
    archivistResponse?.success === true
      ? 'success'
      : archivistResponse?.success === false && archivistResponse.error
        ? 'error'
        : archivistResponse?.success === false
          ? 'pending'
          : undefined;

  return (
    <main className="mx-auto max-w-[100rem] space-y-10 px-6 py-12 text-slate-100">
      <Link
        href="/"
        className="rounded-lg border border-[#2f2862] bg-white/5 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10 transition-colors"
      >
        ← Back to Dashboard
      </Link>

      <header className="space-y-3">
        <p className="text-xs uppercase tracking-[0.35em] text-[#8ea8ff]">Verification Detail</p>
        <h1 className="text-3xl font-semibold leading-tight">
          Proof of delivery for <span className="accent-text">{delivery.orderId}</span>
        </h1>
        <p className="max-w-3xl text-sm text-slate-300">
          XYO bound witness metadata, network proof, and supporting evidence collected at the moment of handoff.
        </p>
      </header>

                  <VerificationCard
                    isValid={Boolean(proof?.isValid) && (archivistStatus === 'success' || boundWitnessData?.isMocked === true)}
                    proofHash={proofHash}
                    blockNumber={boundWitnessData?.xl1BlockNumber ?? delivery.blockNumber}
                    timestamp={delivery.verifiedAt}
                    archivistStatus={archivistStatus}
                    boundWitnessData={boundWitnessData}
                    xl1Nbf={boundWitnessData?.xl1Nbf ?? null}
                    xl1Exp={boundWitnessData?.xl1Exp ?? null}
                    xl1ActualBlockNumber={boundWitnessData?.xl1ActualBlockNumber ?? null}
                  />

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Column 1: Proof Timeline + Map */}
        <div className="lg:col-span-4 space-y-6">
          <ProofTimeline 
            delivery={delivery}
            boundWitnessData={boundWitnessData as { isXL1?: boolean; xl1TransactionHash?: string; isMocked?: boolean } | null}
            proofHash={proofHash}
          />
          
          {/* Map/Location below Proof Timeline */}
          <div className="glass-card rounded-3xl border border-[#2f2862] px-6 py-6 text-slate-100">
            <h2 className="text-lg font-semibold text-white mb-4">Map/Location</h2>
            <div className="overflow-hidden rounded-xl border border-[#2f2862]">
              <DeliveryMap
                destination={{ lat: delivery.destinationLat, lon: delivery.destinationLon }}
                actualLocation={
                  delivery.actualLat && delivery.actualLon
                    ? { lat: delivery.actualLat, lon: delivery.actualLon }
                    : undefined
                }
              />
            </div>
          </div>
        </div>

        {/* Column 2: Delivery Details */}
        <div className="lg:col-span-4">
          <div className="glass-card rounded-3xl border border-[#2f2862] px-6 py-6 text-slate-100">
            <h2 className="text-lg font-semibold">Delivery Details</h2>
            <dl className="mt-4 grid gap-4">
              <div>
                <dt className="text-xs uppercase tracking-[0.25em] text-[#8ea8ff]">Recipient</dt>
                <dd className="mt-1 text-sm font-medium text-white">{delivery.recipientName}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-[0.25em] text-[#8ea8ff]">Address</dt>
                <dd className="mt-1 text-sm font-medium text-white">{delivery.deliveryAddress}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-[0.25em] text-[#8ea8ff]">Driver</dt>
                <dd className="mt-1 flex items-center gap-2">
                  <span className="text-sm text-slate-300">{delivery.driverId}</span>
                  {delivery.driverNfcVerified ? (
                    <DriverVerificationBadge driverId={delivery.driverId} />
                  ) : null}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-[0.25em] text-[#8ea8ff]">Distance</dt>
                <dd className="mt-1 text-sm text-slate-300">
                  {delivery.distanceFromDest ? `${delivery.distanceFromDest.toFixed(1)} m` : 'Pending'}
                </dd>
              </div>
              {delivery.notes ? (
                <div>
                  <dt className="text-xs uppercase tracking-[0.25em] text-[#8ea8ff]">Driver Notes</dt>
                  <dd className="mt-2 text-sm text-slate-300 whitespace-pre-wrap">{delivery.notes}</dd>
                </div>
              ) : null}
            </dl>

            {/* Collapsible Delivery Photo */}
            {delivery.photoIpfsHash ? (
              <CollapsibleSection title="Delivery Photo" defaultOpen={false}>
                <div className="relative w-full rounded-xl border border-[#2f2862] overflow-hidden">
                  {delivery.photoIpfsHash.startsWith('data:') ? (
                    // Handle base64 data URI
                    <img
                      src={delivery.photoIpfsHash}
                      alt="Delivery proof"
                      className="w-full h-auto"
                    />
                  ) : (
                    // Handle IPFS hash
                    <Image
                      src={`https://gateway.pinata.cloud/ipfs/${delivery.photoIpfsHash}`}
                      alt="Delivery proof"
                      width={800}
                      height={600}
                      className="w-full h-auto"
                      unoptimized
                    />
                  )}
                </div>
                {/* Test image - commented out for future testing
                <img
                  src="https://gateway.pinata.cloud/ipfs/bafybeifgb6iuxqjaqxyxez2lipbbi5u45nkng2o6xr5vhzmqtoqoqfv6vm"
                  alt="Delivery proof (test)"
                  className="mt-2 max-w-full rounded-xl border border-[#2f2862]"
                />
                */}
              </CollapsibleSection>
            ) : null}

            {/* Collapsible Recipient Signature */}
            {delivery.signatureIpfsHash ? (
              <CollapsibleSection title="Recipient Signature" defaultOpen={false}>
                <div className="relative w-full rounded-xl border border-[#2f2862] bg-white overflow-hidden">
                  {delivery.signatureIpfsHash.startsWith('data:') ? (
                    // Handle base64 data URI
                    <img
                      src={delivery.signatureIpfsHash}
                      alt="Recipient signature"
                      className="w-full h-auto"
                    />
                  ) : (
                    // Handle IPFS hash
                    <Image
                      src={`https://gateway.pinata.cloud/ipfs/${delivery.signatureIpfsHash}`}
                      alt="Recipient signature"
                      width={400}
                      height={200}
                      className="w-full h-auto"
                      unoptimized
                    />
                  )}
                </div>
              </CollapsibleSection>
            ) : null}

            {/* Tamper Detection Panel */}
            {delivery.proofHash && archivistResponse?.offChainPayload ? (
              <div className="mt-6">
                <TamperDetectionPanel
                  storedPayload={archivistResponse.offChainPayload}
                  xl1TransactionHash={boundWitnessData?.xl1TransactionHash ?? null}
                  boundWitness={actualBoundWitness ?? null}
                  proofHash={delivery.proofHash}
                />
              </div>
            ) : null}

            {/* Network Proof Details Link - Only show if delivery has a valid proof */}
            {delivery.proofHash && (
              (boundWitnessData?.archivistResponse?.success === true ||
               boundWitnessData?.isMocked === true) && (
                <div className="mt-6 flex justify-center">
                  <Link
                    href={`/verify/${proofHash}/network`}
                    className="inline-flex items-center gap-2 rounded-lg border border-[#2f2862] bg-white/5 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10 transition-colors"
                  >
                    View Network Proof Details →
                  </Link>
                </div>
              )
            )}
          </div>
        </div>

        {/* Column 3: XYO (Archivist) Off-Chain Data Panel */}
        <div className="lg:col-span-4">
          {archivistResponse ? (
            <ArchivistPayloadPanel
              archivistResponse={archivistResponse}
              xl1TransactionHash={boundWitnessData?.xl1TransactionHash ?? null}
              archivistBoundWitnessHash={boundWitnessData?.archivistBoundWitnessHash ?? null}
              boundWitness={actualBoundWitness ?? null}
            />
          ) : (
            <div className="glass-card rounded-3xl border border-[#2f2862] px-6 py-6 text-slate-100">
              <h2 className="text-lg font-semibold text-white mb-4">XYO (Archivist) Off-Chain Data</h2>
              <div className="text-sm text-slate-400">No Archivist data available</div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

