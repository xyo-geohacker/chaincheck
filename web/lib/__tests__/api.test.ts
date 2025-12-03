// Mock axios BEFORE importing api module
// Create the mock instance directly in the factory to avoid hoisting issues
jest.mock('axios', () => {
  // Create the mock instance inside the factory function
  const mockAxiosInstance = {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    defaults: {
      baseURL: 'http://localhost:4000'
    },
    interceptors: {
      request: {
        use: jest.fn()
      },
      response: {
        use: jest.fn()
      }
    }
  };

  const isAxiosErrorFn = jest.fn((error: any) => {
    return error && error.isAxiosError === true;
  });

  return {
    __esModule: true,
    default: {
      create: jest.fn(() => mockAxiosInstance),
      // Add isAxiosError static method
      isAxiosError: isAxiosErrorFn,
      // Export the instance so tests can access it
      __mockAxiosInstance: mockAxiosInstance
    },
    // Also export isAxiosError at module level for compatibility
    isAxiosError: isAxiosErrorFn
  };
});

import axios from 'axios';
import {
  isAuthenticated,
  isConfigAuthenticated,
  logout,
  configLogout,
  login,
  configLogin,
  fetchDeliveries,
  fetchDeliveryByProof,
  fetchDeliveryById,
  fetchProofDetails,
  fetchActualBlockNumber,
  validateBoundWitness,
  fetchDivinerVerification,
  fetchBoundWitnessChain,
  fetchCryptographicDetails,
  fetchLocationAccuracy,
  fetchROIMetrics,
  fetchNetworkStatistics,
  fetchWitnessNodes,
  fetchWitnessNodeInfo,
  fetchConfiguration,
  updateConfiguration,
  deleteConfiguration,
  initializeConfiguration,
  fetchServerStatus
} from '../api';

// Helper to get the mocked axios instance
const getMockAxiosInstance = () => {
  // Access the instance from the mocked axios module
  return (axios as any).__mockAxiosInstance || (axios.create as jest.Mock)();
};

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    }
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Set environment variable for tests
process.env.NEXT_PUBLIC_API_URL = 'http://localhost:4000';

// Mock window.location
// In jsdom, window.location is read-only and non-configurable
// We'll set properties in beforeEach instead of at the top level
const mockLocation = {
  protocol: 'http:',
  href: 'http://localhost:3000'
};

describe('api', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
    // Reset window.location.protocol (only property we actually use)
    // In jsdom, we can't redefine location, but we can try to set individual properties
    // Note: We don't set href as it triggers navigation which jsdom doesn't support
    if (typeof window !== 'undefined' && window.location) {
      try {
        // Try to set protocol using defineProperty
        Object.defineProperty(window.location, 'protocol', {
          value: mockLocation.protocol,
          writable: true,
          configurable: true
        });
      } catch (e) {
        // If we can't update location, that's okay - tests will use default
      }
    }
    // Reset mock functions and ensure baseURL is set
    const instance = getMockAxiosInstance();
    if (instance) {
      instance.get.mockClear();
      instance.post.mockClear();
      instance.put.mockClear();
      instance.delete.mockClear();
      // Ensure baseURL is set for all tests
      instance.defaults.baseURL = 'http://localhost:4000';
    }
  });

  describe('Authentication helpers', () => {
    describe('isAuthenticated', () => {
      it('should return true when token exists', () => {
        localStorageMock.setItem('token', 'test-token');
        expect(isAuthenticated()).toBe(true);
      });

      it('should return false when token does not exist', () => {
        expect(isAuthenticated()).toBe(false);
      });
    });

    describe('isConfigAuthenticated', () => {
      it('should return true when configToken exists', () => {
        localStorageMock.setItem('configToken', 'test-config-token');
        expect(isConfigAuthenticated()).toBe(true);
      });

      it('should return false when configToken does not exist', () => {
        expect(isConfigAuthenticated()).toBe(false);
      });
    });

    describe('logout', () => {
      it('should remove token and driverId from localStorage', () => {
        localStorageMock.setItem('token', 'test-token');
        localStorageMock.setItem('driverId', 'driver-001');

        logout();

        expect(localStorageMock.getItem('token')).toBeNull();
        expect(localStorageMock.getItem('driverId')).toBeNull();
      });
    });

    describe('configLogout', () => {
      it('should remove configToken and configUsername from localStorage', () => {
        localStorageMock.setItem('configToken', 'test-token');
        localStorageMock.setItem('configUsername', 'admin');

        configLogout();

        expect(localStorageMock.getItem('configToken')).toBeNull();
        expect(localStorageMock.getItem('configUsername')).toBeNull();
      });
    });
  });

  describe('login', () => {
    it('should successfully login with valid credentials', async () => {
      const mockResponse = {
        data: {
          success: true,
          token: 'jwt-token',
          driverId: 'driver-001'
        }
      };
      getMockAxiosInstance().post.mockResolvedValue(mockResponse);

      const result = await login('driver-001', 'password123');

      expect(getMockAxiosInstance().post).toHaveBeenCalledWith('/api/auth/login', {
        driverId: 'driver-001',
        password: 'password123'
      });
      expect(result).toEqual({
        success: true,
        token: 'jwt-token',
        driverId: 'driver-001'
      });
    });

    it('should handle login failure', async () => {
      const mockResponse = {
        data: {
          success: false,
          error: 'Invalid credentials'
        }
      };
      getMockAxiosInstance().post.mockResolvedValue(mockResponse);

      const result = await login('driver-001', 'wrong-password');

      expect(result).toEqual({
        success: false,
        error: 'Invalid credentials'
      });
    });

    it('should handle API errors', async () => {
      const error = {
        isAxiosError: true,
        response: {
          data: { error: 'Server error' }
        }
      };
      getMockAxiosInstance().post.mockRejectedValue(error);

      const result = await login('driver-001', 'password123');

      expect(result).toEqual({
        success: false,
        error: 'Server error'
      });
    });

    it('should throw error when baseURL is not configured', async () => {
      getMockAxiosInstance().defaults.baseURL = undefined;

      await expect(login('driver-001', 'password123')).rejects.toThrow(
        'NEXT_PUBLIC_API_URL is not configured'
      );
    });
  });

  describe('configLogin', () => {
    it('should successfully login with valid credentials', async () => {
      const mockResponse = {
        data: {
          success: true,
          token: 'config-token',
          username: 'admin'
        }
      };
      getMockAxiosInstance().post.mockResolvedValue(mockResponse);

      const result = await configLogin('admin', 'password123');

      expect(getMockAxiosInstance().post).toHaveBeenCalledWith('/api/auth/config/login', {
        username: 'admin',
        password: 'password123'
      });
      expect(result).toEqual({
        success: true,
        token: 'config-token',
        username: 'admin'
      });
    });

    it('should handle login failure', async () => {
      const mockResponse = {
        data: {
          success: false,
          error: 'Invalid credentials'
        }
      };
      getMockAxiosInstance().post.mockResolvedValue(mockResponse);

      const result = await configLogin('admin', 'wrong-password');

      expect(result).toEqual({
        success: false,
        error: 'Invalid credentials'
      });
    });
  });

  describe('fetchDeliveries', () => {
    it('should fetch deliveries successfully', async () => {
      const mockDeliveries = [
        { id: '1', orderId: 'ORDER-001' },
        { id: '2', orderId: 'ORDER-002' }
      ];
      const mockResponse = {
        data: { deliveries: mockDeliveries }
      };
      getMockAxiosInstance().get.mockResolvedValue(mockResponse);

      const result = await fetchDeliveries();

      expect(getMockAxiosInstance().get).toHaveBeenCalledWith('/api/deliveries');
      expect(result).toEqual(mockDeliveries);
    });

    it('should return empty array when deliveries is null', async () => {
      const mockResponse = {
        data: { deliveries: null }
      };
      getMockAxiosInstance().get.mockResolvedValue(mockResponse);

      const result = await fetchDeliveries();

      expect(result).toEqual([]);
    });

    it('should throw error when baseURL is not configured', async () => {
      getMockAxiosInstance().defaults.baseURL = undefined;

      await expect(fetchDeliveries()).rejects.toThrow(
        'NEXT_PUBLIC_API_URL is not configured'
      );
    });
  });

  describe('fetchDeliveryByProof', () => {
    it('should fetch delivery by proof hash', async () => {
      const mockDelivery = { id: '1', proofHash: 'abc123' };
      const mockResponse = { data: mockDelivery };
      getMockAxiosInstance().get.mockResolvedValue(mockResponse);

      const result = await fetchDeliveryByProof('abc123');

      expect(getMockAxiosInstance().get).toHaveBeenCalledWith('/api/deliveries/by-proof/abc123');
      expect(result).toEqual(mockDelivery);
    });
  });

  describe('fetchDeliveryById', () => {
    it('should fetch delivery by ID', async () => {
      const mockDelivery = { id: 'delivery-001', orderId: 'ORDER-001' };
      const mockResponse = { data: mockDelivery };
      getMockAxiosInstance().get.mockResolvedValue(mockResponse);

      const result = await fetchDeliveryById('delivery-001');

      expect(getMockAxiosInstance().get).toHaveBeenCalledWith('/api/deliveries/delivery-001');
      expect(result).toEqual(mockDelivery);
    });
  });

  describe('fetchProofDetails', () => {
    it('should fetch proof details', async () => {
      const mockProof = { proofHash: 'abc123', isValid: true };
      const mockResponse = { data: mockProof };
      getMockAxiosInstance().get.mockResolvedValue(mockResponse);

      const result = await fetchProofDetails('abc123');

      expect(getMockAxiosInstance().get).toHaveBeenCalledWith('/api/proofs/abc123');
      expect(result).toEqual(mockProof);
    });
  });

  describe('fetchActualBlockNumber', () => {
    it('should fetch actual block number', async () => {
      const mockData = {
        transactionHash: '0x123',
        actualBlockNumber: 12345,
        isCommitted: true
      };
      const mockResponse = { data: mockData };
      getMockAxiosInstance().get.mockResolvedValue(mockResponse);

      const result = await fetchActualBlockNumber('abc123');

      expect(getMockAxiosInstance().get).toHaveBeenCalledWith('/api/proofs/abc123/actual-block');
      expect(result).toEqual(mockData);
    });
  });

  describe('validateBoundWitness', () => {
    it('should validate bound witness', async () => {
      const mockData = {
        isValid: true,
        errors: []
      };
      const mockResponse = { data: mockData };
      getMockAxiosInstance().get.mockResolvedValue(mockResponse);

      const result = await validateBoundWitness('abc123');

      expect(getMockAxiosInstance().get).toHaveBeenCalledWith('/api/proofs/abc123/validate');
      expect(result).toEqual(mockData);
    });
  });

  describe('fetchDivinerVerification', () => {
    it('should fetch diviner verification', async () => {
      const mockData = {
        verified: true,
        confidence: 0.95
      };
      const mockResponse = { data: mockData };
      getMockAxiosInstance().get.mockResolvedValue(mockResponse);

      const result = await fetchDivinerVerification('abc123');

      expect(getMockAxiosInstance().get).toHaveBeenCalledWith('/api/proofs/abc123/diviner');
      expect(result).toEqual(mockData);
    });
  });

  describe('fetchBoundWitnessChain', () => {
    it('should fetch bound witness chain with default depth', async () => {
      const mockData = {
        chain: [{ hash: 'abc123' }],
        depth: 1
      };
      const mockResponse = { data: mockData };
      getMockAxiosInstance().get.mockResolvedValue(mockResponse);

      const result = await fetchBoundWitnessChain('abc123');

      expect(getMockAxiosInstance().get).toHaveBeenCalledWith('/api/proofs/abc123/chain', {
        params: { depth: 5 }
      });
      expect(result).toEqual(mockData);
    });

    it('should fetch bound witness chain with custom depth', async () => {
      const mockData = {
        chain: [{ hash: 'abc123' }],
        depth: 3
      };
      const mockResponse = { data: mockData };
      getMockAxiosInstance().get.mockResolvedValue(mockResponse);

      const result = await fetchBoundWitnessChain('abc123', 10);

      expect(getMockAxiosInstance().get).toHaveBeenCalledWith('/api/proofs/abc123/chain', {
        params: { depth: 10 }
      });
      expect(result).toEqual(mockData);
    });
  });

  describe('fetchCryptographicDetails', () => {
    it('should fetch cryptographic details', async () => {
      const mockData = {
        signatures: ['sig1', 'sig2'],
        hashChain: ['hash1', 'hash2'],
        signatureValid: true,
        errors: []
      };
      const mockResponse = { data: mockData };
      getMockAxiosInstance().get.mockResolvedValue(mockResponse);

      const result = await fetchCryptographicDetails('abc123');

      expect(getMockAxiosInstance().get).toHaveBeenCalledWith('/api/proofs/abc123/crypto');
      expect(result).toEqual(mockData);
    });
  });

  describe('fetchLocationAccuracy', () => {
    it('should fetch location accuracy', async () => {
      const mockData = {
        accuracy: 10.5,
        verified: true
      };
      const mockResponse = { data: mockData };
      getMockAxiosInstance().get.mockResolvedValue(mockResponse);

      const result = await fetchLocationAccuracy('abc123');

      expect(getMockAxiosInstance().get).toHaveBeenCalledWith('/api/proofs/abc123/accuracy');
      expect(result).toEqual(mockData);
    });
  });

  describe('fetchROIMetrics', () => {
    it('should fetch ROI metrics without date range', async () => {
      const mockMetrics = {
        disputeReduction: { totalDisputes: 10 },
        fraudPrevention: { totalDeliveries: 100 },
        operationalEfficiency: { totalDeliveries: 100 },
        financialSummary: { totalCostSavings: 5000 }
      };
      const mockResponse = {
        data: {
          success: true,
          metrics: mockMetrics
        }
      };
      getMockAxiosInstance().get.mockResolvedValue(mockResponse);

      const result = await fetchROIMetrics();

      expect(getMockAxiosInstance().get).toHaveBeenCalledWith('/api/analytics/roi?');
      expect(result).toEqual(mockMetrics);
    });

    it('should fetch ROI metrics with date range', async () => {
      const mockMetrics = {
        disputeReduction: { totalDisputes: 10 },
        fraudPrevention: { totalDeliveries: 100 },
        operationalEfficiency: { totalDeliveries: 100 },
        financialSummary: { totalCostSavings: 5000 }
      };
      const mockResponse = {
        data: {
          success: true,
          metrics: mockMetrics
        }
      };
      getMockAxiosInstance().get.mockResolvedValue(mockResponse);

      const result = await fetchROIMetrics('2024-01-01', '2024-01-31');

      expect(getMockAxiosInstance().get).toHaveBeenCalledWith(
        '/api/analytics/roi?startDate=2024-01-01&endDate=2024-01-31'
      );
      expect(result).toEqual(mockMetrics);
    });
  });

  describe('fetchNetworkStatistics', () => {
    it('should fetch network statistics', async () => {
      const mockStats = {
        totalNodes: 100,
        activeNodes: 95,
        nodeTypes: {
          sentinel: 50,
          bridge: 30,
          diviner: 20
        },
        isMocked: false
      };
      const mockResponse = { data: mockStats };
      getMockAxiosInstance().get.mockResolvedValue(mockResponse);

      const result = await fetchNetworkStatistics();

      expect(getMockAxiosInstance().get).toHaveBeenCalledWith('/api/network/statistics');
      expect(result).toEqual(mockStats);
    });
  });

  describe('fetchWitnessNodes', () => {
    it('should fetch witness nodes without filters', async () => {
      const mockNodes = [
        { address: '0x123', type: 'sentinel', status: 'active' }
      ];
      const mockResponse = { data: mockNodes };
      getMockAxiosInstance().get.mockResolvedValue(mockResponse);

      const result = await fetchWitnessNodes();

      expect(getMockAxiosInstance().get).toHaveBeenCalledWith('/api/network/nodes', {
        params: undefined
      });
      expect(result).toEqual(mockNodes);
    });

    it('should fetch witness nodes with filters', async () => {
      const mockNodes = [
        { address: '0x123', type: 'sentinel', status: 'active' }
      ];
      const mockResponse = { data: mockNodes };
      getMockAxiosInstance().get.mockResolvedValue(mockResponse);

      const filters = {
        type: 'sentinel' as const,
        status: 'active' as const,
        minLat: 37.0,
        maxLat: 38.0
      };

      const result = await fetchWitnessNodes(filters);

      expect(getMockAxiosInstance().get).toHaveBeenCalledWith('/api/network/nodes', {
        params: filters
      });
      expect(result).toEqual(mockNodes);
    });
  });

  describe('fetchWitnessNodeInfo', () => {
    it('should fetch witness node info', async () => {
      const mockNode = {
        address: '0x123',
        type: 'sentinel',
        status: 'active'
      };
      const mockResponse = { data: mockNode };
      getMockAxiosInstance().get.mockResolvedValue(mockResponse);

      const result = await fetchWitnessNodeInfo('0x123');

      expect(getMockAxiosInstance().get).toHaveBeenCalledWith('/api/network/nodes/0x123');
      expect(result).toEqual(mockNode);
    });
  });

  describe('fetchConfiguration', () => {
    beforeEach(() => {
      localStorageMock.setItem('configToken', 'test-token');
    });

    it('should fetch all configuration', async () => {
      const mockConfig = {
        success: true,
        configuration: {
          backend: [],
          web: [],
          mobile: []
        }
      };
      const mockResponse = { data: mockConfig };
      getMockAxiosInstance().get.mockResolvedValue(mockResponse);

      const result = await fetchConfiguration();

      expect(getMockAxiosInstance().get).toHaveBeenCalledWith('/api/configuration');
      expect(result).toEqual(mockConfig);
    });

    it('should fetch configuration for specific category', async () => {
      const mockConfig = {
        success: true,
        category: 'backend',
        configuration: []
      };
      const mockResponse = { data: mockConfig };
      getMockAxiosInstance().get.mockResolvedValue(mockResponse);

      const result = await fetchConfiguration('backend');

      expect(getMockAxiosInstance().get).toHaveBeenCalledWith('/api/configuration/backend');
      expect(result).toEqual(mockConfig);
    });

    it('should throw error when not authenticated', async () => {
      localStorageMock.removeItem('configToken');

      await expect(fetchConfiguration()).rejects.toThrow(
        'Configuration authentication required'
      );
    });
  });

  describe('updateConfiguration', () => {
    beforeEach(() => {
      localStorageMock.setItem('configToken', 'test-token');
    });

    it('should update configuration', async () => {
      const mockResponse = {
        data: {
          success: true,
          message: 'Updated',
          updated: 2
        }
      };
      getMockAxiosInstance().put.mockResolvedValue(mockResponse);

      const updates = [
        { key: 'API_URL', value: 'http://localhost:4000' }
      ];

      const result = await updateConfiguration('backend', updates);

      expect(getMockAxiosInstance().put).toHaveBeenCalledWith('/api/configuration/backend', {
        updates
      });
      expect(result).toEqual(mockResponse.data);
    });

    it('should throw error when not authenticated', async () => {
      localStorageMock.removeItem('configToken');

      await expect(updateConfiguration('backend', [])).rejects.toThrow(
        'Configuration authentication required'
      );
    });
  });

  describe('deleteConfiguration', () => {
    beforeEach(() => {
      localStorageMock.setItem('configToken', 'test-token');
    });

    it('should delete configuration', async () => {
      const mockResponse = {
        data: {
          success: true,
          message: 'Deleted'
        }
      };
      getMockAxiosInstance().delete.mockResolvedValue(mockResponse);

      const result = await deleteConfiguration('backend', 'API_URL');

      expect(getMockAxiosInstance().delete).toHaveBeenCalledWith('/api/configuration/backend/API_URL');
      expect(result).toEqual(mockResponse.data);
    });

    it('should throw error when not authenticated', async () => {
      localStorageMock.removeItem('configToken');

      await expect(deleteConfiguration('backend', 'API_URL')).rejects.toThrow(
        'Configuration authentication required'
      );
    });
  });

  describe('initializeConfiguration', () => {
    beforeEach(() => {
      localStorageMock.setItem('configToken', 'test-token');
    });

    it('should initialize configuration', async () => {
      const mockResponse = {
        data: {
          success: true,
          message: 'Initialized'
        }
      };
      getMockAxiosInstance().post.mockResolvedValue(mockResponse);

      const result = await initializeConfiguration();

      expect(getMockAxiosInstance().post).toHaveBeenCalledWith('/api/configuration/initialize', {});
      expect(result).toEqual(mockResponse.data);
    });

    it('should throw error when not authenticated', async () => {
      localStorageMock.removeItem('configToken');

      await expect(initializeConfiguration()).rejects.toThrow(
        'Configuration authentication required'
      );
    });
  });

  describe('fetchServerStatus', () => {
    beforeEach(() => {
      localStorageMock.setItem('configToken', 'test-token');
    });

    it('should fetch server status', async () => {
      const mockStatus = {
        success: true,
        services: {
          backend: { name: 'Backend', status: 'running' },
          web: { name: 'Web', status: 'running' },
          mobile: { name: 'Mobile', status: 'running' }
        }
      };
      const mockResponse = { data: mockStatus };
      getMockAxiosInstance().get.mockResolvedValue(mockResponse);

      const result = await fetchServerStatus();

      expect(getMockAxiosInstance().get).toHaveBeenCalledWith('/api/server-status');
      expect(result).toEqual(mockStatus);
    });

    it('should throw error when not authenticated', async () => {
      localStorageMock.removeItem('configToken');

      await expect(fetchServerStatus()).rejects.toThrow(
        'Configuration authentication required'
      );
    });
  });
});

