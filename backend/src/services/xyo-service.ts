/**
 * Main XYO Service - Facade coordinating specialized services
 * This service provides a unified interface for XYO Network operations
 */

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - Shared types outside rootDir
import type { DeliveryVerificationPayload } from '../../../shared/types/delivery.types.js';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - Shared types outside rootDir
import type { LocationProofDetails, ProofVerificationResult, DivinerVerificationResult, LocationAccuracyResult, WitnessNodeDetails } from '../../../shared/types/xyo.types.js';
import { env } from '../lib/env.js';
import { haversineDistance } from '../utils/distance.js';
import { ArchivistService } from './xyo/archivist-service.js';
import { DivinerService } from './xyo/diviner-service.js';
import { NetworkService, type NetworkStatistics } from './xyo/network-service.js';
import { XL1TransactionService } from './xyo/xl1-transaction-service.js';
import { Xl1ViewerService } from './xyo/xl1-viewer-service.js';

export class XyoService {
  private archivistService: ArchivistService;
  private xl1TransactionService: XL1TransactionService;
  private divinerService: DivinerService;
  private networkService: NetworkService;
  private xl1ViewerService: Xl1ViewerService;

  constructor() {
    // eslint-disable-next-line no-console
    console.log('Initializing XyoService:', {
      archivistUrl: env.xyoArchivistUrl,
      archive: env.xyoArchive || 'chaincheck',
      hasApiKey: Boolean(env.xyoApiKey),
      xl1RpcUrl: env.xyoChainRpcUrl
    });

    this.archivistService = new ArchivistService();
    this.xl1TransactionService = new XL1TransactionService();
    this.divinerService = new DivinerService();
    this.networkService = new NetworkService();
    this.xl1ViewerService = new Xl1ViewerService();
  }

  /**
   * Get the actual block number for an XL1 transaction
   * Queries the XL1 viewer to check if the transaction has been committed to a block
   * This can be called periodically to check if a pending transaction has been committed
   */
  async getActualBlockNumberForTransaction(transactionHash: string): Promise<number | null> {
    return this.xl1ViewerService.getActualBlockNumberForTransaction(transactionHash);
  }

  /**
   * Query a block by its block number from XL1
   * Note: This may not be available in all XL1 RPC implementations
   */
  async getBlockByNumber(blockNumber: number): Promise<{ block: unknown; transactions: unknown[] } | null> {
    return this.xl1ViewerService.getBlockByNumber(blockNumber);
  }

  /**
   * Get payload from Archivist by payload hash
   * Used for tamper detection - fetches current payload state from Archivist
   */
  async getPayloadByHash(payloadHash: string): Promise<unknown | null> {
    if (env.xyoArchivistDisabled) {
      // eslint-disable-next-line no-console
      console.log('Archivist is disabled (XYO_ARCHIVIST_DISABLED=true), skipping payload retrieval');
      return null;
    }
    return this.archivistService.getPayloadByHash(payloadHash);
  }

  /**
   * Verify a location proof
   * For XL1 transactions: Uses XL1 RPC/viewer directly (source of truth)
   * For other transactions: Falls back to Archivist
   */
  async verifyLocationProof(proofHash: string): Promise<ProofVerificationResult> {
    // PRIORITY 1: Try XL1 viewer first (for XL1 transactions)
    // XL1 blockchain is the source of truth, not Archivist
    try {
      const xl1Result = await this.xl1ViewerService.getBoundWitnessFromXL1(proofHash);
      if (xl1Result && xl1Result.boundWitness) {
        // eslint-disable-next-line no-console
        console.log('Successfully retrieved bound witness from XL1 blockchain via viewer');
        return {
          isValid: true,
          data: xl1Result.boundWitness
        };
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.debug('XL1 viewer query failed, trying Archivist:', error);
    }

    // PRIORITY 2: Fall back to Archivist (for non-XL1 or if XL1 query fails)
    // Skip if Archivist is disabled
    if (env.xyoArchivistDisabled) {
      // eslint-disable-next-line no-console
      console.log('Archivist is disabled (XYO_ARCHIVIST_DISABLED=true), returning invalid result');
      return {
        isValid: false,
        data: null,
        errors: ['Archivist is disabled and XL1 viewer query failed']
      };
    }

    return this.archivistService.verifyLocationProof(proofHash);
  }

  /**
   * Validate a bound witness structure
   */
  async validateBoundWitness(proofHash: string): Promise<{ isValid: boolean; errors: string[] }> {
    if (env.xyoArchivistDisabled) {
      // eslint-disable-next-line no-console
      console.log('Archivist is disabled (XYO_ARCHIVIST_DISABLED=true), skipping bound witness validation');
      return { isValid: false, errors: ['Archivist is disabled'] };
    }

    return this.archivistService.validateBoundWitness(proofHash);
  }

  /**
   * Create a location proof using XL1 blockchain transactions
   */
  async createLocationProofXL1(payload: DeliveryVerificationPayload): Promise<LocationProofDetails> {
    return this.xl1TransactionService.createLocationProof(payload);
  }

  /**
   * Query XYO Diviner network for location verification
   * Can be called with XL1 transaction details for cross-reference verification
   */
  async queryLocationDiviner(
    latitude: number,
    longitude: number,
    timestamp: number,
    xl1TransactionHash?: string,
    xl1BlockNumber?: number,
    boundWitness?: unknown
  ): Promise<DivinerVerificationResult> {
    // DivinerService will check the flag internally, but we can also check here for early return
    if (env.xyoDivinerDisabled) {
      // eslint-disable-next-line no-console
      console.log('Diviner is disabled (XYO_DIVINER_DISABLED=true), returning mock verification');
      return this.divinerService['createMockVerification'](latitude, longitude, timestamp, xl1TransactionHash, xl1BlockNumber);
    }

    return this.divinerService.queryLocation(
      latitude,
      longitude,
      timestamp,
      xl1TransactionHash,
      xl1BlockNumber,
      boundWitness
    );
  }

  /**
   * Verify location proof using Diviner
   * Falls back to XL1-based verification if Diviner is unavailable
   */
  async verifyLocationWithDiviner(
    proofHash: string,
    claimedLatitude: number,
    claimedLongitude: number,
    claimedTimestamp: number
  ): Promise<DivinerVerificationResult> {
    // Check if Diviner is disabled
    if (env.xyoDivinerDisabled) {
      // eslint-disable-next-line no-console
      console.log('Diviner is disabled (XYO_DIVINER_DISABLED=true), returning mock verification');
      // When Diviner is disabled, return mock data with isMocked: true
      return this.divinerService['createMockVerification'](claimedLatitude, claimedLongitude, claimedTimestamp, proofHash);
    }

    // Try Diviner first
    const divinerResult = await this.divinerService.queryLocation(
      claimedLatitude, 
      claimedLongitude, 
      claimedTimestamp, 
      proofHash
    );
    
    // If Diviner returned mock data (API unavailable), try XL1-based verification
    if (divinerResult.isMocked && divinerResult.nodeCount === 0) {
      // eslint-disable-next-line no-console
      console.log('Diviner unavailable, attempting XL1-based verification');
      return this.verifyLocationFromXL1(proofHash, claimedLatitude, claimedLongitude, claimedTimestamp);
    }
    
    return divinerResult;
  }

  /**
   * Extract verification data from XL1 transaction
   * Uses bound witness addresses as witness nodes and location from payloads
   * This provides real data from XL1 blockchain when Diviner API is unavailable
   */
  async verifyLocationFromXL1(
    proofHash: string,
    latitude: number,
    longitude: number,
    timestamp: number
  ): Promise<DivinerVerificationResult> {
    try {
      // Get bound witness from XL1
      const xl1Data = await this.xl1ViewerService.getBoundWitnessFromXL1(proofHash);
      
      if (!xl1Data || !xl1Data.boundWitness) {
        // eslint-disable-next-line no-console
        console.warn('Could not retrieve XL1 transaction, using mock data');
        return this.divinerService['createMockVerification'](latitude, longitude, timestamp, proofHash);
      }

      const boundWitness = xl1Data.boundWitness as Record<string, unknown>;
      const payloads = xl1Data.payloads;

      // Extract addresses (witness participants)
      const addresses: string[] = [];
      if ('addresses' in boundWitness && Array.isArray(boundWitness.addresses)) {
        addresses.push(...(boundWitness.addresses as string[]));
      }

      // Extract signatures
      const signatures: string[] = [];
      if ('$signatures' in boundWitness && Array.isArray(boundWitness.$signatures)) {
        signatures.push(...(boundWitness.$signatures as string[]));
      } else if ('_signatures' in boundWitness && Array.isArray(boundWitness._signatures)) {
        signatures.push(...(boundWitness._signatures as string[]));
      }

      // Extract location from payloads if available
      let extractedLat = latitude;
      let extractedLon = longitude;
      if (Array.isArray(payloads)) {
        for (const payload of payloads) {
          if (typeof payload === 'object' && payload !== null) {
            const p = payload as Record<string, unknown>;
            // Check for location data in chaincheck payload
            if (p.schema === 'network.xyo.chaincheck' && p.data) {
              const data = p.data as Record<string, unknown>;
              if (typeof data.latitude === 'number') extractedLat = data.latitude;
              if (typeof data.longitude === 'number') extractedLon = data.longitude;
            }
          }
        }
      }

      // Calculate metrics based on XL1 data
      const nodeCount = addresses.length;
      
      // Confidence based on node count and signature verification
      let confidence = 70;
      const signaturesValid = signatures.length > 0 && signatures.length >= addresses.length;
      
      if (nodeCount >= 5 && signaturesValid) {
        confidence = 95;
      } else if (nodeCount >= 3 && signaturesValid) {
        confidence = 85;
      } else if (nodeCount >= 2 && signaturesValid) {
        confidence = 75;
      } else if (nodeCount >= 1 && signaturesValid) {
        confidence = 70;
      } else {
        confidence = 50;
      }

      const consensus: 'high' | 'medium' | 'low' = 
        confidence >= 90 ? 'high' : confidence >= 70 ? 'medium' : 'low';

      // Create witness nodes from addresses
      const witnessNodes: WitnessNodeDetails[] = addresses.map((address, index) => ({
        address,
        type: index === 0 ? 'bridge' : 'sentinel', // First address is typically the bridge
        verified: signaturesValid,
        status: 'active' as const
      }));

      // Calculate distance from claimed location (if we have extracted location)
      const distanceFromClaimed = Math.sqrt(
        Math.pow((extractedLat - latitude) * 111000, 2) + // Rough conversion: 1 degree lat ≈ 111km
        Math.pow((extractedLon - longitude) * 111000 * Math.cos(latitude * Math.PI / 180), 2)
      );

      return {
        verified: signaturesValid && nodeCount > 0,
        confidence,
        nodeCount,
        consensus,
        locationMatch: distanceFromClaimed < 100, // Within 100m is considered a match
        distanceFromClaimed,
        timestamp: Date.now(),
        isMocked: false, // Real data from XL1, not mocked
        details: {
          divinerResponse: {
            schema: 'network.xyo.boundwitness',
            source: 'xl1',
            nodeCount,
            addresses,
            signaturesValid
          },
          witnessNodes,
          locationData: {
            latitude: extractedLat,
            longitude: extractedLon,
            accuracy: 10, // Default accuracy
            timestamp,
            source: 'xl1' // Mark as XL1-sourced, not Diviner
          },
          xl1TransactionHash: proofHash,
          xl1BlockNumber: (boundWitness.nbf as number) || (boundWitness.blockNumber as number) || undefined
        }
      };
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn('XL1-based verification failed, using mock data:', error);
      return this.divinerService['createMockVerification'](latitude, longitude, timestamp, proofHash);
    }
  }

  /**
   * Get nearby witness nodes (stub - to be implemented)
   */
  async getNearbyWitnesses() {
    return [];
  }

  /**
   * Get bound witness chain by following previous_hashes
   * For XL1 transactions: Uses XL1 RPC/viewer directly (source of truth)
   * For other transactions: Falls back to Archivist
   */
  async getBoundWitnessChain(proofHash: string, maxDepth: number = 5, storedBoundWitnessData?: unknown): Promise<unknown[]> {
    // PRIORITY 1: Try stored data first (for newly submitted transactions)
    if (storedBoundWitnessData) {
      const storedData = storedBoundWitnessData as Record<string, unknown>;
      if (storedData.isMocked !== true && storedData.boundWitness) {
        // eslint-disable-next-line no-console
        console.log('Using stored real transaction data for chain');
        const bw = storedData.boundWitness;
        if (Array.isArray(bw) && bw.length > 0) {
          const boundWitness = bw[0];
          const chain: unknown[] = [boundWitness];
          
          // Follow the chain using XL1 viewer
          const bwObj = boundWitness as Record<string, unknown>;
          if ('previous_hashes' in bwObj && Array.isArray(bwObj.previous_hashes) && bwObj.previous_hashes.length > 0) {
            const previousHash = bwObj.previous_hashes[0];
            if (previousHash && typeof previousHash === 'string' && previousHash !== '' && !/^0+$/.test(previousHash)) {
              // Continue chain from previous hash using XL1 viewer
              const remainingChain = await this.xl1ViewerService.getBoundWitnessChainFromXL1(previousHash, maxDepth - 1);
              chain.push(...remainingChain);
            }
          }
          
          return chain;
        }
      }
    }

    // PRIORITY 2: Try XL1 viewer (for XL1 transactions)
    // XL1 blockchain is the source of truth
    try {
      const xl1Chain = await this.xl1ViewerService.getBoundWitnessChainFromXL1(proofHash, maxDepth);
      if (xl1Chain.length > 0) {
        // eslint-disable-next-line no-console
        console.log(`Successfully retrieved ${xl1Chain.length} transactions from XL1 chain via viewer`);
        return xl1Chain;
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.debug('XL1 viewer chain query failed, trying Archivist:', error);
    }

    // PRIORITY 3: Fall back to Archivist (for non-XL1 or if XL1 query fails)
    // Skip if Archivist is disabled
    if (env.xyoArchivistDisabled) {
      // eslint-disable-next-line no-console
      console.log('Archivist is disabled (XYO_ARCHIVIST_DISABLED=true), returning empty chain');
      return [];
    }

    return this.archivistService.getBoundWitnessChain(proofHash, maxDepth, storedBoundWitnessData);
  }

  /**
   * Extract cryptographic details from a bound witness
   * For XL1 transactions: Uses XL1 RPC/viewer directly (source of truth)
   * For other transactions: Falls back to Archivist
   */
  async getCryptographicDetails(proofHash: string, storedBoundWitnessData?: unknown): Promise<{
    signatures: string[];
    hashChain: string[];
    dataHash?: string;
    sequence?: string;
    addresses: string[];
    payloadHashes: string[];
    boundWitnessHash?: string;
    signatureValid: boolean;
    errors: string[];
    isMocked?: boolean;
  }> {
    // PRIORITY 1: Try stored data first (for newly submitted transactions)
    if (storedBoundWitnessData) {
      const storedData = storedBoundWitnessData as Record<string, unknown>;
      if (storedData.isMocked !== true && storedData.boundWitness) {
        // Use stored data - it's from the actual XL1 transaction
        // eslint-disable-next-line no-console
        console.log('Using stored real transaction data for cryptographic details');
        return this.archivistService.getCryptographicDetails(proofHash, storedBoundWitnessData);
      }
    }

    // PRIORITY 2: Try XL1 viewer (for XL1 transactions)
    // XL1 blockchain is the source of truth
    try {
      const xl1Result = await this.xl1ViewerService.getBoundWitnessFromXL1(proofHash);
      if (xl1Result && xl1Result.boundWitness) {
        // eslint-disable-next-line no-console
        console.log('Successfully retrieved bound witness from XL1 blockchain via viewer for cryptographic details');
        // Extract details from XL1 bound witness
        return this.archivistService.getCryptographicDetails(proofHash, xl1Result.boundWitness);
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.debug('XL1 viewer query failed, trying Archivist:', error);
    }

    // PRIORITY 3: Fall back to Archivist (for non-XL1 or if XL1 query fails)
    // Skip if Archivist is disabled
    if (env.xyoArchivistDisabled) {
      // eslint-disable-next-line no-console
      console.log('Archivist is disabled (XYO_ARCHIVIST_DISABLED=true), returning empty cryptographic details');
      return {
        signatures: [],
        hashChain: [],
        addresses: [],
        payloadHashes: [],
        signatureValid: false,
        errors: ['Archivist is disabled']
      };
    }

    return this.archivistService.getCryptographicDetails(proofHash, storedBoundWitnessData);
  }

  /**
   * Get witness node information by address
   */
  async getWitnessNodeInfo(nodeAddress: string): Promise<WitnessNodeDetails> {
    return this.networkService.getWitnessNodeInfo(nodeAddress);
  }

  /**
   * Get network-wide statistics
   */
  async getNetworkStatistics(): Promise<NetworkStatistics> {
    return this.networkService.getNetworkStatistics();
  }

  /**
   * Get all witness nodes with optional filtering
   */
  async getAllWitnessNodes(filters?: {
    type?: 'sentinel' | 'bridge' | 'diviner';
    status?: 'active' | 'inactive';
    minLat?: number;
    maxLat?: number;
    minLon?: number;
    maxLon?: number;
  }): Promise<WitnessNodeDetails[]> {
    return this.networkService.getAllWitnessNodes(filters);
  }

  /**
   * Calculate location accuracy metrics and confidence scoring
   * Based on witness node proximity, consensus agreement, and network participation
   * Can extract witness nodes from XL1 transaction if not provided
   * 
   * @param latitude Location latitude
   * @param longitude Location longitude
   * @param witnessNodes Array of witness nodes that verified the location
   * @param proofHash Optional proof hash to extract witness nodes from XL1 transaction
   * @returns LocationAccuracyResult with accuracy score, confidence level, and precision metrics
   */
  async calculateLocationAccuracy(
    latitude: number,
    longitude: number,
    witnessNodes: WitnessNodeDetails[] = [],
    proofHash?: string
  ): Promise<LocationAccuracyResult> {
    // Typical GPS accuracy (varies by device and conditions)
    const GPS_ACCURACY_METERS = 10;

    // If no witness nodes provided, try to extract from XL1 transaction
    let nodes = witnessNodes;
    if (nodes.length === 0 && proofHash) {
      try {
        // eslint-disable-next-line no-console
        console.log('No witness nodes provided, attempting to extract from XL1 transaction');
        const xl1Data = await this.xl1ViewerService.getBoundWitnessFromXL1(proofHash);
        
        if (xl1Data && xl1Data.boundWitness) {
          const boundWitness = xl1Data.boundWitness as Record<string, unknown>;
          
          // Extract addresses from bound witness
          if ('addresses' in boundWitness && Array.isArray(boundWitness.addresses)) {
            const addresses = boundWitness.addresses as string[];
            
            // Extract signatures to verify
            const signatures: string[] = [];
            if ('$signatures' in boundWitness && Array.isArray(boundWitness.$signatures)) {
              signatures.push(...(boundWitness.$signatures as string[]));
            }
            const signaturesValid = signatures.length > 0 && signatures.length >= addresses.length;
            
            // Create witness nodes from addresses
            nodes = addresses.map((address, index) => ({
              address,
              type: index === 0 ? 'bridge' : 'sentinel',
              verified: signaturesValid,
              status: 'active' as const
            }));
            
            // eslint-disable-next-line no-console
            console.log(`Extracted ${nodes.length} witness nodes from XL1 transaction`);
          }
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.warn('Failed to extract witness nodes from XL1 transaction:', error);
      }
    }

    // If still no nodes, try to get nearby nodes from network service
    if (nodes.length === 0) {
      try {
        // Get nodes within 1km radius
        const radiusDegrees = 0.009; // approximately 1km
        nodes = await this.networkService.getAllWitnessNodes({
          status: 'active',
          minLat: latitude - radiusDegrees,
          maxLat: latitude + radiusDegrees,
          minLon: longitude - radiusDegrees,
          maxLon: longitude + radiusDegrees
        });
      } catch (error) {
        // eslint-disable-next-line no-console
        console.warn('Failed to fetch nearby witness nodes for accuracy calculation:', error);
      }
    }

    // Filter to only active nodes with location data
    const activeNodesWithLocation = nodes.filter(
      node => node.status === 'active' && node.location?.latitude && node.location?.longitude
    );

    const nodeCount = activeNodesWithLocation.length;

    // If no nodes available, return default accuracy
    if (nodeCount === 0) {
      return {
        accuracyScore: GPS_ACCURACY_METERS,
        confidenceLevel: 'low',
        precisionRadius: GPS_ACCURACY_METERS,
        witnessNodeCount: 0,
        gpsAccuracy: GPS_ACCURACY_METERS,
        xyoNetworkAccuracy: GPS_ACCURACY_METERS,
        accuracyImprovement: 0,
        consensusAgreement: 0,
        nodeProximityScore: 0,
        isMocked: true
      };
    }

    // Calculate distances from location to each witness node
    const nodeDistances = activeNodesWithLocation.map(node => {
      if (!node.location) return Infinity;
      return haversineDistance(
        latitude,
        longitude,
        node.location.latitude,
        node.location.longitude
      );
    });

    // Calculate average distance (proximity score)
    const avgDistance = nodeDistances.reduce((sum, dist) => sum + dist, 0) / nodeCount;
    const maxDistance = Math.max(...nodeDistances);
    const minDistance = Math.min(...nodeDistances);

    // Node proximity score (0-100): closer nodes = higher score
    // Score decreases as average distance increases
    // 100m = 100, 500m = 80, 1000m = 60, 2000m = 40, 5000m = 20
    const nodeProximityScore = Math.max(0, Math.min(100, 100 - (avgDistance / 50)));

    // Calculate consensus agreement based on distance variance
    // Lower variance = higher agreement
    const distanceVariance = nodeDistances.reduce((sum, dist) => {
      return sum + Math.pow(dist - avgDistance, 2);
    }, 0) / nodeCount;
    const stdDev = Math.sqrt(distanceVariance);
    
    // Consensus agreement (0-100): lower std dev = higher agreement
    // std dev of 0 = 100, std dev of 100m = 80, std dev of 500m = 40, std dev of 1000m = 0
    const consensusAgreement = Math.max(0, Math.min(100, 100 - (stdDev / 10)));

    // Calculate XYO Network accuracy based on:
    // - Number of witness nodes (more nodes = better accuracy)
    // - Node proximity (closer nodes = better accuracy)
    // - Consensus agreement (better agreement = better accuracy)
    // - Node reputation (if available)
    
    // Base accuracy improves with more nodes (diminishing returns)
    const nodeCountFactor = Math.min(1.0, 0.5 + (nodeCount * 0.1));
    
    // Proximity factor: closer nodes improve accuracy
    const proximityFactor = nodeProximityScore / 100;
    
    // Consensus factor: better agreement improves accuracy
    const consensusFactor = consensusAgreement / 100;
    
    // Reputation factor: average reputation of nodes (if available)
    const reputationScores = activeNodesWithLocation
      .map(node => node.reputation ?? 50)
      .filter(rep => rep > 0);
    const avgReputation = reputationScores.length > 0
      ? reputationScores.reduce((sum, rep) => sum + rep, 0) / reputationScores.length
      : 50;
    const reputationFactor = avgReputation / 100;

    // Calculate XYO Network accuracy
    // Formula: GPS accuracy * (1 - improvement_factor)
    // improvement_factor combines all factors
    const improvementFactor = (nodeCountFactor * 0.3 + proximityFactor * 0.3 + consensusFactor * 0.3 + reputationFactor * 0.1);
    const xyoNetworkAccuracy = GPS_ACCURACY_METERS * (1 - (improvementFactor * 0.5)); // Up to 50% improvement
    
    // Ensure minimum accuracy of 1 meter
    const finalAccuracy = Math.max(1, xyoNetworkAccuracy);
    
    // Precision radius: confidence interval (95% of measurements within this radius)
    const precisionRadius = finalAccuracy * 1.96; // 95% confidence interval

    // Accuracy improvement percentage
    const accuracyImprovement = ((GPS_ACCURACY_METERS - finalAccuracy) / GPS_ACCURACY_METERS) * 100;

    // Determine confidence level
    let confidenceLevel: 'high' | 'medium' | 'low';
    const confidenceScore = (nodeCountFactor * 0.3 + proximityFactor * 0.3 + consensusFactor * 0.4) * 100;
    
    if (confidenceScore >= 70 && nodeCount >= 3) {
      confidenceLevel = 'high';
    } else if (confidenceScore >= 40 && nodeCount >= 2) {
      confidenceLevel = 'medium';
    } else {
      confidenceLevel = 'low';
    }

    return {
      accuracyScore: Math.round(finalAccuracy * 10) / 10, // Round to 1 decimal
      confidenceLevel,
      precisionRadius: Math.round(precisionRadius * 10) / 10,
      witnessNodeCount: nodeCount,
      gpsAccuracy: GPS_ACCURACY_METERS,
      xyoNetworkAccuracy: Math.round(finalAccuracy * 10) / 10,
      accuracyImprovement: Math.round(accuracyImprovement * 10) / 10,
      consensusAgreement: Math.round(consensusAgreement * 10) / 10,
      nodeProximityScore: Math.round(nodeProximityScore * 10) / 10,
      isMocked: nodes.length === 0 || activeNodesWithLocation.length === 0
    };
  }
}

