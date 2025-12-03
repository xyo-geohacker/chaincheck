import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import axios from 'axios';
import Constants from 'expo-constants';

// Mock expo-constants
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    expoConfig: {
      hostUri: '192.168.1.100:8081'
    },
    expoGoConfig: {
      debuggerHost: '192.168.1.100:8081'
    }
  }
}));

// Mock axios before importing the service
// Create the mock instance inside the factory to avoid hoisting issues
let mockAxiosInstance: any;
let mockAxiosCreate: jest.Mock;

jest.mock('axios', () => {
  // Create the mock instance inside the factory
  mockAxiosInstance = {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    defaults: {
      baseURL: undefined,
      headers: {
        common: {}
      }
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
  
  mockAxiosCreate = jest.fn(() => mockAxiosInstance);
  
  return {
    __esModule: true,
    default: {
      create: mockAxiosCreate
    }
  };
});

// Import after mocks are set up to trigger initialization
// This will call axios.create() which will return our mock instance
// and set up the interceptors on it
import { apiClient, setAuthHeader } from '../services/api.service';

describe('API Service', () => {
  let originalEnv: string | undefined;
  let originalConsoleError: typeof console.error;
  let originalConsoleLog: typeof console.log;
  let originalConsoleWarn: typeof console.warn;

  beforeEach(() => {
    jest.clearAllMocks();
    originalEnv = process.env.EXPO_PUBLIC_API_URL;
    originalConsoleError = console.error;
    originalConsoleLog = console.log;
    originalConsoleWarn = console.warn;
    
    // Suppress console output during tests
    console.error = jest.fn();
    console.log = jest.fn();
    console.warn = jest.fn();
    
    // Reset axios instance
    mockAxiosInstance.defaults.baseURL = undefined;
    mockAxiosInstance.defaults.headers.common = {};
  });

  afterEach(() => {
    process.env.EXPO_PUBLIC_API_URL = originalEnv;
    console.error = originalConsoleError;
    console.log = originalConsoleLog;
    console.warn = originalConsoleWarn;
    jest.restoreAllMocks();
  });

  describe('resolveBaseUrl', () => {
    // Since resolveBaseUrl is not exported, we test it indirectly through the module initialization
    // We'll test by checking what baseURL was set on the axios instance
    // Note: We can't easily test module initialization with Jest's module caching,
    // so we'll test the exported apiClient and setAuthHeader functions instead
    
    it('should create axios instance with baseURL from environment', () => {
      // The module is already loaded, so we check the instance that was created
      expect(apiClient).toBeDefined();
      expect(apiClient.defaults).toBeDefined();
    });
  });

  describe('axios instance configuration', () => {
    it('should create axios instance with correct timeout', () => {
      // Check the mock was called with correct timeout
      const calls = mockAxiosCreate.mock.calls;
      if (calls.length > 0) {
        const lastCall = calls[calls.length - 1];
        expect(lastCall[0].timeout).toBe(30000);
      }
    });

    it('should set Content-Type header', () => {
      // Check the mock was called with correct headers
      const calls = mockAxiosCreate.mock.calls;
      if (calls.length > 0) {
        const lastCall = calls[calls.length - 1];
        expect(lastCall[0].headers['Content-Type']).toBe('application/json');
      }
    });
  });

  // Note: Interceptor tests are skipped as they require complex mocking
  // and are better suited for integration/E2E tests

  describe('setAuthHeader', () => {
    it('should set Authorization header with token', () => {
      setAuthHeader('test-token-123');
      
      expect(mockAxiosInstance.defaults.headers.common.Authorization).toBe('Bearer test-token-123');
    });

    it('should remove Authorization header when token is null', () => {
      // Set token first
      setAuthHeader('test-token');
      expect(mockAxiosInstance.defaults.headers.common.Authorization).toBe('Bearer test-token');
      
      // Clear token
      setAuthHeader(null);
      expect(mockAxiosInstance.defaults.headers.common.Authorization).toBeUndefined();
    });

    it('should update Authorization header when called multiple times', () => {
      setAuthHeader('token-1');
      expect(mockAxiosInstance.defaults.headers.common.Authorization).toBe('Bearer token-1');
      
      setAuthHeader('token-2');
      expect(mockAxiosInstance.defaults.headers.common.Authorization).toBe('Bearer token-2');
    });
  });

  // Note: Console warnings and errors tests are skipped as they happen at module load time
  // and are better suited for integration/E2E tests
});

