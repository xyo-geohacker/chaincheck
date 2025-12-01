'use client';

import { useState } from 'react';
import Image from 'next/image';

type MnemonicResponse = {
  success: boolean;
  mnemonic?: string;
  address?: string;
  warning?: string;
  error?: string;
};

export default function WalletGeneratorPage() {
  const [mnemonic, setMnemonic] = useState<string>('');
  const [address, setAddress] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);
    setMnemonic('');
    setAddress('');
    setCopied(false);

    try {
      // Use relative URL when on HTTPS to avoid mixed content errors
      // Next.js rewrite will proxy to backend
      const apiUrl = typeof window !== 'undefined' && window.location.protocol === 'https:'
        ? '' // Relative URL - Next.js rewrite handles it
        : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000');
      const response = await fetch(`${apiUrl}/api/wallet/generate-mnemonic`);
      const data: MnemonicResponse = await response.json();

      if (data.success && data.mnemonic && data.address) {
        setMnemonic(data.mnemonic);
        setAddress(data.address);
      } else {
        setError(data.error || 'Failed to generate mnemonic');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate mnemonic');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    if (mnemonic) {
      navigator.clipboard.writeText(mnemonic);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCopyEnv = () => {
    if (mnemonic) {
      const envLine = `XYO_WALLET_MNEMONIC="${mnemonic}"`;
      navigator.clipboard.writeText(envLine);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-10 px-6 py-12 text-slate-100">
      <header className="glass-card relative overflow-hidden rounded-3xl p-10">
        <div className="absolute inset-0 bg-gradient-to-br from-[#6d4afe]/30 via-transparent to-[#40baf7]/20" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-[#8ea8ff]">XL1 Wallet Generator</p>
            <h1 className="mt-2 text-4xl font-semibold leading-tight">Generate Mnemonic Seed Phrase</h1>
            <p className="mt-4 max-w-2xl text-sm text-slate-300">
              Generate a secure 12-word mnemonic seed phrase for your XL1 blockchain wallet. 
              Keep this phrase secure - it provides full access to your wallet.
            </p>
          </div>
          <div className="flex items-center gap-3 rounded-2xl bg-[#100e1d]/60 px-6 py-4 shadow-lg shadow-black/40">
            <span className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Powered by</span>
            <Image
              src="/images/xyo-network-logo-color.png"
              alt="XYO Network"
              width={140}
              height={32}
              priority
              className="h-8 w-auto object-contain"
            />
          </div>
        </div>
      </header>

      <div className="glass-card rounded-3xl border border-[#2f2862] p-8">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white">Generate New Mnemonic</h2>
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="rounded-full border border-[#7aa7ff]/60 bg-[#7aa7ff]/20 px-6 py-2 text-sm font-semibold uppercase tracking-wide text-[#7aa7ff] transition hover:bg-[#7aa7ff]/30 hover:border-[#7aa7ff]/80 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isGenerating ? 'Generating...' : 'Generate Mnemonic'}
            </button>
          </div>

          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
              <p className="font-semibold">Error:</p>
              <p className="mt-1">{error}</p>
            </div>
          )}

          {mnemonic && (
            <div className="space-y-4">
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
                <p className="font-semibold">⚠️ Security Warning</p>
                <p className="mt-1">
                  Keep this mnemonic secure and never share it publicly! Anyone with access to this phrase 
                  has full control over your wallet. Store it in a safe place.
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs uppercase tracking-[0.25em] text-[#8ea8ff]">12-Word Mnemonic</label>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex-1 rounded-lg border border-[#2f2862] bg-[#07060e] p-4 font-mono text-sm text-[#8fa5ff]">
                      {mnemonic}
                    </div>
                    <button
                      onClick={handleCopy}
                      className="rounded-lg border border-[#2f2862] bg-[#1b1631] px-4 py-2 text-sm font-medium text-[#8fa5ff] transition hover:bg-[#2f2862]"
                    >
                      {copied ? '✓ Copied' : 'Copy'}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs uppercase tracking-[0.25em] text-[#8ea8ff]">Derived XL1 Address</label>
                  <div className="mt-2 rounded-lg border border-[#2f2862] bg-[#07060e] p-4 font-mono text-sm text-[#8fa5ff] break-all">
                    {address}
                  </div>
                </div>

                <div>
                  <label className="text-xs uppercase tracking-[0.25em] text-[#8ea8ff]">Environment Variable</label>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex-1 rounded-lg border border-[#2f2862] bg-[#07060e] p-4 font-mono text-xs text-[#8fa5ff]">
                      XYO_WALLET_MNEMONIC=&quot;{mnemonic}&quot;
                    </div>
                    <button
                      onClick={handleCopyEnv}
                      className="rounded-lg border border-[#2f2862] bg-[#1b1631] px-4 py-2 text-sm font-medium text-[#8fa5ff] transition hover:bg-[#2f2862]"
                    >
                      {copied ? '✓ Copied' : 'Copy'}
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-slate-400">
                    Add this line to your <code className="rounded bg-[#1b1631] px-1 py-0.5">backend/.env</code> file
                  </p>
                </div>
              </div>
            </div>
          )}

          {!mnemonic && !error && !isGenerating && (
            <div className="rounded-lg border border-[#2f2862] bg-[#07060e] p-6 text-center text-sm text-slate-400">
              Click &quot;Generate Mnemonic&quot; to create a new 12-word seed phrase
            </div>
          )}
        </div>
      </div>

      <div className="glass-card rounded-3xl border border-[#2f2862] p-6">
        <h3 className="text-lg font-semibold text-white mb-4">How to Use</h3>
        <ol className="list-decimal list-inside space-y-2 text-sm text-slate-300">
          <li>Click &quot;Generate Mnemonic&quot; to create a new 12-word seed phrase</li>
          <li>Copy the mnemonic and store it securely (password manager, encrypted file, etc.)</li>
          <li>Copy the environment variable line and add it to your <code className="rounded bg-[#1b1631] px-1 py-0.5">backend/.env</code> file</li>
          <li>Restart your backend server to use the new wallet</li>
          <li>The derived XL1 address will be used for all transactions</li>
        </ol>
      </div>
    </main>
  );
}

