import Image from "next/image";
import Link from "next/link";

import type { DeliveryRecord } from "@shared/types/delivery.types";
import { DeliveryStatus } from "@shared/types/delivery.types";
import { fetchDeliveries } from "@lib/api";
import { DashboardContent } from "@components/DashboardContent";

export default async function DashboardPage() {
  let deliveries: DeliveryRecord[] = [];
  try {
    deliveries = await fetchDeliveries();
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Failed to load deliveries", error);
  }

  // Calculate statistics
  const totalDeliveries = deliveries.length;
  const verifiedProofs = deliveries.filter(
    (d) => d.status === DeliveryStatus.DELIVERED
  ).length;
  const inTransit = deliveries.filter(
    (d) => d.status === DeliveryStatus.IN_TRANSIT
  ).length;
  const pending = deliveries.filter(
    (d) => d.status === DeliveryStatus.PENDING
  ).length;
  const failed = deliveries.filter(
    (d) => d.status === DeliveryStatus.FAILED
  ).length;
  const disputed = deliveries.filter(
    (d) => d.status === DeliveryStatus.DISPUTED
  ).length;

  // Get unique drivers for filter
  const uniqueDrivers = Array.from(
    new Set(deliveries.map((d) => d.driverId))
  ).sort();

  // Calculate verification rate
  const verificationRate =
    totalDeliveries > 0
      ? ((verifiedProofs / totalDeliveries) * 100).toFixed(1)
      : "0.0";

  const metrics = [
    {
      label: "Total Deliveries",
      value: totalDeliveries,
      description: "All time",
      statusFilter: "all" as const,
    },
    {
      label: "Verified Proofs",
      value: verifiedProofs,
      description: `${verificationRate}% verification rate`,
      statusFilter: DeliveryStatus.DELIVERED,
    },
    {
      label: "In Transit",
      value: inTransit,
      description: "Active deliveries",
      statusFilter: DeliveryStatus.IN_TRANSIT,
    },
    {
      label: "Pending",
      value: pending,
      description: "Awaiting pickup",
      statusFilter: DeliveryStatus.PENDING,
    },
    {
      label: "Failed",
      value: failed,
      description: "Delivery attempts",
      statusFilter: DeliveryStatus.FAILED,
    },
    {
      label: "Disputes",
      value: disputed,
      description: "Requires attention",
      statusFilter: DeliveryStatus.DISPUTED,
    },
  ];

  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-10 px-6 py-12 text-slate-100">
      {/* External Resources - Subtle top utility bar */}
      <div className="flex items-center justify-center gap-4 flex-wrap">
        <Link
          href="https://coinapp.co/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-slate-400 hover:text-[#8ea8ff] transition-colors flex items-center gap-1.5"
        >
          <Image
            src="/images/coin-logo-color.png"
            alt="COIN App"
            width={24}
            height={24}
            className="w-13.5 h-13.5 object-contain opacity-70"
          />
          <span>Drivers - Earn Rewards</span>
          <svg
            className="w-3 h-3 opacity-60"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
            />
          </svg>
        </Link>
        <span className="text-slate-600">•</span>
        <Link
          href="https://docs.xyo.network/developers/xl1-wallet/get-xl1-browser-wallet"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-slate-400 hover:text-[#8ea8ff] transition-colors flex items-center gap-1.5"
        >
          <Image
            src="/images/xl1-logo-color.png"
            alt="XL1 Wallet"
            width={24}
            height={24}
            className="w-13.5 h-13.5 object-contain opacity-70"
          />
          <span>XL1 Wallet Setup</span>
          <svg
            className="w-3 h-3 opacity-60"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
            />
          </svg>
        </Link>
      </div>

      <header className="glass-card relative overflow-hidden rounded-3xl p-10">
        <div className="absolute inset-0 bg-gradient-to-br from-[#6d4afe]/30 via-transparent to-[#40baf7]/20" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <Link
              href="https://xyo.network"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-opacity hover:opacity-80"
            >
              <Image
                src="/images/chaincheck-powered-text.png"
                alt="ChainCheck"
                width={360}
                height={48}
                priority
              />
            </Link>
            {/* <p className="text-sm uppercase tracking-[0.2em] text-[#8ea8ff]">ChainCheck Intelligence</p> */}
            <h1 className="mt-0 text-4xl font-semibold leading-tight">
              Real-Time Delivery Verification
            </h1>
            <p className="mt-4 max-w-2xl text-sm text-slate-300">
              Track proof-of-location events, audit delivery outcomes, and
              surface network-backed assurance for every order. Filter, search,
              and analyze delivery data in real-time.
            </p>
            {/* <div className="mt-6 flex items-center gap-3">
              <span className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                Powered by
              </span>
              <Link
                href="https://xyo.network"
                target="_blank"
                rel="noopener noreferrer"
                className="transition-opacity hover:opacity-80"
              >
                <Image
                  src="/images/xyo-network-logo-color.png"
                  alt="XYO Network"
                  width={140}
                  height={32}
                  priority
                  className="h-8 w-auto object-contain"
                />
              </Link>
            </div> */}
          </div>

          <div className="flex flex-col gap-3">
            <Link
              href="/wallet-generator"
              className="rounded-2xl bg-[#100e1d]/60 px-6 py-4 text-sm font-semibold text-white hover:bg-[#100e1d]/80 transition-colors text-center shadow-lg shadow-black/40 flex items-center justify-center gap-2"
            >
              {/*<Image
                src="/images/xl1-logo-color.png"
                alt="XL1 Wallet"
                width={18}
                height={18}
                className="w-4.5 h-4.5 object-contain"
              />*/}
              <span>Generate XL1 Wallet Seed</span>
            </Link>
            <Link
              href="/network"
              className="rounded-2xl bg-[#100e1d]/60 px-6 py-4 text-sm font-semibold text-white hover:bg-[#100e1d]/80 transition-colors text-center shadow-lg shadow-black/40"
            >
              XYO Network Overview →
            </Link>
            <Link
              href="/configuration/login"
              className="rounded-2xl bg-[#100e1d]/60 px-6 py-4 text-sm font-semibold text-white hover:bg-[#100e1d]/80 transition-colors text-center shadow-lg shadow-black/40"
            >
              ChainCheck Configuration →
            </Link>
            <Link
              href="/roi"
              className="rounded-2xl bg-[#100e1d]/60 px-6 py-4 text-sm font-semibold text-white hover:bg-[#100e1d]/80 transition-colors text-center shadow-lg shadow-black/40"
            >
              ROI Dashboard →
            </Link>
          </div>
        </div>
      </header>

      <DashboardContent deliveries={deliveries} metrics={metrics} />
    </main>
  );
}
