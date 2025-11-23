'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  fetchConfiguration,
  initializeConfiguration,
  fetchServerStatus,
  isConfigAuthenticated,
  configLogout,
  type ConfigurationItem,
  type ServiceStatus
} from '@lib/api';

type ConfigurationCategory = 'backend' | 'web' | 'mobile' | 'xyo-services';

export default function ConfigurationPage() {
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState<ConfigurationCategory>('backend');
  const [configurations, setConfigurations] = useState<{
    backend: ConfigurationItem[];
    web: ConfigurationItem[];
    mobile: ConfigurationItem[];
  }>({
    backend: [],
    web: [],
    mobile: []
  });
  const [serverStatus, setServerStatus] = useState<{
    backend: ServiceStatus;
    web: ServiceStatus;
    mobile: ServiceStatus;
    archivist?: ServiceStatus;
    diviner?: ServiceStatus;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    // Check authentication on mount
    if (!isConfigAuthenticated()) {
      router.push('/configuration/login?redirect=/configuration');
      return;
    }

    loadConfiguration();
    loadServerStatus();
    // Refresh server status every 30 seconds (reduced frequency to avoid rate limiting)
    const interval = setInterval(loadServerStatus, 30000);
    return () => clearInterval(interval);
  }, [router]);

  const loadConfiguration = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await fetchConfiguration();
      if (result.success && result.configuration) {
        if ('category' in result) {
          // Single category response
          setConfigurations((prev) => ({
            ...prev,
            [result.category as ConfigurationCategory]: result.configuration as ConfigurationItem[]
          }));
        } else {
          // All categories response
          setConfigurations(result.configuration);
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load configuration';
      if (errorMessage.includes('Authentication required') || errorMessage.includes('401')) {
        setError('Authentication required. Please log in via the mobile app or API to access configuration.');
      } else {
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const loadServerStatus = async () => {
    try {
      const result = await fetchServerStatus();
      if (result.success) {
        setServerStatus(result.services);
      }
    } catch (err) {
      // Silently fail - server status is optional
      console.error('Failed to load server status:', err);
    }
  };

  const handleInitialize = async () => {
    try {
      setSaving(true);
      setError(null);
      await initializeConfiguration();
      await loadConfiguration();
      setSuccess('.env properties loaded and saved to Configuration database');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load .env properties');
    } finally {
      setSaving(false);
    }
  };


  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
        return 'bg-emerald-500';
      case 'stopped':
        return 'bg-rose-500';
      default:
        return 'bg-slate-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'running':
        return 'Running';
      case 'stopped':
        return 'Stopped';
      default:
        return 'Unknown';
    }
  };

  const currentConfig = configurations[activeCategory] || [];
  const currentStatus = activeCategory === 'xyo-services' ? null : serverStatus?.[activeCategory];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0818] via-[#1a1528] to-[#0f0d1a] text-white">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <Link
              href="/"
              className="inline-flex items-center text-sm font-semibold text-[#8ea8ff] hover:text-[#9b7bff] transition-colors"
            >
              ← Back to Dashboard
            </Link>
            <button
              onClick={() => {
                configLogout();
                router.push('/configuration/login');
              }}
              className="px-4 py-2 rounded-lg border border-[#2f2862] bg-white/5 text-sm font-semibold text-slate-300 hover:bg-white/10 transition-colors"
            >
              Logout
            </button>
          </div>
          <h1 className="text-4xl font-bold mb-2">Configuration</h1>
          <p className="text-slate-400">View backend, web, and mobile application settings</p>
        </div>

        {/* Status Messages */}
        {error && (
          <div className="mb-6 rounded-lg border border-rose-400/60 bg-rose-400/20 px-4 py-3 text-rose-200">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-6 rounded-lg border border-emerald-400/60 bg-emerald-400/20 px-4 py-3 text-emerald-200">
            {success}
          </div>
        )}

        {/* Category Tabs */}
        <div className="mb-6 flex gap-4 border-b border-[#2f2862]">
          {(['backend', 'web', 'mobile', 'xyo-services'] as ConfigurationCategory[]).map((category) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`px-6 py-3 font-semibold transition-colors border-b-2 ${
                activeCategory === category
                  ? 'border-[#7aa7ff] text-[#7aa7ff]'
                  : 'border-transparent text-slate-400 hover:text-slate-300'
              }`}
            >
              {category === 'xyo-services' ? 'XYO Services' : category.charAt(0).toUpperCase() + category.slice(1)}
            </button>
          ))}
        </div>

        {/* Server Status Panel */}
        {activeCategory === 'xyo-services' ? (
          <div className="mb-6 space-y-4">
            {serverStatus?.archivist && (
              <div className="glass-card rounded-3xl border border-[#2f2862] px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`h-3 w-3 rounded-full ${getStatusColor(serverStatus.archivist.status)}`} />
                    <div>
                      <p className="font-semibold">{serverStatus.archivist.name} Server</p>
                      <p className="text-sm text-slate-400">
                        Status: <span className="text-white">{getStatusText(serverStatus.archivist.status)}</span>
                        {serverStatus.archivist.port && (
                          <>
                            {' '}
                            • Port: <span className="text-white">{serverStatus.archivist.port}</span>
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    {serverStatus.archivist.url && (
                      <a
                        href={serverStatus.archivist.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm text-[#7aa7ff] hover:text-[#9b7bff] transition-colors"
                      >
                        {serverStatus.archivist.url} →
                      </a>
                    )}
                    {serverStatus.archivist.error && (
                      <p className="text-xs text-rose-400 mt-1">{serverStatus.archivist.error}</p>
                    )}
                  </div>
                </div>
              </div>
            )}
            {serverStatus?.diviner && (
              <div className="glass-card rounded-3xl border border-[#2f2862] px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`h-3 w-3 rounded-full ${getStatusColor(serverStatus.diviner.status)}`} />
                    <div>
                      <p className="font-semibold">{serverStatus.diviner.name} Server</p>
                      <p className="text-sm text-slate-400">
                        Status: <span className="text-white">{getStatusText(serverStatus.diviner.status)}</span>
                        {serverStatus.diviner.port && (
                          <>
                            {' '}
                            • Port: <span className="text-white">{serverStatus.diviner.port}</span>
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    {serverStatus.diviner.url && (
                      <a
                        href={serverStatus.diviner.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm text-[#7aa7ff] hover:text-[#9b7bff] transition-colors"
                      >
                        {serverStatus.diviner.url} →
                      </a>
                    )}
                    {serverStatus.diviner.error && (
                      <p className="text-xs text-rose-400 mt-1">{serverStatus.diviner.error}</p>
                    )}
                  </div>
                </div>
              </div>
            )}
            {!serverStatus?.archivist && !serverStatus?.diviner && (
              <div className="glass-card rounded-3xl border border-[#2f2862] px-6 py-4 text-center text-slate-400">
                XYO Services status will appear here once the backend is connected.
              </div>
            )}
          </div>
        ) : currentStatus ? (
          <div className="mb-6 glass-card rounded-3xl border border-[#2f2862] px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`h-3 w-3 rounded-full ${getStatusColor(currentStatus.status)}`} />
                <div>
                  <p className="font-semibold">{currentStatus.name} Server</p>
                  <p className="text-sm text-slate-400">
                    Status: <span className="text-white">{getStatusText(currentStatus.status)}</span>
                    {currentStatus.port && (
                      <>
                        {' '}
                        • Port: <span className="text-white">{currentStatus.port}</span>
                      </>
                    )}
                  </p>
                </div>
              </div>
              <div className="text-right">
                {currentStatus.url && (
                  <a
                    href={currentStatus.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm text-[#7aa7ff] hover:text-[#9b7bff] transition-colors"
                  >
                    {currentStatus.url} →
                  </a>
                )}
                {currentStatus.error && (
                  <p className="text-xs text-rose-400 mt-1">{currentStatus.error}</p>
                )}
              </div>
            </div>
          </div>
        ) : null}

        {/* Configuration Form */}
        {activeCategory !== 'xyo-services' && (
        <div className="glass-card rounded-3xl border border-[#2f2862] px-6 py-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">
              {activeCategory.charAt(0).toUpperCase() + activeCategory.slice(1)} Configuration
              <span className="ml-3 text-sm font-normal text-slate-400">(Read-only)</span>
            </h2>
            {(activeCategory === 'backend') && (
              <div className="flex flex-col items-end gap-2">
                <button
                  onClick={handleInitialize}
                  disabled={saving}
                  className="px-4 py-2 rounded-lg border border-[#2f2862] bg-white/5 text-sm font-semibold text-white hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Read .env file properties and save them to the Configuration database"
                >
                  Load from .env
                </button>
                <p className="text-xs text-slate-500 text-right">
                  &quot;Load from .env&quot; reads .env file properties and saves them to the Configuration database
                </p>
              </div>
            )}
          </div>

          {loading ? (
            <div className="text-center py-12 text-slate-400">Loading configuration...</div>
          ) : currentConfig.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              {activeCategory === 'backend' 
                ? 'No configuration found. Click "Load from .env" to read .env file properties and save them to the Configuration database.'
                : 'No configuration found.'}
            </div>
          ) : (
            <div className="space-y-4">
              {currentConfig.map((item) => (
                <div
                  key={item.key}
                  className="border border-[#2f2862] rounded-lg p-4 bg-white/5"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <label className="font-semibold text-white">{item.key}</label>
                        {item.isSecret && (
                          <span className="px-2 py-0.5 text-xs rounded bg-amber-400/20 text-amber-200 border border-amber-400/60">
                            Secret
                          </span>
                        )}
                      </div>
                      {item.description && (
                        <p className="text-sm text-slate-400 mb-2">{item.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="px-3 py-2 rounded border border-[#2f2862] bg-[#0a0818] text-slate-300 font-mono text-sm">
                    {item.isSecret && item.value ? '••••••••' : item.value || '(not set)'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        )}
        {activeCategory === 'xyo-services' && (
          <div className="glass-card rounded-3xl border border-[#2f2862] px-6 py-6">
            <h2 className="text-2xl font-bold mb-6">XYO Network Services</h2>
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-3 text-slate-300">Archivist</h3>
                <p className="text-sm text-slate-400 mb-4">
                  The Archivist stores bound witness data and payloads from XL1 transactions. 
                  It provides the foundation for location verification and proof storage.
                </p>
                {serverStatus?.archivist ? (
                  <div className="border border-[#2f2862] rounded-lg p-4 bg-white/5">
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`h-2 w-2 rounded-full ${getStatusColor(serverStatus.archivist.status)}`} />
                      <span className="font-semibold text-white">
                        {serverStatus.archivist.status === 'running' ? 'Connected' : 
                         serverStatus.archivist.status === 'stopped' ? 'Disconnected' : 'Unknown'}
                      </span>
                    </div>
                    <p className="text-sm text-slate-400">
                      URL: <span className="text-white font-mono">{serverStatus.archivist.url || 'Not configured'}</span>
                    </p>
                    {serverStatus.archivist.error && (
                      <p className="text-xs text-rose-400 mt-2">{serverStatus.archivist.error}</p>
                    )}
                  </div>
                ) : (
                  <div className="border border-[#2f2862] rounded-lg p-4 bg-white/5 text-slate-400 text-sm">
                    Archivist status not available
                  </div>
                )}
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-3 text-slate-300">Diviner</h3>
                <p className="text-sm text-slate-400 mb-4">
                  The Diviner queries location data from Archivists and provides consensus-based location verification. 
                  It processes location queries and returns divined answers based on network consensus.
                </p>
                {serverStatus?.diviner ? (
                  <div className="border border-[#2f2862] rounded-lg p-4 bg-white/5">
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`h-2 w-2 rounded-full ${getStatusColor(serverStatus.diviner.status)}`} />
                      <span className="font-semibold text-white">
                        {serverStatus.diviner.status === 'running' ? 'Connected' : 
                         serverStatus.diviner.status === 'stopped' ? 'Disconnected' : 'Unknown'}
                      </span>
                    </div>
                    <p className="text-sm text-slate-400">
                      URL: <span className="text-white font-mono">{serverStatus.diviner.url || 'Not configured'}</span>
                    </p>
                    {serverStatus.diviner.error && (
                      <p className="text-xs text-rose-400 mt-2">{serverStatus.diviner.error}</p>
                    )}
                  </div>
                ) : (
                  <div className="border border-[#2f2862] rounded-lg p-4 bg-white/5 text-slate-400 text-sm">
                    Diviner status not available
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

