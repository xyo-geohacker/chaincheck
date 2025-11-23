'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { configLogin } from '@lib/api';

export default function ConfigurationLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Check if user is already authenticated
    const token = localStorage.getItem('configToken');
    if (token) {
      // Redirect to configuration page
      const redirectTo = searchParams.get('redirect') || '/configuration';
      router.push(redirectTo);
    }
  }, [router, searchParams]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const trimmedUsername = username.trim();
    const trimmedPassword = password.trim();

    if (!trimmedUsername || !trimmedPassword) {
      setError('Username and password are required');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await configLogin(trimmedUsername, trimmedPassword);
      
      if (result.success && result.token) {
        // Store token in localStorage
        localStorage.setItem('configToken', result.token);
        if (result.username) {
          localStorage.setItem('configUsername', result.username);
        }
        
        // Redirect to configuration page
        const redirectTo = searchParams.get('redirect') || '/configuration';
        router.push(redirectTo);
      } else {
        setError(result.error || 'Login failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to authenticate');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0818] via-[#1a1528] to-[#0f0d1a] text-white flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="mb-8 text-center">
          <Link
            href="/"
            className="inline-flex items-center text-sm font-semibold text-[#8ea8ff] hover:text-[#9b7bff] transition-colors mb-4"
          >
            ← Back to Dashboard
          </Link>
          <h1 className="text-4xl font-bold mb-2">ChainCheck</h1>
          <h1 className="text-4xl font-bold mb-2">Configuration Access</h1>
          <p className="text-slate-400">Sign in to manage application settings</p>
        </div>

        {/* Login Form */}
        <div className="glass-card rounded-3xl border border-[#2f2862] px-8 py-8">
          {error && (
            <div className="mb-6 rounded-lg border border-rose-400/60 bg-rose-400/20 px-4 py-3 text-rose-200">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label htmlFor="username" className="block text-sm font-semibold text-slate-300 mb-2">
                Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={isLoading}
                className="w-full px-4 py-3 rounded-lg border border-[#2f2862] bg-[#0a0818] text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#7aa7ff] disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder="Enter your username"
                required
                autoFocus
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-slate-300 mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                className="w-full px-4 py-3 rounded-lg border border-[#2f2862] bg-[#0a0818] text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#7aa7ff] disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder="Enter your password"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full px-6 py-3 rounded-lg bg-gradient-to-r from-[#7aa7ff] to-[#9b7bff] text-white font-semibold hover:from-[#8bb7ff] hover:to-[#ab8bff] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#7aa7ff]/20"
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-[#2f2862]">
            <p className="text-xs text-slate-500 text-center">
              Use your configuration credentials to access configuration settings.
              <br />
              Default credentials: username: <span className="font-mono">admin</span>, password: <span className="font-mono">admin</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

