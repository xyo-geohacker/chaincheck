'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';

type PaymentStatus = 'PENDING' | 'ESCROWED' | 'PAID' | 'FAILED' | 'REFUNDED';

interface PaymentEscrowData {
  requiresPaymentOnDelivery?: boolean;
  paymentCurrency?: string | null;
  buyerWalletAddress?: string | null;
  sellerWalletAddress?: string | null;
  paymentAmount?: number | null;
  paymentStatus?: PaymentStatus | null;
  paymentTransactionHash?: string | null;
  paymentBlockNumber?: number | null;
  paymentError?: string | null;
  escrowContractAddress?: string | null;
  escrowDepositTxHash?: string | null;
  escrowDepositBlock?: number | null;
  escrowReleaseTxHash?: string | null;
  escrowReleaseBlock?: number | null;
  escrowRefundTxHash?: string | null;
  escrowRefundBlock?: number | null;
  escrowStatus?: {
    buyer: string;
    seller: string;
    amount: string;
    released: boolean;
    refunded: boolean;
    createdAt: number;
    releaseDeadline: number;
  } | null;
}

interface PaymentEscrowPanelProps {
  deliveryId: string;
  paymentData?: PaymentEscrowData;
}

function getPaymentStatusColor(status: PaymentStatus | null | undefined): string {
  switch (status) {
    case 'PAID':
      return 'border-emerald-400/60 bg-emerald-400/20 text-emerald-200';
    case 'ESCROWED':
      return 'border-blue-400/60 bg-blue-400/20 text-blue-200';
    case 'PENDING':
      return 'border-amber-300/60 bg-amber-300/20 text-amber-100';
    case 'FAILED':
      return 'border-rose-400/60 bg-rose-400/20 text-rose-200';
    case 'REFUNDED':
      return 'border-purple-400/60 bg-purple-400/20 text-purple-200';
    default:
      return 'border-[#3b2e6f] bg-[#1b1631] text-[#9b7bff]';
  }
}

function formatPaymentStatus(status: PaymentStatus | null | undefined): string {
  if (!status) return 'Not Set';
  return status.charAt(0) + status.slice(1).toLowerCase();
}

function getEtherscanUrl(txHash: string | null | undefined, network: 'sepolia' | 'mainnet' = 'sepolia'): string | null {
  if (!txHash) return null;
  const baseUrl = network === 'sepolia' 
    ? 'https://sepolia.etherscan.io'
    : 'https://etherscan.io';
  return `${baseUrl}/tx/${txHash}`;
}

function formatAddress(address: string | null | undefined): string {
  if (!address) return 'N/A';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatAmount(amount: number | null | undefined, currency: string | null | undefined): string {
  if (amount === null || amount === undefined) return 'N/A';
  if (currency === 'ETH') {
    return `${amount.toFixed(6)} ETH`;
  }
  return `${amount} ${currency || ''}`;
}

export function PaymentEscrowPanel({ deliveryId, paymentData }: PaymentEscrowPanelProps) {
  const [data, setData] = useState<PaymentEscrowData | null>(paymentData || null);
  const [isLoading, setIsLoading] = useState(!paymentData);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (paymentData) {
      setData(paymentData);
      setIsLoading(false);
      return;
    }

    // Fetch payment data if not provided
    const fetchPaymentData = async () => {
      try {
        setIsLoading(true);
        const token = localStorage.getItem('token');
        const apiUrl = typeof window !== 'undefined' && window.location.protocol === 'https:'
          ? ''
          : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000');
        
        const response = await fetch(`${apiUrl}/api/deliveries/${deliveryId}/payment`, {
          headers: token ? {
            'Authorization': `Bearer ${token}`
          } : {}
        });

        if (!response.ok) {
          throw new Error('Failed to fetch payment data');
        }

        const paymentInfo = await response.json();
        setData(paymentInfo);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load payment data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPaymentData();
  }, [deliveryId, paymentData]);

  if (isLoading) {
    return (
      <div className="glass-card rounded-3xl border border-[#2f2862] px-6 py-6 text-slate-100">
        <h2 className="text-lg font-semibold mb-4">Payment & Escrow</h2>
        <div className="text-sm text-slate-400">Loading payment information...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-card rounded-3xl border border-[#2f2862] px-6 py-6 text-slate-100">
        <h2 className="text-lg font-semibold mb-4">Payment & Escrow</h2>
        <div className="text-sm text-rose-400">Error: {error}</div>
      </div>
    );
  }

  if (!data || !data.requiresPaymentOnDelivery) {
    return (
      <div className="glass-card rounded-3xl border border-[#2f2862] px-6 py-6 text-slate-100">
        <h2 className="text-lg font-semibold mb-4">Payment & Escrow</h2>
        <div className="text-sm text-slate-400">No payment required for this delivery</div>
      </div>
    );
  }

  const isEscrow = Boolean(data.escrowContractAddress);
  const network = 'sepolia'; // Could be determined from env or data

  return (
    <div className="glass-card rounded-3xl border border-[#2f2862] px-6 py-6 text-slate-100">
      <h2 className="text-lg font-semibold mb-4">Payment & Escrow</h2>
      
      <dl className="mt-4 grid gap-4">
        {/* Payment Status */}
        <div>
          <dt className="text-xs uppercase tracking-[0.25em] text-[#8ea8ff]">Payment Status</dt>
          <dd className="mt-1">
            <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide border ${getPaymentStatusColor(data.paymentStatus)}`}>
              {formatPaymentStatus(data.paymentStatus)}
            </span>
          </dd>
        </div>

        {/* Payment Amount & Currency */}
        {(data.paymentAmount !== null && data.paymentAmount !== undefined) && (
          <div>
            <dt className="text-xs uppercase tracking-[0.25em] text-[#8ea8ff]">Amount</dt>
            <dd className="mt-1 text-sm font-medium text-white">
              {formatAmount(data.paymentAmount, data.paymentCurrency)}
            </dd>
          </div>
        )}

        {/* Payment Currency */}
        {data.paymentCurrency && (
          <div>
            <dt className="text-xs uppercase tracking-[0.25em] text-[#8ea8ff]">Currency</dt>
            <dd className="mt-1 text-sm font-medium text-white">{data.paymentCurrency}</dd>
          </div>
        )}

        {/* Buyer Wallet */}
        {data.buyerWalletAddress && (
          <div>
            <dt className="text-xs uppercase tracking-[0.25em] text-[#8ea8ff]">Buyer Wallet</dt>
            <dd className="mt-1 text-sm font-medium text-white font-mono">
              {formatAddress(data.buyerWalletAddress)}
            </dd>
          </div>
        )}

        {/* Seller Wallet */}
        {data.sellerWalletAddress && (
          <div>
            <dt className="text-xs uppercase tracking-[0.25em] text-[#8ea8ff]">Seller Wallet</dt>
            <dd className="mt-1 text-sm font-medium text-white font-mono">
              {formatAddress(data.sellerWalletAddress)}
            </dd>
          </div>
        )}

        {/* Escrow Contract Address */}
        {isEscrow && data.escrowContractAddress && (
          <div>
            <dt className="text-xs uppercase tracking-[0.25em] text-[#8ea8ff]">Escrow Contract</dt>
            <dd className="mt-1">
              <Link
                href={getEtherscanUrl(data.escrowContractAddress, network) || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-[#8ea8ff] hover:text-[#9b7bff] font-mono break-all"
              >
                {formatAddress(data.escrowContractAddress)}
                <svg className="inline-block ml-1 w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </Link>
            </dd>
          </div>
        )}

        {/* Escrow Deposit Transaction */}
        {isEscrow && data.escrowDepositTxHash && (
          <div>
            <dt className="text-xs uppercase tracking-[0.25em] text-[#8ea8ff]">Deposit Transaction</dt>
            <dd className="mt-1">
              <Link
                href={getEtherscanUrl(data.escrowDepositTxHash, network) || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-[#8ea8ff] hover:text-[#9b7bff] font-mono break-all"
              >
                {formatAddress(data.escrowDepositTxHash)}
                <svg className="inline-block ml-1 w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </Link>
              {data.escrowDepositBlock && (
                <span className="ml-2 text-xs text-slate-400">Block: {data.escrowDepositBlock.toLocaleString()}</span>
              )}
            </dd>
          </div>
        )}

        {/* Escrow Release Transaction */}
        {isEscrow && data.escrowReleaseTxHash && (
          <div>
            <dt className="text-xs uppercase tracking-[0.25em] text-[#8ea8ff]">Release Transaction</dt>
            <dd className="mt-1">
              <Link
                href={getEtherscanUrl(data.escrowReleaseTxHash, network) || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-[#8ea8ff] hover:text-[#9b7bff] font-mono break-all"
              >
                {formatAddress(data.escrowReleaseTxHash)}
                <svg className="inline-block ml-1 w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </Link>
              {data.escrowReleaseBlock && (
                <span className="ml-2 text-xs text-slate-400">Block: {data.escrowReleaseBlock.toLocaleString()}</span>
              )}
            </dd>
          </div>
        )}

        {/* Escrow Refund Transaction */}
        {isEscrow && data.escrowRefundTxHash && (
          <div>
            <dt className="text-xs uppercase tracking-[0.25em] text-[#8ea8ff]">Refund Transaction</dt>
            <dd className="mt-1">
              <Link
                href={getEtherscanUrl(data.escrowRefundTxHash, network) || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-[#8ea8ff] hover:text-[#9b7bff] font-mono break-all"
              >
                {formatAddress(data.escrowRefundTxHash)}
                <svg className="inline-block ml-1 w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </Link>
              {data.escrowRefundBlock && (
                <span className="ml-2 text-xs text-slate-400">Block: {data.escrowRefundBlock.toLocaleString()}</span>
              )}
            </dd>
          </div>
        )}

        {/* Direct Payment Transaction (non-escrow) */}
        {!isEscrow && data.paymentTransactionHash && (
          <div>
            <dt className="text-xs uppercase tracking-[0.25em] text-[#8ea8ff]">Payment Transaction</dt>
            <dd className="mt-1">
              <Link
                href={getEtherscanUrl(data.paymentTransactionHash, network) || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-[#8ea8ff] hover:text-[#9b7bff] font-mono break-all"
              >
                {formatAddress(data.paymentTransactionHash)}
                <svg className="inline-block ml-1 w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </Link>
              {data.paymentBlockNumber && (
                <span className="ml-2 text-xs text-slate-400">Block: {data.paymentBlockNumber.toLocaleString()}</span>
              )}
            </dd>
          </div>
        )}

        {/* Payment Error */}
        {data.paymentError && (
          <div>
            <dt className="text-xs uppercase tracking-[0.25em] text-rose-400">Payment Error</dt>
            <dd className="mt-1 text-sm font-medium text-rose-300">{data.paymentError}</dd>
          </div>
        )}

        {/* On-Chain Escrow Status */}
        {isEscrow && data.escrowStatus && (
          <div className="mt-4 pt-4 border-t border-[#2f2862]">
            <dt className="text-xs uppercase tracking-[0.25em] text-[#8ea8ff] mb-2">On-Chain Escrow Status</dt>
            <dd className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">Released:</span>
                <span className={data.escrowStatus.released ? 'text-emerald-400' : 'text-slate-400'}>
                  {data.escrowStatus.released ? 'Yes' : 'No'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Refunded:</span>
                <span className={data.escrowStatus.refunded ? 'text-purple-400' : 'text-slate-400'}>
                  {data.escrowStatus.refunded ? 'Yes' : 'No'}
                </span>
              </div>
              {data.escrowStatus.releaseDeadline && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Auto-Refund Deadline:</span>
                  <span className="text-slate-300">
                    {new Date(data.escrowStatus.releaseDeadline * 1000).toLocaleDateString()}
                  </span>
                </div>
              )}
            </dd>
          </div>
        )}
      </dl>
    </div>
  );
}

