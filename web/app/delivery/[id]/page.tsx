import Link from 'next/link';
import { notFound } from 'next/navigation';

import type { DeliveryRecord } from '@shared/types/delivery.types';
import { DeliveryStatus } from '@shared/types/delivery.types';
import { DeliveryMap } from '@components/DeliveryMap';
import { ProofTimeline } from '@components/ProofTimeline';
import { fetchDeliveryById } from '@lib/api';

type DeliveryPageProps = {
  params: { id: string };
};

function formatStatus(status: DeliveryRecord['status']) {
  return status.replace(/_/g, ' ');
}

function getStatusColor(status: DeliveryRecord['status']) {
  switch (status) {
    case DeliveryStatus.DELIVERED:
      return 'border-emerald-400/60 bg-emerald-400/20 text-emerald-200';
    case DeliveryStatus.PENDING:
      return 'border-amber-300/60 bg-amber-300/20 text-amber-100';
    case DeliveryStatus.IN_TRANSIT:
      return 'border-blue-400/60 bg-blue-400/20 text-blue-200';
    case DeliveryStatus.FAILED:
      return 'border-rose-400/60 bg-rose-400/20 text-rose-200';
    case DeliveryStatus.DISPUTED:
      return 'border-red-400/60 bg-red-400/20 text-red-200';
    default:
      return 'border-[#3b2e6f] bg-[#1b1631] text-[#9b7bff]';
  }
}

export default async function DeliveryPage({ params }: DeliveryPageProps) {
  const { id } = params;

  let delivery: DeliveryRecord | null = null;

  try {
    delivery = await fetchDeliveryById(id);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to fetch delivery:', error);
    notFound();
  }

  if (!delivery) {
    notFound();
  }

  const boundWitnessData = (delivery.boundWitnessData as { 
    isXL1?: boolean;
    xl1TransactionHash?: string;
    isMocked?: boolean;
    archivistResponse?: { success?: boolean; error?: string | null };
  } | null) ?? null;

  // Use proofHash if available, otherwise use delivery ID as fallback
  const proofHash = delivery.proofHash || delivery.id;

  return (
    <main className="mx-auto max-w-[100rem] space-y-10 px-6 py-12 text-slate-100">
      <Link
        href="/"
        className="rounded-lg border border-[#2f2862] bg-white/5 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10 transition-colors"
      >
        ← Back to Dashboard
      </Link>

      <header className="space-y-3">
        <p className="text-xs uppercase tracking-[0.35em] text-[#8ea8ff]">Delivery Details</p>
        <h1 className="text-3xl font-semibold leading-tight">
          Delivery details for <span className="accent-text">{delivery.orderId}</span>
        </h1>
        <p className="max-w-3xl text-sm text-slate-300">
          {delivery.proofHash 
            ? 'XYO bound witness metadata, network proof, and supporting evidence collected at the moment of handoff.'
            : 'Delivery information and current status. Verification pending.'}
        </p>
      </header>

      {/* Status Card */}
      <div className="glass-card grid gap-6 rounded-3xl border border-[#2f2862] px-6 py-7 text-slate-100">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.3em] text-[#8ea8ff]">Delivery Status</p>
            <p className="text-lg font-semibold text-white">{formatStatus(delivery.status)}</p>
          </div>
          <span className={`rounded-full px-4 py-1 text-xs font-semibold uppercase tracking-wide border ${getStatusColor(delivery.status)}`}>
            {formatStatus(delivery.status)}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-[#8ea8ff]">Order ID</p>
            <p className="mt-1 text-sm font-semibold text-white">{delivery.orderId}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-[#8ea8ff]">Driver</p>
            <p className="mt-1 text-sm font-semibold text-white">{delivery.driverId}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-[#8ea8ff]">Created</p>
            <p className="mt-1 text-sm font-semibold text-white">
              {delivery.createdAt ? new Date(delivery.createdAt).toLocaleString() : 'N/A'}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Column 1: Timeline */}
        <div className="lg:col-span-4">
          <ProofTimeline 
            delivery={delivery}
            boundWitnessData={boundWitnessData}
            proofHash={proofHash}
          />
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
                <dt className="text-xs uppercase tracking-[0.25em] text-[#8ea8ff]">Phone</dt>
                <dd className="mt-1 text-sm font-medium text-white">{delivery.recipientPhone}</dd>
              </div>
              {delivery.verifiedAt && (
                <div>
                  <dt className="text-xs uppercase tracking-[0.25em] text-[#8ea8ff]">Verified At</dt>
                  <dd className="mt-1 text-sm font-medium text-white">
                    {new Date(delivery.verifiedAt).toLocaleString()}
                  </dd>
                </div>
              )}
              {delivery.actualLat && delivery.actualLon && (
                <>
                  <div>
                    <dt className="text-xs uppercase tracking-[0.25em] text-[#8ea8ff]">Actual Location</dt>
                    <dd className="mt-1 text-sm font-medium text-white">
                      {delivery.actualLat.toFixed(6)}, {delivery.actualLon.toFixed(6)}
                    </dd>
                  </div>
                  {delivery.distanceFromDest !== null && (
                    <div>
                      <dt className="text-xs uppercase tracking-[0.25em] text-[#8ea8ff]">Distance from Destination</dt>
                      <dd className="mt-1 text-sm font-medium text-white">
                        {delivery.distanceFromDest.toFixed(2)} meters
                      </dd>
                    </div>
                  )}
                </>
              )}
              {delivery.notes && (
                <div>
                  <dt className="text-xs uppercase tracking-[0.25em] text-[#8ea8ff]">Notes</dt>
                  <dd className="mt-1 text-sm font-medium text-white">{delivery.notes}</dd>
                </div>
              )}
            </dl>
          </div>
        </div>

        {/* Column 3: Map */}
        <div className="lg:col-span-4">
          <div className="glass-card rounded-3xl border border-[#2f2862] px-6 py-6 text-slate-100">
            <h2 className="text-lg font-semibold mb-4">Map/Location</h2>
            {delivery.destinationLat && delivery.destinationLon ? (
              <DeliveryMap
                destination={{
                  lat: delivery.destinationLat,
                  lon: delivery.destinationLon
                }}
                actualLocation={
                  delivery.actualLat && delivery.actualLon && delivery.verifiedAt
                    ? {
                        lat: delivery.actualLat,
                        lon: delivery.actualLon
                      }
                    : undefined
                }
              />
            ) : (
              <div className="rounded-3xl border border-dashed border-[#3b2e6f] bg-[#100e1d]/70 p-6 text-center text-sm text-[#8ea8ff]">
                Destination coordinates not available
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Verification Status */}
      {!delivery.proofHash && (
        <div className="glass-card rounded-3xl border border-amber-300/60 bg-amber-300/10 px-6 py-6 text-slate-100">
          <div className="flex items-start gap-4">
            <div className="rounded-full bg-amber-300/20 p-2">
              <svg className="h-6 w-6 text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-amber-200">Verification Pending</h3>
              <p className="mt-2 text-sm text-slate-300">
                This delivery has not yet been verified on the blockchain. Once the driver completes the delivery verification process, 
                proof-of-location data will be available here.
              </p>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

