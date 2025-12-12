export interface ArchivistSubmissionResult {
    success: boolean;
    data?: unknown;
    error?: string | null;
    offChainPayload?: unknown;
}
export interface LocationProofDetails {
    proofHash: string;
    blockNumber?: number;
    boundWitness: unknown;
    archivistResponse?: ArchivistSubmissionResult;
    xl1TransactionHash?: string;
    archivistBoundWitnessHash?: string;
    xl1BlockNumber?: number;
    xl1Nbf?: number;
    xl1Exp?: number;
    xl1ActualBlockNumber?: number | null;
    isXL1?: boolean;
    isMocked?: boolean;
}
export interface ProofVerificationResult {
    isValid: boolean;
    data: unknown;
    errors?: string[];
}
export interface DivinerVerificationResult {
    verified: boolean;
    confidence: number;
    nodeCount: number;
    consensus: 'high' | 'medium' | 'low';
    locationMatch: boolean;
    distanceFromClaimed?: number;
    timestamp: number;
    isMocked?: boolean;
    details?: {
        divinerResponse?: unknown;
        witnessNodes?: WitnessNodeInfo[];
        locationData?: LocationData;
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
    accuracy?: number;
    timestamp: number;
    source: 'diviner' | 'gps' | 'network' | 'xl1';
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
    deliveries?: {
        total: number;
        verified: number;
        uniqueDrivers: number;
        uniqueLocations: number;
    };
}
export interface WitnessNodeDetails extends WitnessNodeInfo {
    status: 'active' | 'inactive' | 'unknown';
    reputation?: number;
    participationHistory?: {
        totalQueries: number;
        successfulQueries: number;
        lastSeen: number;
    };
    metadata?: Record<string, unknown>;
}
export interface LocationAccuracyResult {
    accuracyScore: number;
    confidenceLevel: 'high' | 'medium' | 'low';
    precisionRadius: number;
    witnessNodeCount: number;
    gpsAccuracy: number;
    xyoNetworkAccuracy: number;
    accuracyImprovement: number;
    consensusAgreement: number;
    nodeProximityScore: number;
    isMocked?: boolean;
}
