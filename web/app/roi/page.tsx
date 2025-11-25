import Link from 'next/link';
import { ROIDashboard } from '@components/ROIDashboard';

export default function ROIPage() {
  return (
    <main className="min-h-screen p-6 lg:p-12">
      <div className="mx-auto max-w-[100rem]">
        <Link
          href="/"
          className="rounded-lg border border-[#2f2862] bg-white/5 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10 transition-colors inline-block mb-8"
        >
          ← Back to Dashboard
        </Link>

        <ROIDashboard />
      </div>
    </main>
  );
}

