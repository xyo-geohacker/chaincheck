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
         
        console.log('Successfully retrieved bound witness from XL1 blockchain via viewer');
        return {
          isValid: true,
          data: xl1Result.boundWitness
        };
      }
    } catch (error) {
       
      console.debug('XL1 viewer query failed, trying Archivist:', error);
    }

    // PRIORITY 2: Fall back to Archivist (for non-XL1 or if XL1 query fails)
    // Skip if Archivist is disabled
    if (env.xyoArchivistDisabled) {
       
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
         
        console.log('Using stored real transaction data for chain');
        const bw = storedData.boundWitness;
        if (Array.isArray(bw) && bw.length > 0) {
          const boundWitness = bw[0];
          const chain: unknown[] = [boundWitness];
          
          // Follow the chain using XL1 viewer
          // IMPORTANT: previous_hashes is address-indexed. previous_hashes[i] corresponds to addresses[i]
          const bwObj = boundWitness as Record<string, unknown>;
          if ('previous_hashes' in bwObj && Array.isArray(bwObj.previous_hashes) && 
              'addresses' in bwObj && Array.isArray(bwObj.addresses) && 
              bwObj.addresses.length > 0) {
            const addresses = bwObj.addresses as string[];
            const previousHashes = bwObj.previous_hashes as (string | null)[];
            
            // Use the first address's previous hash (for backward compatibility)
            // In the future, we might want to track a specific address
            const trackingAddress = addresses[0];
            const previousHash = previousHashes.length > 0 ? previousHashes[0] : null;
            
            if (previousHash && typeof previousHash === 'string' && previousHash !== '' && !/^0+$/.test(previousHash)) {
              // Continue chain from previous hash using XL1 viewer, tracking the same address
              const remainingChain = await this.xl1ViewerService.getBoundWitnessChainFromXL1(previousHash, maxDepth - 1, trackingAddress);
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
         
        console.log(`Successfully retrieved ${xl1Chain.length} transactions from XL1 chain via viewer`);
        return xl1Chain;
      }
    } catch (error) {
       
      console.debug('XL1 viewer chain query failed, trying Archivist:', error);
    }

    // PRIORITY 3: Fall back to Archivist (for non-XL1 or if XL1 query fails)
    // Skip if Archivist is disabled
    if (env.xyoArchivistDisabled) {
       
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
         
        console.log('Using stored real transaction data for cryptographic details');
        return this.archivistService.getCryptographicDetails(proofHash, storedBoundWitnessData);
      }
    }

    // PRIORITY 2: Try XL1 viewer (for XL1 transactions)
    // XL1 blockchain is the source of truth
    try {
      const xl1Result = await this.xl1ViewerService.getBoundWitnessFromXL1(proofHash);
      if (xl1Result && xl1Result.boundWitness) {
         
        console.log('Successfully retrieved bound witness from XL1 blockchain via viewer for cryptographic details');
        // Extract details from XL1 bound witness
        return this.archivistService.getCryptographicDetails(proofHash, xl1Result.boundWitness);
      }
    } catch (error) {
       
      console.debug('XL1 viewer query failed, trying Archivist:', error);
    }

    // PRIORITY 3: Fall back to Archivist (for non-XL1 or if XL1 query fails)
    // Skip if Archivist is disabled
    if (env.xyoArchivistDisabled) {
       
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
   * @param destinationLat Optional destination latitude for actual delivery accuracy
   * @param destinationLon Optional destination longitude for actual delivery accuracy
   * @param distanceFromDest Optional pre-calculated distance from destination in meters
   * @param isRealXL1Transaction Optional flag indicating if this is a real XL1 transaction (from stored data)
   * @returns LocationAccuracyResult with accuracy score, confidence level, and precision metrics
   */
  async calculateLocationAccuracy(
    latitude: number,
    longitude: number,
    witnessNodes: WitnessNodeDetails[] = [],
    proofHash?: string,
    destinationLat?: number | null,
    destinationLon?: number | null,
    distanceFromDest?: number | null,
    isRealXL1Transaction?: boolean
  ): Promise<LocationAccuracyResult> {
    // Typical GPS accuracy (varies by device and conditions)
    const GPS_ACCURACY_METERS = 10;

    // Track if we're using real XL1 data
    // Use the passed flag first (from stored delivery data), then try to verify via XL1 query
    let hasXL1Data = isRealXL1Transaction === true;
    let xl1Addresses: string[] = [];

    // Always try to extract XL1 data if proofHash is provided (to determine if data is real)
    // This allows us to mark the result as not mocked even if witness nodes don't have location data
    // Only query XL1 if we don't already know it's a real transaction (to avoid unnecessary queries)
    if (proofHash && !hasXL1Data) {
      try {
         
        console.log('[Location Accuracy] Checking for XL1 transaction data');
        const xl1Data = await this.xl1ViewerService.getBoundWitnessFromXL1(proofHash);
        
        if (xl1Data && xl1Data.boundWitness) {
          hasXL1Data = true;
          const boundWitness = xl1Data.boundWitness as Record<string, unknown>;
          
          // Extract addresses from bound witness
          if ('addresses' in boundWitness && Array.isArray(boundWitness.addresses)) {
            xl1Addresses = boundWitness.addresses as string[];
            
             
            console.log(`[Location Accuracy] Found XL1 transaction with ${xl1Addresses.length} participant addresses`);
          }
        }
      } catch (error) {
         
        console.warn('[Location Accuracy] Failed to check XL1 transaction:', error);
      }
    } else if (hasXL1Data) {
       
      console.log('[Location Accuracy] Using real XL1 transaction data (from stored delivery data)');
    }

    // If no witness nodes provided, try to extract from XL1 transaction
    let nodes = witnessNodes;
    if (nodes.length === 0 && proofHash && hasXL1Data) {
      try {
         
        console.log('[Location Accuracy] Attempting to extract witness nodes from XL1 transaction');
        const xl1Data = await this.xl1ViewerService.getBoundWitnessFromXL1(proofHash);
        
        if (xl1Data && xl1Data.boundWitness) {
          const boundWitness = xl1Data.boundWitness as Record<string, unknown>;
          
          // Extract addresses from bound witness (we already have xl1Addresses, but need to process them)
          if ('addresses' in boundWitness && Array.isArray(boundWitness.addresses)) {
            // Extract signatures to verify
            const signatures: string[] = [];
            if ('$signatures' in boundWitness && Array.isArray(boundWitness.$signatures)) {
              signatures.push(...(boundWitness.$signatures as string[]));
            }
            const signaturesValid = signatures.length > 0 && signatures.length >= xl1Addresses.length;
            
            // Try to look up addresses in network service to get location data
            const nodesWithLocation: WitnessNodeDetails[] = [];
            for (const address of xl1Addresses) {
              try {
                // Try to get node info from network service (may not have location)
                const allNodes = await this.networkService.getAllWitnessNodes({});
                const nodeInfo = allNodes.find(n => n.address?.toLowerCase() === address.toLowerCase());
                if (nodeInfo && nodeInfo.location) {
                  nodesWithLocation.push({
                    ...nodeInfo,
                    verified: signaturesValid,
                    status: 'active' as const
                  });
                } else {
                  // Add node without location (will be filtered later)
                  nodesWithLocation.push({
                    address,
                    type: xl1Addresses.indexOf(address) === 0 ? 'bridge' : 'sentinel',
                    verified: signaturesValid,
                    status: 'active' as const
                  });
                }
              } catch (error) {
                // Address not found in network service, add without location
                nodesWithLocation.push({
                  address,
                  type: xl1Addresses.indexOf(address) === 0 ? 'bridge' : 'sentinel',
                  verified: signaturesValid,
                  status: 'active' as const
                });
              }
            }
            
            nodes = nodesWithLocation;
            
             
            console.log(`[Location Accuracy] Extracted ${nodes.length} witness nodes from XL1 transaction (${nodes.filter(n => n.location).length} with location data)`);
          }
        }
      } catch (error) {
         
        console.warn('[Location Accuracy] Failed to extract witness nodes from XL1 transaction:', error);
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
         
        console.warn('Failed to fetch nearby witness nodes for accuracy calculation:', error);
      }
    }

    // Filter to only active nodes with location data
    const activeNodesWithLocation = nodes.filter(
      node => node.status === 'active' && node.location?.latitude && node.location?.longitude
    );

    const nodeCount = activeNodesWithLocation.length;

    // Calculate actual delivery accuracy if destination is provided
    let actualDeliveryAccuracy: number | null = null;
    if (distanceFromDest !== null && distanceFromDest !== undefined) {
      actualDeliveryAccuracy = distanceFromDest;
    } else if (destinationLat !== null && destinationLat !== undefined && 
               destinationLon !== null && destinationLon !== undefined) {
      actualDeliveryAccuracy = haversineDistance(
        latitude,
        longitude,
        destinationLat,
        destinationLon
      );
    }

    // If no nodes available, but we have XL1 data or actual delivery accuracy, use that
    if (nodeCount === 0) {
      // If we have actual delivery accuracy, use that as the accuracy score
      if (actualDeliveryAccuracy !== null) {
        const finalAccuracy = Math.max(1, actualDeliveryAccuracy);
        // Precision radius is based on actual delivery accuracy (distance from destination)
        // This is a real metric even without witness nodes
        const precisionRadius = Math.round(finalAccuracy * 1.96 * 10) / 10; // 95% confidence interval
        
        // Calculate participant count
        // If we have XL1 data, there's at least 1 participant (the driver)
        let participantCount = xl1Addresses.length;
        if (hasXL1Data && participantCount === 0) {
          participantCount = 1; // At least the driver participated
        }

        return {
          accuracyScore: Math.round(finalAccuracy * 10) / 10,
          confidenceLevel: hasXL1Data ? 'medium' : 'low',
          precisionRadius: precisionRadius,
          witnessNodeCount: participantCount, // Total participants (driver + witness nodes)
          gpsAccuracy: GPS_ACCURACY_METERS,
          xyoNetworkAccuracy: Math.round(finalAccuracy * 10) / 10,
          accuracyImprovement: actualDeliveryAccuracy < GPS_ACCURACY_METERS 
            ? Math.round(((GPS_ACCURACY_METERS - finalAccuracy) / GPS_ACCURACY_METERS) * 100 * 10) / 10
            : 0,
          consensusAgreement: 0, // Cannot calculate consensus without witness nodes
          nodeProximityScore: 0, // Cannot calculate proximity without witness nodes
          isMocked: !hasXL1Data // Not mocked if we have XL1 data
        };
      }
      
      // Default fallback - no nodes and no delivery accuracy data
      // Calculate participant count
      let participantCount = xl1Addresses.length;
      if (hasXL1Data && participantCount === 0) {
        participantCount = 1; // At least the driver participated
      }

      return {
        accuracyScore: GPS_ACCURACY_METERS,
        confidenceLevel: 'low',
        precisionRadius: GPS_ACCURACY_METERS,
        witnessNodeCount: participantCount, // Total participants (driver + witness nodes)
        gpsAccuracy: GPS_ACCURACY_METERS,
        xyoNetworkAccuracy: GPS_ACCURACY_METERS,
        accuracyImprovement: 0,
        consensusAgreement: 0, // Cannot calculate without nodes
        nodeProximityScore: 0, // Cannot calculate without nodes
        isMocked: !hasXL1Data
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

    // IMPORTANT: XYO Network does NOT improve GPS location accuracy
    // The XYO Network cryptographically verifies the location data provided by the phone's GPS
    // It does not measure location independently, so it cannot improve upon GPS accuracy
    // 
    // The meaningful accuracy metric is the actual delivery accuracy (distance from destination)
    // This shows how accurately the driver reached the intended delivery location
    
    // Use actual delivery accuracy if available, otherwise use GPS accuracy
    // The XYO Network provides verification strength, not location accuracy improvement
    let finalAccuracy: number;
    let precisionRadius: number;
    let accuracyImprovement: number;
    
    if (actualDeliveryAccuracy !== null) {
      // Use actual delivery accuracy (real metric based on distance from destination)
      finalAccuracy = Math.max(1, actualDeliveryAccuracy);
      precisionRadius = Math.round(finalAccuracy * 1.96 * 10) / 10; // 95% confidence interval
      accuracyImprovement = actualDeliveryAccuracy < GPS_ACCURACY_METERS 
        ? Math.round(((GPS_ACCURACY_METERS - finalAccuracy) / GPS_ACCURACY_METERS) * 100 * 10) / 10
        : 0;
    } else {
      // No actual delivery accuracy data - use GPS accuracy as baseline
      // XYO Network doesn't improve this, it just verifies it
      finalAccuracy = GPS_ACCURACY_METERS;
      precisionRadius = Math.round(GPS_ACCURACY_METERS * 1.96 * 10) / 10; // 95% confidence interval
      accuracyImprovement = 0; // No improvement - XYO verifies, doesn't measure
    }

    // Determine confidence level based on verification strength
    // This reflects how well the data is verified, not location accuracy
    let confidenceLevel: 'high' | 'medium' | 'low';
    
    if (nodeCount >= 3 && consensusAgreement >= 70) {
      confidenceLevel = 'high'; // Strong verification with multiple nodes
    } else if (nodeCount >= 2 && consensusAgreement >= 40) {
      confidenceLevel = 'medium'; // Moderate verification
    } else if (hasXL1Data) {
      confidenceLevel = 'medium'; // XL1 blockchain verification provides medium confidence
    } else {
      confidenceLevel = 'low'; // Minimal or no verification
    }
    
    // Final accuracy score is the actual delivery accuracy (if available) or GPS accuracy
    const finalAccuracyScore = finalAccuracy;

    // Calculate participant count
    // XL1 bound witnesses include ALL participants (driver + witness nodes)
    // If we have XL1 data, there's at least 1 participant (the driver)
    // If we have addresses from XL1, use that count; otherwise, if we have XL1 data, count at least 1
    let participantCount = Math.max(nodeCount, xl1Addresses.length);
    if (hasXL1Data && participantCount === 0) {
      // If we have XL1 data but no addresses extracted, there's still at least the driver
      participantCount = 1;
    }

    return {
      accuracyScore: Math.round(finalAccuracyScore * 10) / 10, // Round to 1 decimal
      confidenceLevel,
      precisionRadius: Math.round(precisionRadius * 10) / 10,
      witnessNodeCount: participantCount, // Total participants (driver + witness nodes)
      gpsAccuracy: GPS_ACCURACY_METERS,
      // XYO Network accuracy is the same as the actual accuracy - XYO verifies, doesn't improve GPS
      xyoNetworkAccuracy: Math.round(finalAccuracyScore * 10) / 10,
      accuracyImprovement: Math.round(accuracyImprovement * 10) / 10,
      consensusAgreement: Math.round(consensusAgreement * 10) / 10,
      nodeProximityScore: Math.round(nodeProximityScore * 10) / 10,
      isMocked: !hasXL1Data && (nodes.length === 0 || activeNodesWithLocation.length === 0)
    };
  }
}

