/**
 * Service for retrieving XYO Network witness node information and network statistics
 * Handles node data retrieval and network health metrics
 * Extracts real data from XL1 transactions where possible, uses mock data for location-based metrics
 */

import type { WitnessNodeInfo } from '../../../../shared/types/xyo.types.js';
import { Prisma } from '@prisma/client';
import { env } from '../../lib/env.js';
import { prisma } from '../../lib/prisma.js';

export interface NetworkStatistics {
  totalNodes: number;
  activeNodes: number;
  nodeTypes: {
    sentinel: number;
    bridge: number;
    diviner: number;
  };
  coverageArea: {
    totalKm2: number;
    countries: number;
  };
  networkHealth: 'excellent' | 'good' | 'fair' | 'poor';
  lastUpdated: number;
  isMocked: boolean;
  // Delivery-related statistics from XL1 transactions
  deliveries?: {
    total: number;
    verified: number;
    uniqueDrivers: number;
    uniqueLocations: number;
  };
}

export interface WitnessNodeDetails extends WitnessNodeInfo {
  status: 'active' | 'inactive' | 'unknown';
  reputation?: number; // 0-100
  participationHistory?: {
    totalQueries: number;
    successfulQueries: number;
    lastSeen: number;
  };
  metadata?: Record<string, unknown>;
}

export class NetworkService {
  /**
   * Get witness node information by address
   * Returns node details including location, type, status, and participation history
   */
  async getWitnessNodeInfo(nodeAddress: string): Promise<WitnessNodeDetails> {
    try {
      // NOTE: Currently returns mock data. Actual XYO Network API integration
      // would require XYO Network API credentials and endpoint configuration.
      // This is a known limitation documented in the development guide.
      
      return this.createMockNodeInfo(nodeAddress);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error getting witness node info:', error);
      return this.createMockNodeInfo(nodeAddress);
    }
  }

  /**
   * Get network-wide statistics
   * Extracts real data from XL1 transactions (node counts, types)
   * Uses mock data for location-based metrics (coverage area, network health)
   */
  async getNetworkStatistics(): Promise<NetworkStatistics> {
    try {
      // eslint-disable-next-line no-console
      console.log('Getting network statistics from XL1 transactions');
      
      // Extract real data from XL1 transactions
      const xl1Stats = await this.extractNetworkStatisticsFromXL1();
      
      // If we have real data, use it; otherwise fall back to mock
      if (xl1Stats.totalNodes > 0 || (xl1Stats.deliveries && xl1Stats.deliveries.total > 0)) {
        // eslint-disable-next-line no-console
        console.log(`Extracted ${xl1Stats.totalNodes} unique nodes and ${xl1Stats.deliveries?.total ?? 0} deliveries from XL1 transactions`);
        
        // Calculate coverage from actual delivery locations
        const coverageArea = await this.calculateCoverageFromDeliveries();
        
        return {
          ...xl1Stats,
          coverageArea,
          networkHealth: this.calculateNetworkHealth(xl1Stats, xl1Stats.deliveries),
          isMocked: false // Node counts and delivery data are real
        };
      }
      
      // Fall back to mock data if no XL1 transactions found
      // eslint-disable-next-line no-console
      console.log('No XL1 transactions found, using mock statistics');
      return this.createMockNetworkStatistics();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error getting network statistics:', error);
      return this.createMockNetworkStatistics();
    }
  }

  /**
   * Get all witness nodes (with optional filtering)
   * Extracts real addresses and participation data from XL1 transactions
   * Uses deterministic mock locations for map visualization (clearly marked)
   */
  async getAllWitnessNodes(filters?: {
    type?: 'sentinel' | 'bridge' | 'diviner';
    status?: 'active' | 'inactive';
    minLat?: number;
    maxLat?: number;
    minLon?: number;
    maxLon?: number;
  }): Promise<WitnessNodeDetails[]> {
    try {
      // eslint-disable-next-line no-console
      console.log('Getting witness nodes from XL1 transactions with filters:', filters);
      
      // Extract real node data from XL1 transactions
      const xl1Nodes = await this.extractWitnessNodesFromXL1();
      
      if (xl1Nodes.length > 0) {
        // eslint-disable-next-line no-console
        console.log(`Extracted ${xl1Nodes.length} witness nodes from XL1 transactions`);
        
        // Apply filters
        let filteredNodes = xl1Nodes;
        if (filters) {
          filteredNodes = xl1Nodes.filter(node => {
            if (filters.type && node.type !== filters.type) return false;
            if (filters.status && node.status !== filters.status) return false;
            // Location filters apply to mock locations (deterministic but not real)
            if (filters.minLat !== undefined && (node.location?.latitude ?? 0) < filters.minLat) return false;
            if (filters.maxLat !== undefined && (node.location?.latitude ?? 0) > filters.maxLat) return false;
            if (filters.minLon !== undefined && (node.location?.longitude ?? 0) < filters.minLon) return false;
            if (filters.maxLon !== undefined && (node.location?.longitude ?? 0) > filters.maxLon) return false;
            return true;
          });
        }
        
        return filteredNodes;
      }
      
      // Fall back to mock data if no XL1 transactions found
      // eslint-disable-next-line no-console
      console.log('No XL1 transactions found, using mock node list');
      return this.createMockNodeList(filters);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error getting witness nodes:', error);
      return this.createMockNodeList(filters);
    }
  }

  /**
   * Create mock node information for development
   */
  private createMockNodeInfo(nodeAddress: string): WitnessNodeDetails {
    // Generate deterministic mock data based on address
    const hash = this.simpleHash(nodeAddress);
    const types: Array<'sentinel' | 'bridge' | 'diviner'> = ['sentinel', 'bridge', 'diviner'];
    const type = types[hash % types.length];
    
    // Generate mock location (spread across different regions)
    const latitude = 20 + (hash % 50) - 25; // -5 to 45
    const longitude = -120 + (hash % 100) - 50; // -170 to -70 (mostly US)
    
    return {
      address: nodeAddress,
      location: {
        latitude,
        longitude
      },
      type,
      verified: true,
      status: hash % 10 < 8 ? 'active' : 'inactive', // 80% active
      reputation: 60 + (hash % 40), // 60-100
      participationHistory: {
        totalQueries: 1000 + (hash % 5000),
        successfulQueries: 900 + (hash % 4500),
        lastSeen: Date.now() - (hash % 86400000) // Within last 24 hours
      },
      metadata: {
        region: this.getRegionFromLocation(latitude, longitude),
        version: '1.0.0'
      }
    };
  }

  /**
   * Create mock network statistics
   */
  private createMockNetworkStatistics(): NetworkStatistics {
    return {
      totalNodes: 1247,
      activeNodes: 1023,
      nodeTypes: {
        sentinel: 856,
        bridge: 234,
        diviner: 157
      },
      coverageArea: {
        totalKm2: 24500000, // ~24.5 million km² (roughly North America + Europe)
        countries: 47
      },
      networkHealth: 'good',
      lastUpdated: Date.now(),
      isMocked: true
    };
  }

  /**
   * Create mock list of witness nodes
   */
  private createMockNodeList(filters?: {
    type?: 'sentinel' | 'bridge' | 'diviner';
    status?: 'active' | 'inactive';
    minLat?: number;
    maxLat?: number;
    minLon?: number;
    maxLon?: number;
  }): WitnessNodeDetails[] {
    const nodes: WitnessNodeDetails[] = [];
    const count = 50; // Generate 50 mock nodes
    
    for (let i = 0; i < count; i++) {
      const address = `0x${i.toString(16).padStart(40, '0')}`;
      const node = this.createMockNodeInfo(address);
      
      // Apply filters
      if (filters) {
        if (filters.type && node.type !== filters.type) continue;
        if (filters.status && node.status !== filters.status) continue;
        if (filters.minLat !== undefined && (node.location?.latitude ?? 0) < filters.minLat) continue;
        if (filters.maxLat !== undefined && (node.location?.latitude ?? 0) > filters.maxLat) continue;
        if (filters.minLon !== undefined && (node.location?.longitude ?? 0) < filters.minLon) continue;
        if (filters.maxLon !== undefined && (node.location?.longitude ?? 0) > filters.maxLon) continue;
      }
      
      nodes.push(node);
    }
    
    return nodes;
  }

  /**
   * Simple hash function for deterministic mock data
   */
  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Get region name from coordinates
   */
  private getRegionFromLocation(lat: number, lon: number): string {
    if (lat >= 25 && lat <= 50 && lon >= -130 && lon <= -65) {
      return 'North America';
    } else if (lat >= 35 && lat <= 70 && lon >= -10 && lon <= 40) {
      return 'Europe';
    } else if (lat >= -40 && lat <= -10 && lon >= 110 && lon <= 155) {
      return 'Australia';
    } else if (lat >= 20 && lat <= 50 && lon >= 100 && lon <= 150) {
      return 'Asia';
    }
    return 'Other';
  }

  /**
   * Extract network statistics from XL1 transactions stored in database
   * Returns real node counts and types, delivery statistics, and location-based coverage
   */
  private async extractNetworkStatisticsFromXL1(): Promise<Omit<NetworkStatistics, 'coverageArea' | 'networkHealth' | 'isMocked'>> {
    try {
      // Get all deliveries with XL1 transactions (not mocked)
      // Include location data for coverage calculation
      const deliveries = await prisma.delivery.findMany({
        where: {
          boundWitnessData: {
            not: Prisma.JsonNull
          }
        },
        select: {
          boundWitnessData: true,
          verifiedAt: true,
          status: true,
          driverId: true,
          actualLat: true,
          actualLon: true,
          destinationLat: true,
          destinationLon: true
        }
      });

      const nodeMap = new Map<string, {
        address: string;
        type: 'sentinel' | 'bridge';
        firstSeen: number;
        lastSeen: number;
        transactionCount: number;
      }>();

      const RECENT_ACTIVITY_THRESHOLD = 7 * 24 * 60 * 60 * 1000; // 7 days
      const now = Date.now();

      // Extract addresses from bound witnesses
      for (const delivery of deliveries) {
        if (!delivery.boundWitnessData || typeof delivery.boundWitnessData !== 'object') {
          continue;
        }

        const bwData = delivery.boundWitnessData as Record<string, unknown>;
        
        // Check if this is a real XL1 transaction (not mocked)
        if (bwData.isMocked === true) {
          continue;
        }

        // Extract bound witness
        let boundWitness: unknown = null;
        if ('boundWitness' in bwData && bwData.boundWitness) {
          const bw = bwData.boundWitness;
          if (Array.isArray(bw) && bw.length > 0) {
            boundWitness = bw[0];
          } else if (typeof bw === 'object') {
            boundWitness = bw;
          }
        }

        if (!boundWitness || typeof boundWitness !== 'object') {
          continue;
        }

        const bw = boundWitness as Record<string, unknown>;
        
        // Extract addresses
        if ('addresses' in bw && Array.isArray(bw.addresses)) {
          const addresses = bw.addresses as string[];
          const timestamp = delivery.verifiedAt ? delivery.verifiedAt.getTime() : now;
          
          addresses.forEach((address, index) => {
            // First address is typically a bridge, others are sentinels
            const type: 'sentinel' | 'bridge' = index === 0 ? 'bridge' : 'sentinel';
            
            if (!nodeMap.has(address)) {
              nodeMap.set(address, {
                address,
                type,
                firstSeen: timestamp,
                lastSeen: timestamp,
                transactionCount: 1
              });
            } else {
              const node = nodeMap.get(address)!;
              node.transactionCount++;
              if (timestamp < node.firstSeen) node.firstSeen = timestamp;
              if (timestamp > node.lastSeen) node.lastSeen = timestamp;
            }
          });
        }
      }

      // Calculate node statistics
      const nodes = Array.from(nodeMap.values());
      const totalNodes = nodes.length;
      const activeNodes = nodes.filter(node => (now - node.lastSeen) < RECENT_ACTIVITY_THRESHOLD).length;
      
      const bridges = nodes.filter(node => node.type === 'bridge').length;
      const sentinels = nodes.filter(node => node.type === 'sentinel').length;
      // Diviners don't appear in bound witnesses (they query, not sign)
      const diviners = 0;

      // Calculate delivery statistics
      const realDeliveries = deliveries.filter(d => {
        if (!d.boundWitnessData || typeof d.boundWitnessData !== 'object') return false;
        const bwData = d.boundWitnessData as Record<string, unknown>;
        return bwData.isMocked !== true;
      });

      const totalDeliveries = realDeliveries.length;
      const verifiedDeliveries = realDeliveries.filter(d => d.status === 'DELIVERED' && d.verifiedAt !== null).length;
      
      // Get unique drivers
      const uniqueDrivers = new Set(realDeliveries.map(d => d.driverId));
      
      // Get unique locations (using actualLat/actualLon if available, otherwise destination)
      const uniqueLocations = new Set<string>();
      realDeliveries.forEach(d => {
        const lat = d.actualLat ?? d.destinationLat;
        const lon = d.actualLon ?? d.destinationLon;
        if (lat !== null && lon !== null) {
          // Round to ~100m precision to group nearby locations
          const roundedLat = Math.round(lat * 100) / 100;
          const roundedLon = Math.round(lon * 100) / 100;
          uniqueLocations.add(`${roundedLat},${roundedLon}`);
        }
      });

      return {
        totalNodes,
        activeNodes,
        nodeTypes: {
          sentinel: sentinels,
          bridge: bridges,
          diviner: diviners
        },
        deliveries: {
          total: totalDeliveries,
          verified: verifiedDeliveries,
          uniqueDrivers: uniqueDrivers.size,
          uniqueLocations: uniqueLocations.size
        },
        lastUpdated: now
      };
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error extracting network statistics from XL1:', error);
      return {
        totalNodes: 0,
        activeNodes: 0,
        nodeTypes: {
          sentinel: 0,
          bridge: 0,
          diviner: 0
        },
        deliveries: {
          total: 0,
          verified: 0,
          uniqueDrivers: 0,
          uniqueLocations: 0
        },
        lastUpdated: Date.now()
      };
    }
  }

  /**
   * Extract witness nodes from XL1 transactions stored in database
   * Returns real addresses, types, and participation data
   * Uses actual delivery locations when available, otherwise deterministic mock locations (clearly marked)
   */
  private async extractWitnessNodesFromXL1(): Promise<WitnessNodeDetails[]> {
    try {
      // Get all deliveries with XL1 transactions (not mocked)
      // Include location data to use real delivery locations
      const deliveries = await prisma.delivery.findMany({
        where: {
          boundWitnessData: {
            not: Prisma.JsonNull
          }
        },
        select: {
          boundWitnessData: true,
          verifiedAt: true,
          actualLat: true,
          actualLon: true,
          destinationLat: true,
          destinationLon: true,
          driverId: true
        }
      });

      const nodeMap = new Map<string, {
        address: string;
        type: 'sentinel' | 'bridge';
        firstSeen: number;
        lastSeen: number;
        transactionCount: number;
        successfulTransactions: number;
      }>();

      const RECENT_ACTIVITY_THRESHOLD = 7 * 24 * 60 * 60 * 1000; // 7 days
      const now = Date.now();

      // Extract addresses from bound witnesses
      for (const delivery of deliveries) {
        if (!delivery.boundWitnessData || typeof delivery.boundWitnessData !== 'object') {
          continue;
        }

        const bwData = delivery.boundWitnessData as Record<string, unknown>;
        
        // Check if this is a real XL1 transaction (not mocked)
        if (bwData.isMocked === true) {
          continue;
        }

        // Extract bound witness
        let boundWitness: unknown = null;
        if ('boundWitness' in bwData && bwData.boundWitness) {
          const bw = bwData.boundWitness;
          if (Array.isArray(bw) && bw.length > 0) {
            boundWitness = bw[0];
          } else if (typeof bw === 'object') {
            boundWitness = bw;
          }
        }

        if (!boundWitness || typeof boundWitness !== 'object') {
          continue;
        }

        const bw = boundWitness as Record<string, unknown>;
        
        // Extract addresses and signatures
        if ('addresses' in bw && Array.isArray(bw.addresses)) {
          const addresses = bw.addresses as string[];
          const signatures: string[] = [];
          if ('$signatures' in bw && Array.isArray(bw.$signatures)) {
            signatures.push(...(bw.$signatures as string[]));
          }
          const signaturesValid = signatures.length > 0 && signatures.length >= addresses.length;
          
          const timestamp = delivery.verifiedAt ? delivery.verifiedAt.getTime() : now;
          
          addresses.forEach((address, index) => {
            // First address is typically a bridge, others are sentinels
            const type: 'sentinel' | 'bridge' = index === 0 ? 'bridge' : 'sentinel';
            
            if (!nodeMap.has(address)) {
              nodeMap.set(address, {
                address,
                type,
                firstSeen: timestamp,
                lastSeen: timestamp,
                transactionCount: 1,
                successfulTransactions: signaturesValid ? 1 : 0
              });
            } else {
              const node = nodeMap.get(address)!;
              node.transactionCount++;
              if (signaturesValid) node.successfulTransactions++;
              if (timestamp < node.firstSeen) node.firstSeen = timestamp;
              if (timestamp > node.lastSeen) node.lastSeen = timestamp;
            }
          });
        }
      }

      // Map addresses to delivery locations
      // Create a node for each unique (address, location) combination to show all delivery locations
      // This allows the same address to appear at multiple locations (e.g., different delivery addresses)
      const addressLocationMap = new Map<string, Array<{ lat: number; lon: number; timestamp: number; source: 'delivery' | 'mock' }>>();
      
      // First pass: collect all locations for each address
      for (const delivery of deliveries) {
        if (!delivery.boundWitnessData || typeof delivery.boundWitnessData !== 'object') {
          continue;
        }

        const bwData = delivery.boundWitnessData as Record<string, unknown>;
        if (bwData.isMocked === true) continue;

        let boundWitness: unknown = null;
        if ('boundWitness' in bwData && bwData.boundWitness) {
          const bw = bwData.boundWitness;
          if (Array.isArray(bw) && bw.length > 0) {
            boundWitness = bw[0];
          } else if (typeof bw === 'object') {
            boundWitness = bw;
          }
        }

        if (!boundWitness || typeof boundWitness !== 'object') continue;

        const bw = boundWitness as Record<string, unknown>;
        if ('addresses' in bw && Array.isArray(bw.addresses)) {
          const addresses = bw.addresses as string[];
          const lat = delivery.actualLat ?? delivery.destinationLat;
          const lon = delivery.actualLon ?? delivery.destinationLon;
          const timestamp = delivery.verifiedAt ? delivery.verifiedAt.getTime() : now;
          
          if (lat !== null && lon !== null) {
            addresses.forEach(address => {
              // Round location to ~100m precision to group very close locations
              const roundedLat = Math.round(lat * 1000) / 1000;
              const roundedLon = Math.round(lon * 1000) / 1000;
              const locationKey = `${roundedLat},${roundedLon}`;
              
              if (!addressLocationMap.has(address)) {
                addressLocationMap.set(address, []);
              }
              
              const locations = addressLocationMap.get(address)!;
              // Only add if this location hasn't been seen for this address
              const existingLocation = locations.find(loc => 
                Math.abs(loc.lat - roundedLat) < 0.001 && Math.abs(loc.lon - roundedLon) < 0.001
              );
              
              if (!existingLocation) {
                locations.push({ lat: roundedLat, lon: roundedLon, timestamp, source: 'delivery' });
              }
            });
          }
        }
      }

      // Convert to WitnessNodeDetails with real delivery locations when available
      // Create a node for each unique (address, location) combination
      const nodes: WitnessNodeDetails[] = [];
      
      for (const node of Array.from(nodeMap.values())) {
        const hash = this.simpleHash(node.address);
        const locations = addressLocationMap.get(node.address) || [];
        
        if (locations.length > 0) {
          // Create a node for each unique location where this address was used
          locations.forEach((locationData, index) => {
            const isActive = (now - node.lastSeen) < RECENT_ACTIVITY_THRESHOLD;
            
            // Create a unique identifier for this address-location combination
            // Use index to differentiate multiple locations for the same address
            const uniqueAddress = locations.length > 1 
              ? `${node.address}-${index}` 
              : node.address;
            
            nodes.push({
              address: uniqueAddress,
              location: {
                latitude: locationData.lat,
                longitude: locationData.lon
              },
              type: node.type,
              verified: true,
              status: isActive ? 'active' : 'inactive',
              reputation: Math.min(100, 50 + Math.floor((node.successfulTransactions / node.transactionCount) * 50)), // 50-100 based on success rate
              participationHistory: {
                totalQueries: node.transactionCount,
                successfulQueries: node.successfulTransactions,
                lastSeen: node.lastSeen
              },
              metadata: {
                region: this.getRegionFromLocation(locationData.lat, locationData.lon),
                locationSource: locationData.source,
                locationNote: 'Location from actual delivery verification',
                dataSource: 'xl1',
                firstSeen: node.firstSeen,
                originalAddress: node.address, // Store original address for reference
                locationIndex: index // Track which location this is for the address
              }
            });
          });
        } else {
          // No delivery location found, use deterministic mock location
          const latitude = 20 + (hash % 50) - 25; // -5 to 45
          const longitude = -120 + (hash % 100) - 50; // -170 to -70 (mostly US)
          const isActive = (now - node.lastSeen) < RECENT_ACTIVITY_THRESHOLD;
          
          nodes.push({
            address: node.address,
            location: {
              latitude,
              longitude
            },
            type: node.type,
            verified: true,
            status: isActive ? 'active' : 'inactive',
            reputation: Math.min(100, 50 + Math.floor((node.successfulTransactions / node.transactionCount) * 50)),
            participationHistory: {
              totalQueries: node.transactionCount,
              successfulQueries: node.successfulTransactions,
              lastSeen: node.lastSeen
            },
            metadata: {
              region: this.getRegionFromLocation(latitude, longitude),
              locationSource: 'mock',
              locationNote: 'Location data requires Diviner access. Using deterministic mock location for visualization.',
              dataSource: 'xl1',
              firstSeen: node.firstSeen
            }
          });
        }
      }

      return nodes;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error extracting witness nodes from XL1:', error);
      return [];
    }
  }

  /**
   * Calculate coverage area from actual delivery locations
   * Uses real delivery location data from the database
   */
  private async calculateCoverageFromDeliveries(): Promise<{ totalKm2: number; countries: number }> {
    try {
      // Get all deliveries with location data
      // We'll use actualLat/actualLon if available, otherwise fall back to destination
      // Only include deliveries that have been verified (have a proofHash) for coverage calculation
      const deliveries = await prisma.delivery.findMany({
        where: {
          proofHash: {
            not: null // Only count verified deliveries
          }
        },
        select: {
          actualLat: true,
          actualLon: true,
          destinationLat: true,
          destinationLon: true,
          proofHash: true
        }
      });

      // eslint-disable-next-line no-console
      console.log(`[Coverage] Found ${deliveries.length} verified deliveries for coverage calculation`);

      if (deliveries.length === 0) {
        // eslint-disable-next-line no-console
        console.log('[Coverage] No deliveries found, returning 0 coverage');
        return { totalKm2: 0, countries: 0 };
      }

      // Extract unique locations
      const locations: Array<{ lat: number; lon: number }> = [];
      const locationSet = new Set<string>();
      
      deliveries.forEach(d => {
        // Use actual location if available, otherwise use destination
        const lat = d.actualLat ?? d.destinationLat;
        const lon = d.actualLon ?? d.destinationLon;
        
        // destinationLat/destinationLon should always be present (not nullable in schema)
        if (lat !== null && lon !== null && !isNaN(lat) && !isNaN(lon)) {
          // Round to ~1km precision to group nearby locations
          const roundedLat = Math.round(lat * 100) / 100;
          const roundedLon = Math.round(lon * 100) / 100;
          const key = `${roundedLat},${roundedLon}`;
          
          if (!locationSet.has(key)) {
            locationSet.add(key);
            locations.push({ lat: roundedLat, lon: roundedLon });
          }
        }
      });

      // eslint-disable-next-line no-console
      console.log(`[Coverage] Extracted ${locations.length} unique locations from ${deliveries.length} deliveries`);

      if (locations.length === 0) {
        // eslint-disable-next-line no-console
        console.log('[Coverage] No valid locations found after extraction, returning 0 coverage');
        return { totalKm2: 0, countries: 0 };
      }

      // If we have only one location, use a minimum service area
      // This represents a ~10km radius service area around the delivery location
      if (locations.length === 1) {
        // Use a minimum area representing a small service area (e.g., ~10km radius ≈ 314 km²)
        // Calculate this as a circle area: π * r² where r = 10km
        const radiusKm = 10;
        const minServiceAreaKm2 = Math.PI * radiusKm * radiusKm; // ~314 km²
        
        // eslint-disable-next-line no-console
        console.log(`[Coverage] Single location detected (${locations[0].lat}, ${locations[0].lon}), using minimum service area: ${minServiceAreaKm2.toFixed(0)} km²`);
        
        return {
          totalKm2: Math.round(minServiceAreaKm2),
          countries: 1
        };
      }

      // Calculate bounding box for multiple locations
      const lats = locations.map(l => l.lat);
      const lons = locations.map(l => l.lon);
      const minLat = Math.min(...lats);
      const maxLat = Math.max(...lats);
      const minLon = Math.min(...lons);
      const maxLon = Math.max(...lons);

      // Calculate approximate area using bounding box
      // Rough approximation: 1 degree lat ≈ 111 km, 1 degree lon ≈ 111 km * cos(lat)
      const latSpan = maxLat - minLat;
      const lonSpan = maxLon - minLon;
      const avgLat = (minLat + maxLat) / 2;
      
      // Check if all locations are the same (within rounding precision)
      // This handles the case where rounding groups multiple deliveries to the same location
      if (latSpan < 0.01 && lonSpan < 0.01) {
        // All locations are effectively the same, treat as single location
        const radiusKm = 10;
        const minServiceAreaKm2 = Math.PI * radiusKm * radiusKm;
        
        // eslint-disable-next-line no-console
        console.log(`[Coverage] All ${locations.length} locations are effectively the same (span < 0.01°), using minimum service area: ${minServiceAreaKm2.toFixed(0)} km²`);
        
        return {
          totalKm2: Math.round(minServiceAreaKm2),
          countries: 1
        };
      }
      
      const latKm = latSpan * 111;
      const lonKm = lonSpan * 111 * Math.cos(avgLat * Math.PI / 180);
      
      const totalKm2 = latKm * lonKm;

      // Estimate countries based on geographic spread
      // Very rough heuristic: if spread > 20 degrees, likely multiple countries
      const spread = Math.max(latSpan, lonSpan);
      const countries = spread > 20 ? Math.max(2, Math.floor(spread / 20)) : 1;

      // eslint-disable-next-line no-console
      console.log(`[Coverage] Calculated coverage: ${totalKm2.toFixed(0)} km² across ${countries} country/countries`);

      return {
        totalKm2: Math.max(0, Math.round(totalKm2)),
        countries: Math.max(1, countries)
      };
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error calculating coverage from deliveries:', error);
      return { totalKm2: 0, countries: 0 };
    }
  }

  /**
   * Estimate coverage area based on node count (fallback for when no delivery data)
   * Real coverage requires location data from Diviner
   */
  private estimateCoverageArea(nodeCount: number): { totalKm2: number; countries: number } {
    // Rough estimate: ~20,000 km² per node (very rough approximation)
    const totalKm2 = Math.max(0, nodeCount * 20000);
    // Estimate countries: ~1 country per 50 nodes (very rough)
    const countries = Math.max(1, Math.floor(nodeCount / 50));
    
    return { totalKm2, countries };
  }

  /**
   * Calculate network health based on activity metrics (estimate)
   * Real health assessment requires location data and geographic distribution
   * For small deployments, considers verified deliveries as an indicator of network activity
   */
  private calculateNetworkHealth(
    stats: { totalNodes: number; activeNodes: number; nodeTypes: { sentinel: number; bridge: number; diviner: number } },
    deliveries?: { total: number; verified: number; uniqueDrivers: number; uniqueLocations: number }
  ): 'excellent' | 'good' | 'fair' | 'poor' {
    if (stats.totalNodes === 0) return 'poor';
    
    const activeRatio = stats.activeNodes / stats.totalNodes;
    const hasBridges = stats.nodeTypes.bridge > 0;
    const hasSentinels = stats.nodeTypes.sentinel > 0;
    
    // For large networks (10+ nodes), use traditional criteria
    if (stats.totalNodes >= 10) {
      if (activeRatio >= 0.8 && hasBridges && hasSentinels) {
        return 'excellent';
      } else if (activeRatio >= 0.6 && hasBridges) {
        return 'good';
      } else if (activeRatio >= 0.4) {
        return 'fair';
      }
      return 'poor';
    }
    
    // For medium networks (5-9 nodes)
    if (stats.totalNodes >= 5) {
      if (activeRatio >= 0.6 && hasBridges) {
        return 'good';
      } else if (activeRatio >= 0.4) {
        return 'fair';
      }
      return 'poor';
    }
    
    // For small networks (1-4 nodes), consider verified deliveries as activity indicator
    // This is more appropriate for deployments where multiple drivers share one wallet
    if (stats.totalNodes >= 1) {
      const verifiedDeliveries = deliveries?.verified ?? 0;
      
      // If we have verified deliveries, the network is active and functional
      if (verifiedDeliveries >= 5 && activeRatio >= 0.8) {
        return 'good'; // Small but active network with multiple verified deliveries
      } else if (verifiedDeliveries >= 3 && activeRatio >= 0.6) {
        return 'fair'; // Small network with some verified deliveries
      } else if (verifiedDeliveries >= 1 && activeRatio >= 0.5) {
        return 'fair'; // At least one verified delivery shows the network is working
      } else if (activeRatio >= 0.5) {
        return 'fair'; // Active node even without verified deliveries yet
      }
    }
    
    return 'poor';
  }
}

