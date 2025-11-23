import axios from 'axios';

import type { DeliveryRecord } from '@shared/types/delivery.types';
import type { ProofVerificationResult, DivinerVerificationResult, LocationAccuracyResult } from '@shared/types/xyo.types';

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL
});

// Authentication helper functions (must be defined before interceptor)
function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

function getConfigToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('configToken');
}

export function isAuthenticated(): boolean {
  return getToken() !== null;
}

export function isConfigAuthenticated(): boolean {
  return getConfigToken() !== null;
}

export function logout(): void {
  localStorage.removeItem('token');
  localStorage.removeItem('driverId');
}

export function configLogout(): void {
  localStorage.removeItem('configToken');
  localStorage.removeItem('configUsername');
}

// Add request interceptor to include auth token
apiClient.interceptors.request.use(
  (config) => {
    // Check if this is a configuration endpoint
    const isConfigEndpoint = config.url?.includes('/configuration') || config.url?.includes('/server-status');
    
    if (isConfigEndpoint) {
      // Use configuration token for config endpoints
      const configToken = getConfigToken();
      if (configToken && config.headers) {
        config.headers.Authorization = `Bearer ${configToken}`;
      }
    } else {
      // Use driver token for other endpoints
      const token = getToken();
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Authentication functions
export async function login(driverId: string, password: string): Promise<{
  success: boolean;
  token?: string;
  driverId?: string;
  error?: string;
}> {
  if (!apiClient.defaults.baseURL) {
    throw new Error('NEXT_PUBLIC_API_URL is not configured');
  }

  try {
    const response = await apiClient.post('/api/auth/login', {
      driverId,
      password
    });

    if (response.data.success && response.data.token) {
      return {
        success: true,
        token: response.data.token,
        driverId: response.data.driverId
      };
    } else {
      return {
        success: false,
        error: response.data.error || 'Login failed'
      };
    }
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      return {
        success: false,
        error: error.response.data?.error || 'Invalid credentials'
      };
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to authenticate'
    };
  }
}

// Configuration authentication functions
export async function configLogin(username: string, password: string): Promise<{
  success: boolean;
  token?: string;
  username?: string;
  error?: string;
}> {
  if (!apiClient.defaults.baseURL) {
    throw new Error('NEXT_PUBLIC_API_URL is not configured');
  }

  try {
    const response = await apiClient.post('/api/auth/config/login', {
      username,
      password
    });

    if (response.data.success && response.data.token) {
      return {
        success: true,
        token: response.data.token,
        username: response.data.username
      };
    } else {
      return {
        success: false,
        error: response.data.error || 'Login failed'
      };
    }
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      return {
        success: false,
        error: error.response.data?.error || 'Invalid credentials'
      };
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to authenticate'
    };
  }
}

export async function fetchDeliveries(): Promise<DeliveryRecord[]> {
  if (!apiClient.defaults.baseURL) {
    throw new Error('NEXT_PUBLIC_API_URL is not configured');
  }

  const response = await apiClient.get<{ deliveries: DeliveryRecord[] }>('/api/deliveries');
  return response.data.deliveries ?? [];
}

export async function fetchDeliveryByProof(proofHash: string): Promise<DeliveryRecord> {
  if (!apiClient.defaults.baseURL) {
    throw new Error('NEXT_PUBLIC_API_URL is not configured');
  }

  const response = await apiClient.get<DeliveryRecord>(`/api/deliveries/by-proof/${proofHash}`);
  return response.data;
}

export async function fetchDeliveryById(id: string): Promise<DeliveryRecord> {
  if (!apiClient.defaults.baseURL) {
    throw new Error('NEXT_PUBLIC_API_URL is not configured');
  }

  const response = await apiClient.get<DeliveryRecord>(`/api/deliveries/${id}`);
  return response.data;
}

export async function fetchProofDetails(proofHash: string): Promise<ProofVerificationResult> {
  if (!apiClient.defaults.baseURL) {
    throw new Error('NEXT_PUBLIC_API_URL is not configured');
  }

  const response = await apiClient.get<ProofVerificationResult>(`/api/proofs/${proofHash}`);
  return response.data;
}

export async function fetchActualBlockNumber(proofHash: string): Promise<{ transactionHash: string; actualBlockNumber: number | null; isCommitted: boolean }> {
  if (!apiClient.defaults.baseURL) {
    throw new Error('NEXT_PUBLIC_API_URL is not configured');
  }

  const response = await apiClient.get<{ transactionHash: string; actualBlockNumber: number | null; isCommitted: boolean }>(`/api/proofs/${proofHash}/actual-block`);
  return response.data;
}

export async function validateBoundWitness(proofHash: string): Promise<{ isValid: boolean; errors: string[] }> {
  if (!apiClient.defaults.baseURL) {
    throw new Error('NEXT_PUBLIC_API_URL is not configured');
  }

  const response = await apiClient.get<{ isValid: boolean; errors: string[] }>(`/api/proofs/${proofHash}/validate`);
  return response.data;
}

export async function fetchDivinerVerification(proofHash: string): Promise<DivinerVerificationResult> {
  if (!apiClient.defaults.baseURL) {
    throw new Error('NEXT_PUBLIC_API_URL is not configured');
  }

  const response = await apiClient.get<DivinerVerificationResult>(`/api/proofs/${proofHash}/diviner`);
  return response.data;
}

export async function fetchBoundWitnessChain(proofHash: string, maxDepth: number = 5): Promise<{ chain: unknown[]; depth: number }> {
  if (!apiClient.defaults.baseURL) {
    throw new Error('NEXT_PUBLIC_API_URL is not configured');
  }

  const response = await apiClient.get<{ chain: unknown[]; depth: number }>(`/api/proofs/${proofHash}/chain`, {
    params: { depth: maxDepth }
  });
  return response.data;
}

export interface CryptographicDetails {
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
}

export async function fetchCryptographicDetails(proofHash: string): Promise<CryptographicDetails> {
  if (!apiClient.defaults.baseURL) {
    throw new Error('NEXT_PUBLIC_API_URL is not configured');
  }

  const response = await apiClient.get<CryptographicDetails>(`/api/proofs/${proofHash}/crypto`);
  return response.data;
}

export async function fetchLocationAccuracy(proofHash: string): Promise<LocationAccuracyResult> {
  if (!apiClient.defaults.baseURL) {
    throw new Error('NEXT_PUBLIC_API_URL is not configured');
  }

  const response = await apiClient.get<LocationAccuracyResult>(`/api/proofs/${proofHash}/accuracy`);
  return response.data;
}

// Network Statistics and Witness Nodes
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
}

export interface WitnessNodeDetails {
  address: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  type?: 'sentinel' | 'bridge' | 'diviner';
  verified: boolean;
  status: 'active' | 'inactive' | 'unknown';
  reputation?: number;
  participationHistory?: {
    totalQueries: number;
    successfulQueries: number;
    lastSeen: number;
  };
  metadata?: Record<string, unknown>;
}

export async function fetchNetworkStatistics(): Promise<NetworkStatistics> {
  if (!apiClient.defaults.baseURL) {
    throw new Error('NEXT_PUBLIC_API_URL is not configured');
  }

  const response = await apiClient.get<NetworkStatistics>('/api/network/statistics');
  return response.data;
}

export async function fetchWitnessNodes(filters?: {
  type?: 'sentinel' | 'bridge' | 'diviner';
  status?: 'active' | 'inactive';
  minLat?: number;
  maxLat?: number;
  minLon?: number;
  maxLon?: number;
}): Promise<WitnessNodeDetails[]> {
  if (!apiClient.defaults.baseURL) {
    throw new Error('NEXT_PUBLIC_API_URL is not configured');
  }

  const response = await apiClient.get<WitnessNodeDetails[]>('/api/network/nodes', {
    params: filters
  });
  return response.data;
}

export async function fetchWitnessNodeInfo(nodeAddress: string): Promise<WitnessNodeDetails> {
  if (!apiClient.defaults.baseURL) {
    throw new Error('NEXT_PUBLIC_API_URL is not configured');
  }

  const response = await apiClient.get<WitnessNodeDetails>(`/api/network/nodes/${nodeAddress}`);
  return response.data;
}

// Configuration Management
export interface ConfigurationItem {
  category: 'backend' | 'web' | 'mobile';
  key: string;
  value: string | null;
  description?: string | null;
  isSecret?: boolean;
}

export interface ConfigurationUpdate {
  key: string;
  value: string | null;
  description?: string | null;
  isSecret?: boolean;
}

export async function fetchConfiguration(category?: 'backend' | 'web' | 'mobile'): Promise<
  | {
      success: boolean;
      category: string;
      configuration: ConfigurationItem[];
    }
  | {
      success: boolean;
      configuration: {
        backend: ConfigurationItem[];
        web: ConfigurationItem[];
        mobile: ConfigurationItem[];
      };
    }
> {
  if (!apiClient.defaults.baseURL) {
    throw new Error('NEXT_PUBLIC_API_URL is not configured');
  }

  if (!isConfigAuthenticated()) {
    throw new Error('Configuration authentication required');
  }

  const url = category ? `/api/configuration/${category}` : '/api/configuration';
  const response = await apiClient.get(url);
  return response.data;
}

export async function updateConfiguration(
  category: 'backend' | 'web' | 'mobile',
  updates: ConfigurationUpdate[]
): Promise<{ success: boolean; message: string; updated: number; errors?: string[] }> {
  if (!apiClient.defaults.baseURL) {
    throw new Error('NEXT_PUBLIC_API_URL is not configured');
  }

  if (!isConfigAuthenticated()) {
    throw new Error('Configuration authentication required');
  }

  const response = await apiClient.put(`/api/configuration/${category}`, { updates });
  return response.data;
}

export async function deleteConfiguration(
  category: 'backend' | 'web' | 'mobile',
  key: string
): Promise<{ success: boolean; message: string }> {
  if (!apiClient.defaults.baseURL) {
    throw new Error('NEXT_PUBLIC_API_URL is not configured');
  }

  if (!isConfigAuthenticated()) {
    throw new Error('Configuration authentication required');
  }

  const response = await apiClient.delete(`/api/configuration/${category}/${key}`);
  return response.data;
}

export async function initializeConfiguration(): Promise<{ success: boolean; message: string }> {
  if (!apiClient.defaults.baseURL) {
    throw new Error('NEXT_PUBLIC_API_URL is not configured');
  }

  if (!isConfigAuthenticated()) {
    throw new Error('Configuration authentication required');
  }

  const response = await apiClient.post('/api/configuration/initialize', {});
  return response.data;
}

// Server Status
export interface ServiceStatus {
  name: string;
  status: 'running' | 'stopped' | 'unknown';
  url?: string;
  port?: number;
  lastChecked: string;
  error?: string;
}

export async function fetchServerStatus(): Promise<{
  success: boolean;
  services: {
    backend: ServiceStatus;
    web: ServiceStatus;
    mobile: ServiceStatus;
    archivist?: ServiceStatus;
    diviner?: ServiceStatus;
  };
}> {
  if (!apiClient.defaults.baseURL) {
    throw new Error('NEXT_PUBLIC_API_URL is not configured');
  }

  if (!isConfigAuthenticated()) {
    throw new Error('Configuration authentication required');
  }

  const response = await apiClient.get('/api/server-status');
  return response.data;
}

