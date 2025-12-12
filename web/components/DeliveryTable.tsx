'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import type { DeliveryRecord } from '@shared/types/delivery.types';
import { DeliveryStatus, PaymentStatus } from '@shared/types/delivery.types';

type Props = {
  deliveries: DeliveryRecord[];
  initialStatusFilter?: DeliveryStatus | 'all';
};

function formatStatus(status: DeliveryRecord['status']) {
  return status.replace(/_/g, ' ');
}

function getStatusColor(status: DeliveryStatus) {
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

function getPaymentStatusColor(status: PaymentStatus | null | undefined): string {
  switch (status) {
    case PaymentStatus.PAID:
      return 'border-emerald-400/60 bg-emerald-400/20 text-emerald-200';
    case PaymentStatus.ESCROWED:
      return 'border-blue-400/60 bg-blue-400/20 text-blue-200';
    case PaymentStatus.PENDING:
      return 'border-amber-300/60 bg-amber-300/20 text-amber-100';
    case PaymentStatus.FAILED:
      return 'border-rose-400/60 bg-rose-400/20 text-rose-200';
    case PaymentStatus.REFUNDED:
      return 'border-purple-400/60 bg-purple-400/20 text-purple-200';
    default:
      return 'border-[#3b2e6f] bg-[#1b1631] text-[#9b7bff]';
  }
}

function formatPaymentStatus(status: PaymentStatus | null | undefined): string {
  if (!status) return 'Pending';
  // Handle all payment statuses
  const statusMap: Record<PaymentStatus, string> = {
    [PaymentStatus.PENDING]: 'Pending',
    [PaymentStatus.ESCROWED]: 'Escrowed',
    [PaymentStatus.PAID]: 'Paid',
    [PaymentStatus.FAILED]: 'Failed',
    [PaymentStatus.REFUNDED]: 'Refunded'
  };
  return statusMap[status] || status.charAt(0) + status.slice(1).toLowerCase();
}

export function DeliveryTable({ deliveries, initialStatusFilter = 'all' }: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDriver, setSelectedDriver] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>(initialStatusFilter);
  const [sortBy, setSortBy] = useState<'date' | 'orderId' | 'status'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Sync selectedStatus when initialStatusFilter changes
  useEffect(() => {
    setSelectedStatus(initialStatusFilter);
  }, [initialStatusFilter]);

  const uniqueDrivers = useMemo(
    () => Array.from(new Set(deliveries.map((d) => d.driverId))).sort(),
    [deliveries]
  );

  const filteredDeliveries = useMemo(() => {
    let filtered = [...deliveries];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (d) =>
          d.orderId.toLowerCase().includes(query) ||
          d.driverId.toLowerCase().includes(query) ||
          d.recipientName.toLowerCase().includes(query) ||
          d.deliveryAddress.toLowerCase().includes(query) ||
          (d.notes && d.notes.toLowerCase().includes(query))
      );
    }

    // Driver filter
    if (selectedDriver !== 'all') {
      filtered = filtered.filter((d) => d.driverId === selectedDriver);
    }

    // Status filter
    if (selectedStatus !== 'all') {
      filtered = filtered.filter((d) => d.status === selectedStatus);
    }

    // Sorting
    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'date':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case 'orderId':
          comparison = a.orderId.localeCompare(b.orderId);
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [deliveries, searchQuery, selectedDriver, selectedStatus, sortBy, sortOrder]);

  return (
    <>
      <div className="border-b border-[#2e2458] px-6 py-4">
        <div className="flex flex-col gap-4 sm:flex-row">
          {/* Search */}
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search by order ID, driver, recipient, address, or notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-[#2f2862] bg-[#0a0815] px-4 py-2 text-sm text-white placeholder:text-slate-500 focus:border-[#7aa7ff] focus:outline-none focus:ring-1 focus:ring-[#7aa7ff]"
            />
          </div>

          {/* Driver Filter */}
          <div className="relative">
            <select
              value={selectedDriver}
              onChange={(e) => setSelectedDriver(e.target.value)}
              aria-label="Filter by driver"
              className="w-full appearance-none rounded-lg border border-[#2f2862] bg-[#0a0815] pl-4 pr-10 py-2 text-sm text-white focus:border-[#7aa7ff] focus:outline-none focus:ring-1 focus:ring-[#7aa7ff]"
            >
              <option value="all">All Drivers</option>
              {uniqueDrivers.map((driver) => (
                <option key={driver} value={driver}>
                  {driver}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>

          {/* Status Filter */}
          <div className="relative">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              aria-label="Filter by status"
              className="w-full appearance-none rounded-lg border border-[#2f2862] bg-[#0a0815] pl-4 pr-10 py-2 text-sm text-white focus:border-[#7aa7ff] focus:outline-none focus:ring-1 focus:ring-[#7aa7ff]"
            >
              <option value="all">All Statuses</option>
              <option value={DeliveryStatus.PENDING}>Pending</option>
              <option value={DeliveryStatus.IN_TRANSIT}>In Transit</option>
              <option value={DeliveryStatus.DELIVERED}>Delivered</option>
              <option value={DeliveryStatus.FAILED}>Failed</option>
              <option value={DeliveryStatus.DISPUTED}>Disputed</option>
            </select>
            <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>

          {/* Sort By */}
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'date' | 'orderId' | 'status')}
              aria-label="Sort deliveries"
              className="w-full appearance-none rounded-lg border border-[#2f2862] bg-[#0a0815] pl-4 pr-10 py-2 text-sm text-white focus:border-[#7aa7ff] focus:outline-none focus:ring-1 focus:ring-[#7aa7ff]"
            >
              <option value="date">Sort by Date</option>
              <option value="orderId">Sort by Order ID</option>
              <option value="status">Sort by Status</option>
            </select>
            <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>

          {/* Sort Order */}
          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="rounded-lg border border-[#2f2862] bg-[#0a0815] px-4 py-2 text-sm text-white transition hover:border-[#7aa7ff] focus:outline-none focus:ring-1 focus:ring-[#7aa7ff]"
            title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
          >
            {sortOrder === 'asc' ? '↑' : '↓'}
          </button>
        </div>
        <div className="mt-3 text-xs text-slate-400">
          Showing {filteredDeliveries.length} of {deliveries.length} deliveries
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-[#2a234d] text-sm">
          <thead className="bg-[#141124]/60 text-left text-xs font-semibold uppercase tracking-wide text-[#8ea8ff]">
            <tr>
              <th className="px-6 py-3">Order</th>
              <th className="px-6 py-3">Driver</th>
              <th className="px-6 py-3">Recipient</th>
              <th className="px-6 py-3">Address</th>
              <th className="px-6 py-3 whitespace-nowrap">Status</th>
              <th className="px-6 py-3 whitespace-nowrap">Payment</th>
              <th className="px-6 py-3">Verified</th>
              <th className="px-6 py-3 text-right whitespace-nowrap">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1f1a36] text-slate-200">
            {filteredDeliveries.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-10 text-center text-slate-400">
                  No deliveries match your filters. Try adjusting your search criteria.
                </td>
              </tr>
            ) : (
              filteredDeliveries.map((delivery) => (
                <tr key={delivery.id} className="hover:bg-[#19162b]/70 transition">
                  <td className="px-6 py-4 font-medium text-white">{delivery.orderId}</td>
                  <td className="px-6 py-4 text-sm text-slate-300">{delivery.driverId}</td>
                  <td className="px-6 py-4 text-sm text-slate-300">{delivery.recipientName}</td>
                  <td className="px-6 py-4 text-sm text-slate-400 max-w-xs truncate">
                    {delivery.deliveryAddress}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-block rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide border ${getStatusColor(delivery.status)}`}
                    >
                      {formatStatus(delivery.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {delivery.requiresPaymentOnDelivery || delivery.paymentStatus ? (
                      <span
                        className={`inline-block rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide border ${getPaymentStatusColor(delivery.paymentStatus || PaymentStatus.PENDING)}`}
                        title={
                          delivery.paymentAmount && delivery.paymentCurrency
                            ? `${delivery.paymentAmount} ${delivery.paymentCurrency}`
                            : delivery.requiresPaymentOnDelivery
                            ? 'Payment required on delivery'
                            : undefined
                        }
                      >
                        {formatPaymentStatus(delivery.paymentStatus || PaymentStatus.PENDING)}
                      </span>
                    ) : (
                      <span className="text-slate-500">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-300">
                    {delivery.verifiedAt ? (
                      delivery.proofHash ? (
                        <Link
                          href={`/verify/${delivery.proofHash}`}
                          className="text-sm font-semibold text-[#7aa7ff] transition hover:text-[#9b7bff]"
                        >
                          <time dateTime={delivery.verifiedAt}>
                            {new Date(delivery.verifiedAt).toLocaleDateString()}
                          </time>
                        </Link>
                      ) : (
                        <time dateTime={delivery.verifiedAt}>
                          {new Date(delivery.verifiedAt).toLocaleDateString()}
                        </time>
                      )
                    ) : (
                      <span className="text-slate-500">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right whitespace-nowrap">
                    <Link
                      className="inline-block text-sm font-semibold text-[#7aa7ff] transition hover:text-[#9b7bff]"
                      href={
                        delivery.proofHash && delivery.verifiedAt
                          ? `/verify/${delivery.proofHash}`
                          : `/delivery/${delivery.id}`
                      }
                    >
                      View Details →
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

