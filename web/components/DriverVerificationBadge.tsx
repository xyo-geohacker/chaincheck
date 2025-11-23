'use client';

import { useState } from 'react';
import Image from 'next/image';

type Props = {
  driverId: string;
};

export function DriverVerificationBadge({ driverId }: Props) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs font-semibold text-emerald-200 border border-emerald-500/30 hover:bg-emerald-500/30 transition-colors cursor-pointer"
        type="button"
      >
        <span>✓</span>
        <span>Verified</span>
      </button>

      {/* Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="glass-card rounded-3xl border border-[#2f2862] px-8 py-8 text-slate-100 max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setIsModalOpen(false)}
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

            {/* XYO SentinelX Image */}
            <div className="flex justify-center mb-6">
              <div className="relative w-48 h-32">
                <Image
                  src="/images/xyo-sentinelx-nfc.png"
                  alt="XYO SentinelX NFC Card"
                  fill
                  className="object-contain"
                  unoptimized
                />
              </div>
            </div>

            {/* Verification Text */}
            <div className="text-center space-y-4">
              <h3 className="text-xl font-semibold text-white">
                Driver Verification
              </h3>
              <p className="text-sm text-slate-300 leading-relaxed">
                Driver <span className="font-semibold text-white">{driverId}</span> has been verified by scanning their XYO SentinelX NFC card at the time of delivery, confirming their presence at the delivery location.
              </p>
              <p className="text-sm text-slate-300 leading-relaxed">
                Scanning an XYO SentinelX NFC card at the time of delivery is not required, but provides further assurance of physical presence at the time of delivery.
              </p>
            </div>

            {/* Close button at bottom */}
            <div className="mt-6 flex justify-center">
              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg border border-[#2f2862] bg-white/5 px-6 py-2 text-sm font-semibold text-white hover:bg-white/10 transition-colors"
                type="button"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

