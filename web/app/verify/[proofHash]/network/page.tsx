import Link from 'next/link';
import { notFound } from 'next/navigation';

import type { DeliveryRecord } from '@shared/types/delivery.types';
import { BoundWitnessChain } from '@components/BoundWitnessChain';
import { CryptographicDetails } from '@components/CryptographicDetails';
import { DivinerVerificationPanel } from '@components/DivinerVerificationPanel';
import { LocationAccuracyPanel } from '@components/LocationAccuracyPanel';
import { fetchDeliveryByProof } from '@lib/api';
import type { ArchivistSubmissionResult, DivinerVerificationResult } from '@shared/types/xyo.types';

type NetworkProofDetailsPageProps = {
  params: { proofHash: string };
};

export default async function NetworkProofDetailsPage({ params }: NetworkProofDetailsPageProps) {
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

  const boundWitnessData = (delivery.boundWitnessData as { 
    archivistResponse?: ArchivistSubmissionResult; 
    payloads?: unknown;
    divinerVerification?: DivinerVerificationResult;
    isXL1?: boolean;
    isMocked?: boolean;
    xl1TransactionHash?: string;
  } | null) ?? null;

  return (
    <main className="mx-auto max-w-[100rem] space-y-10 px-6 py-12 text-slate-100">
      <Link
        href={`/verify/${proofHash}`}
        className="rounded-lg border border-[#2f2862] bg-white/5 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10 transition-colors"
      >
        ← Back to Verification Detail
      </Link>

      <header className="space-y-3">
        <p className="text-xs uppercase tracking-[0.35em] text-[#8ea8ff]">Network Proof Details</p>
        <h1 className="text-3xl font-semibold leading-tight">
          XYO Network Verification for <span className="accent-text">{delivery.orderId}</span>
        </h1>
        <p className="max-w-3xl text-sm text-slate-300 whitespace-nowrap">
          Detailed network verification, cryptographic proof chain, and location accuracy metrics from the XYO Network.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left Column: XYO Network Verification */}
        <div className="lg:col-span-4">
          <DivinerVerificationPanel 
            proofHash={proofHash}
            latitude={delivery.actualLat ?? undefined}
            longitude={delivery.actualLon ?? undefined}
            timestamp={delivery.verifiedAt ? new Date(delivery.verifiedAt).getTime() : undefined}
            divinerVerification={boundWitnessData?.divinerVerification ?? null}
          />
        </div>

        {/* Middle Column: Location Accuracy and Proof Chain */}
        <div className="space-y-6 lg:col-span-4">
          <LocationAccuracyPanel 
            proofHash={proofHash}
            latitude={delivery.actualLat ?? undefined}
            longitude={delivery.actualLon ?? undefined}
          />

          <BoundWitnessChain 
            proofHash={proofHash} 
            maxDepth={5}
            isMocked={boundWitnessData?.isMocked ?? false}
            isXL1={boundWitnessData?.isXL1 ?? false}
            xl1TransactionHash={boundWitnessData?.xl1TransactionHash ?? proofHash}
          />
        </div>

        {/* Right Column: Cryptographic Details */}
        <div className="lg:col-span-4">
          <CryptographicDetails proofHash={proofHash} />
        </div>
      </div>
    </main>
  );
}

