'use client';

import { useEffect, useState, useRef } from 'react';
import Map, { Marker, Popup } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { fetchWitnessNodes, type WitnessNodeDetails } from '@lib/api';

type Props = {
  filters?: {
    type?: 'sentinel' | 'bridge' | 'diviner';
    status?: 'active' | 'inactive';
  };
  isMocked?: boolean;
};

export function WitnessNodeMap({ filters, isMocked }: Props) {
  const [nodes, setNodes] = useState<WitnessNodeDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<WitnessNodeDetails | null>(null);
  const [viewport, setViewport] = useState({
    latitude: 37.7749,
    longitude: -122.4194,
    zoom: 2
  });

  useEffect(() => {
    async function loadNodes() {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchWitnessNodes(filters);
        setNodes(data);
        
        // Center map on nodes if we have any
        if (data.length > 0) {
          const avgLat = data.reduce((sum, n) => sum + (n.location?.latitude ?? 0), 0) / data.length;
          const avgLon = data.reduce((sum, n) => sum + (n.location?.longitude ?? 0), 0) / data.length;
          setViewport(prev => ({
            ...prev,
            latitude: avgLat,
            longitude: avgLon,
            zoom: 3
          }));
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load witness nodes');
      } finally {
        setLoading(false);
      }
    }

    loadNodes();
  }, [filters]);

  const getNodeColor = (type?: string) => {
    switch (type) {
      case 'sentinel':
        return '#60a5fa'; // blue
      case 'bridge':
        return '#a78bfa'; // purple
      case 'diviner':
        return '#22d3ee'; // cyan
      default:
        return '#94a3b8'; // gray
    }
  };

  const getNodeIcon = (type?: string) => {
    switch (type) {
      case 'sentinel':
        return '📍';
      case 'bridge':
        return '🔗';
      case 'diviner':
        return '🔮';
      default:
        return '⚪';
    }
  };

  if (loading) {
    return (
      <div className="glass-card rounded-3xl border border-[#2f2862] px-8 py-8 text-slate-100">
        <div className="flex items-center justify-between gap-4 mb-6">
          <h2 className="text-lg font-semibold text-white">Witness Node Map</h2>
          {isMocked && (
            <span className="rounded-full bg-amber-500/20 border border-amber-500/40 px-3 py-1 text-xs font-semibold text-amber-200" title="Mock data for development">
              🧪 Mock
            </span>
          )}
        </div>
        <div className="h-96 flex items-center justify-center">
          <div className="text-sm text-slate-400">Loading nodes...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-card rounded-3xl border border-[#2f2862] px-8 py-8 text-slate-100">
        <div className="flex items-center justify-between gap-4 mb-6">
          <h2 className="text-lg font-semibold text-white">Witness Node Map</h2>
          {isMocked && (
            <span className="rounded-full bg-amber-500/20 border border-amber-500/40 px-3 py-1 text-xs font-semibold text-amber-200" title="Mock data for development">
              🧪 Mock
            </span>
          )}
        </div>
        <div className="h-96 flex items-center justify-center">
          <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200">
            <p>{error}</p>
          </div>
        </div>
      </div>
    );
  }

  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

  return (
    <div className="glass-card rounded-3xl border border-[#2f2862] px-8 py-8 text-slate-100">
      <div className="flex items-center justify-between gap-4 mb-6">
        <h2 className="text-lg font-semibold text-white">Witness Node Map</h2>
        <div className="flex items-center gap-2 flex-shrink-0">
          {isMocked && (
            <span className="rounded-full bg-amber-500/20 border border-amber-500/40 px-3 py-1 text-xs font-semibold text-amber-200" title="Mock data for development">
              🧪 Mock
            </span>
          )}
          <span className="text-sm text-slate-400">{nodes.length} nodes</span>
        </div>
      </div>

      <div className="h-96 rounded-xl overflow-hidden border border-[#2f2862]">
        {mapboxToken ? (
          <Map
            {...viewport}
            onMove={(evt) => setViewport(evt.viewState)}
            mapboxAccessToken={mapboxToken}
            style={{ width: '100%', height: '100%' }}
            mapStyle="mapbox://styles/mapbox/dark-v11"
          >
            {nodes
              .filter(node => node.location?.latitude && node.location?.longitude)
              .map((node) => (
                <Marker
                  key={node.address}
                  latitude={node.location!.latitude}
                  longitude={node.location!.longitude}
                  anchor="bottom"
                >
                  <button
                    onClick={() => setSelectedNode(node)}
                    className="text-2xl cursor-pointer hover:scale-110 transition-transform"
                    style={{ filter: `drop-shadow(0 0 4px ${getNodeColor(node.type)})` }}
                  >
                    {getNodeIcon(node.type)}
                  </button>
                </Marker>
              ))}

            {selectedNode && selectedNode.location && (
              <Popup
                latitude={selectedNode.location.latitude}
                longitude={selectedNode.location.longitude}
                onClose={() => setSelectedNode(null)}
                closeButton={true}
                closeOnClick={false}
                className="w-64"
              >
                <div className="text-slate-900 p-2">
                  <div className="font-semibold mb-2">
                    {selectedNode.type ? selectedNode.type.charAt(0).toUpperCase() + selectedNode.type.slice(1) : 'Unknown'} Node
                  </div>
                  <div className="text-xs space-y-1">
                    <div><span className="font-semibold">Address:</span> {selectedNode.address.substring(0, 10)}...</div>
                    <div><span className="font-semibold">Status:</span> {selectedNode.status}</div>
                    {selectedNode.reputation !== undefined && (
                      <div><span className="font-semibold">Reputation:</span> {selectedNode.reputation}/100</div>
                    )}
                    {selectedNode.participationHistory && (
                      <div>
                        <span className="font-semibold">Queries:</span> {selectedNode.participationHistory.totalQueries.toLocaleString()}
                      </div>
                    )}
                    {/* Show location source indicator */}
                    {selectedNode.metadata && typeof selectedNode.metadata === 'object' && 'locationSource' in selectedNode.metadata && (
                      <div className="mt-2 pt-2 border-t border-slate-300">
                        {selectedNode.metadata.locationSource === 'delivery' ? (
                          <>
                            <div className="text-xs text-emerald-600 font-semibold">
                              ✓ Real Location
                            </div>
                            <div className="text-xs text-slate-600 mt-1">
                              {selectedNode.metadata.locationNote || 'Location from actual delivery verification'}
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="text-xs text-amber-600 font-semibold">
                              ⚠️ Mock Location
                            </div>
                            <div className="text-xs text-slate-600 mt-1">
                              {selectedNode.metadata.locationNote || 'Location data requires Diviner access'}
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </Popup>
            )}
          </Map>
        ) : (
          <div className="h-full flex items-center justify-center bg-slate-900/50">
            <div className="text-center">
              <div className="text-sm text-slate-400 mb-2">Mapbox token not configured</div>
              <div className="text-xs text-slate-500">Set NEXT_PUBLIC_MAPBOX_TOKEN environment variable</div>
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-4 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-lg">📍</span>
          <span className="text-slate-400">Sentinel</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-lg">🔗</span>
          <span className="text-slate-400">Bridge</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-lg">🔮</span>
          <span className="text-slate-400">Diviner</span>
        </div>
      </div>
    </div>
  );
}

