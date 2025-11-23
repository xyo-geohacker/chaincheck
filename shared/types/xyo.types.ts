export interface ArchivistSubmissionResult {
  success: boolean;
  data?: unknown;
  error?: string | null;
  // Off-chain payload data retrieved from Archivist after XL1 transaction
  offChainPayload?: unknown;
}

export interface LocationProofDetails {
  proofHash: string;
  blockNumber?: number;
  boundWitness: unknown;
  archivistResponse?: ArchivistSubmissionResult;
  // XL1 Transaction fields
  xl1TransactionHash?: string; // On-chain bound witness hash (for blockchain proof)
  archivistBoundWitnessHash?: string; // Off-chain bound witness hash (for Diviner queries - different from XL1 hash)
  xl1BlockNumber?: number;
  xl1Nbf?: number; // Not before block (expected block range start)
  xl1Exp?: number; // Expiration block (expected block range end)
  xl1ActualBlockNumber?: number | null; // Actual block number if transaction has been committed
  isXL1?: boolean;
  isMocked?: boolean; // Indicates if this is a mock transaction for development
}

export interface ProofVerificationResult {
  isValid: boolean;
  data: unknown;
}

export interface DivinerVerificationResult {
  verified: boolean;
  confidence: number; // 0-100
  nodeCount: number;
  consensus: 'high' | 'medium' | 'low';
  locationMatch: boolean;
  distanceFromClaimed?: number; // meters
  timestamp: number;
  isMocked?: boolean; // Indicates if this is mock data for development
  details?: {
    divinerResponse?: unknown;
    witnessNodes?: WitnessNodeInfo[];
    locationData?: LocationData;
    // XL1 transaction reference for cross-validation with blockchain proof
    xl1TransactionHash?: string;
    xl1BlockNumber?: number;
  };
}

export interface WitnessNodeInfo {
  address: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  type?: 'sentinel' | 'bridge' | 'diviner';
  verified: boolean;
}

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy?: number; // meters
  timestamp: number;
  source: 'diviner' | 'gps' | 'network';
}

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

export interface LocationAccuracyResult {
  accuracyScore: number; // meters (e.g., ±5 meters)
  confidenceLevel: 'high' | 'medium' | 'low';
  precisionRadius: number; // meters
  witnessNodeCount: number;
  gpsAccuracy: number; // meters (typical GPS accuracy)
  xyoNetworkAccuracy: number; // meters (calculated XYO Network accuracy)
  accuracyImprovement: number; // percentage improvement over GPS
  consensusAgreement: number; // 0-100, how well nodes agree
  nodeProximityScore: number; // 0-100, average proximity of nodes to location
  isMocked?: boolean;
}

