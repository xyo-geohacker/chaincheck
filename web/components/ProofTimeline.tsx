import Link from 'next/link';

import type { DeliveryRecord } from '@shared/types/delivery.types';

type Props = {
  delivery: DeliveryRecord;
  boundWitnessData?: {
    isXL1?: boolean;
    xl1TransactionHash?: string;
    isMocked?: boolean;
  } | null;
  proofHash: string;
};

const timelineItems = (
  delivery: DeliveryRecord,
  boundWitnessData?: {
    isXL1?: boolean;
    xl1TransactionHash?: string;
    isMocked?: boolean;
    archivistResponse?: { success?: boolean; error?: string | null };
  } | null
) => {
  const events: Array<{ title: string; description: string; timestamp?: string | null }> = [
    {
      title: 'Delivery Created',
      description: `Order ${delivery.orderId} assigned to driver ${delivery.driverId}`,
      timestamp: delivery.createdAt
    }
  ];

  // Only show "Delivery Verified" if verification actually succeeded
  // Check: proofHash exists AND (archivistResponse.success === true OR isMocked === true)
  const hasValidProof = delivery.proofHash && (
    boundWitnessData?.archivistResponse?.success === true ||
    boundWitnessData?.isMocked === true
  );

  if (hasValidProof && delivery.verifiedAt) {
    events.push({
      title: 'Delivery Verified',
      description: delivery.proofHash
        ? `Proof hash ${delivery.proofHash} submitted to XYO/XL1`
        : 'Awaiting proof submission',
      timestamp: delivery.verifiedAt
    });
  } else if (delivery.proofHash && boundWitnessData?.archivistResponse?.success === false) {
    // Show verification failed status
    events.push({
      title: 'Verification Failed',
      description: `Proof submission failed: ${boundWitnessData.archivistResponse.error || 'Unknown error'}`,
      timestamp: delivery.verifiedAt
    });
  } else {
    // Show pending verification
    events.push({
      title: 'Verification Pending',
      description: 'Awaiting proof submission to blockchain',
      timestamp: null
    });
  }

  return events;
};

export function ProofTimeline({ delivery, boundWitnessData, proofHash }: Props) {
  const items = timelineItems(delivery, boundWitnessData);

  return (
    <div className="glass-card rounded-3xl border border-[#2f2862] px-8 py-8 text-slate-100">
      <h3 className="text-lg font-semibold text-white">Delivery/Proof Timeline</h3>
      <ol className="mt-6 space-y-6">
        {items.map((item, index) => (
          <li key={item.title} className="relative pl-7">
            <span className="absolute left-0 top-2 h-3 w-3 rounded-full bg-gradient-to-br from-[#7a5bff] to-[#3fb4ff]" />
            {index < items.length - 1 ? (
              <span className="absolute left-[5px] top-6 h-full w-px bg-[#2f2862]" aria-hidden />
            ) : null}
            <p className="text-sm font-semibold text-white">{item.title}</p>
            <p className="text-sm text-slate-300 break-words">{item.description}</p>
            <p className="text-xs uppercase tracking-wide text-slate-500">
              {item.timestamp ? new Date(item.timestamp).toLocaleString() : 'Pending'}
            </p>
          </li>
        ))}
      </ol>
    </div>
  );
}

