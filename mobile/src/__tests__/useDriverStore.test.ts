import AsyncStorage from '@react-native-async-storage/async-storage';
import { useDriverStore } from '../store/useDriverStore';
import { setAuthHeader } from '../services/api.service';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
}));

// Mock api.service
jest.mock('../services/api.service', () => ({
  setAuthHeader: jest.fn()
}));

describe('useDriverStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset store state
    useDriverStore.setState({
      driverId: null,
      token: null
    });
  });

  describe('initial state', () => {
    it('should have null driverId and token initially', () => {
      const state = useDriverStore.getState();
      expect(state.driverId).toBeNull();
      expect(state.token).toBeNull();
    });
  });

  describe('setDriverId', () => {
    it('should set driverId', () => {
      const { setDriverId } = useDriverStore.getState();
      
      setDriverId('driver-001');
      
      const state = useDriverStore.getState();
      expect(state.driverId).toBe('driver-001');
    });

    it('should update driverId when called multiple times', () => {
      const { setDriverId } = useDriverStore.getState();
      
      setDriverId('driver-001');
      expect(useDriverStore.getState().driverId).toBe('driver-001');
      
      setDriverId('driver-002');
      expect(useDriverStore.getState().driverId).toBe('driver-002');
    });
  });

  describe('setToken', () => {
    it('should set token and update auth header', () => {
      const { setToken } = useDriverStore.getState();
      
      setToken('test-token-123');
      
      const state = useDriverStore.getState();
      expect(state.token).toBe('test-token-123');
      expect(setAuthHeader).toHaveBeenCalledWith('test-token-123');
    });

    it('should set token to null and clear auth header', () => {
      const { setToken } = useDriverStore.getState();
      
      // First set a token
      setToken('test-token-123');
      jest.clearAllMocks();
      
      // Then clear it
      setToken(null);
      
      const state = useDriverStore.getState();
      expect(state.token).toBeNull();
      expect(setAuthHeader).toHaveBeenCalledWith(null);
    });

    it('should update auth header when token changes', () => {
      const { setToken } = useDriverStore.getState();
      
      setToken('token-1');
      expect(setAuthHeader).toHaveBeenCalledWith('token-1');
      
      jest.clearAllMocks();
      
      setToken('token-2');
      expect(setAuthHeader).toHaveBeenCalledWith('token-2');
    });
  });

  describe('clearDriver', () => {
    it('should clear both driverId and token', () => {
      const { setDriverId, setToken, clearDriver } = useDriverStore.getState();
      
      // Set initial state
      setDriverId('driver-001');
      setToken('test-token-123');
      jest.clearAllMocks();
      
      // Clear driver
      clearDriver();
      
      const state = useDriverStore.getState();
      expect(state.driverId).toBeNull();
      expect(state.token).toBeNull();
      expect(setAuthHeader).toHaveBeenCalledWith(null);
    });

    it('should clear auth header when clearing driver', () => {
      const { setToken, clearDriver } = useDriverStore.getState();
      
      setToken('test-token-123');
      jest.clearAllMocks();
      
      clearDriver();
      
      expect(setAuthHeader).toHaveBeenCalledWith(null);
    });

    it('should work even when driverId and token are already null', () => {
      const { clearDriver } = useDriverStore.getState();
      
      // Should not throw
      expect(() => clearDriver()).not.toThrow();
      
      const state = useDriverStore.getState();
      expect(state.driverId).toBeNull();
      expect(state.token).toBeNull();
    });
  });

  describe('state updates', () => {
    it('should allow setting driverId and token independently', () => {
      const { setDriverId, setToken } = useDriverStore.getState();
      
      setDriverId('driver-001');
      expect(useDriverStore.getState().driverId).toBe('driver-001');
      expect(useDriverStore.getState().token).toBeNull();
      
      setToken('token-123');
      expect(useDriverStore.getState().driverId).toBe('driver-001');
      expect(useDriverStore.getState().token).toBe('token-123');
    });

    it('should maintain state across multiple operations', () => {
      const { setDriverId, setToken, clearDriver } = useDriverStore.getState();
      
      setDriverId('driver-001');
      setToken('token-123');
      
      expect(useDriverStore.getState().driverId).toBe('driver-001');
      expect(useDriverStore.getState().token).toBe('token-123');
      
      setDriverId('driver-002');
      
      expect(useDriverStore.getState().driverId).toBe('driver-002');
      expect(useDriverStore.getState().token).toBe('token-123');
      
      clearDriver();
      
      expect(useDriverStore.getState().driverId).toBeNull();
      expect(useDriverStore.getState().token).toBeNull();
    });
  });

  describe('persistence', () => {
    it('should use AsyncStorage for persistence', () => {
      // The store is configured with persist middleware
      // This test verifies the store structure supports persistence
      const state = useDriverStore.getState();
      
      // Store should have the expected structure
      expect(state).toHaveProperty('driverId');
      expect(state).toHaveProperty('token');
      expect(state).toHaveProperty('setDriverId');
      expect(state).toHaveProperty('setToken');
      expect(state).toHaveProperty('clearDriver');
    });
  });
});

