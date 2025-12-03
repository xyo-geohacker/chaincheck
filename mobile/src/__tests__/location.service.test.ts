import * as Location from 'expo-location';
import { LocationService } from '../services/location.service';

// Mock expo-location
jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  watchPositionAsync: jest.fn(),
  PermissionStatus: {
    GRANTED: 'granted',
    DENIED: 'denied',
    UNDETERMINED: 'undetermined'
  },
  Accuracy: {
    High: 'high'
  }
}));

describe('LocationService', () => {
  let locationService: LocationService;

  beforeEach(() => {
    jest.clearAllMocks();
    locationService = new LocationService();
  });

  describe('getCurrentLocation', () => {
    it('should return location snapshot when permission is granted', async () => {
      const mockLocation = {
        coords: {
          latitude: 37.7749,
          longitude: -122.4194,
          accuracy: 10.5,
          altitude: 100,
          altitudeAccuracy: 5,
          heading: 0,
          speed: 0
        },
        timestamp: 1234567890
      };

      (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
        status: Location.PermissionStatus.GRANTED
      });
      (Location.getCurrentPositionAsync as jest.Mock).mockResolvedValue(mockLocation);

      const result = await locationService.getCurrentLocation();

      expect(Location.requestForegroundPermissionsAsync).toHaveBeenCalled();
      expect(Location.getCurrentPositionAsync).toHaveBeenCalledWith({
        accuracy: Location.Accuracy.High
      });
      expect(result).toEqual({
        latitude: 37.7749,
        longitude: -122.4194,
        accuracy: 10.5,
        timestamp: 1234567890
      });
    });

    it('should handle null accuracy', async () => {
      const mockLocation = {
        coords: {
          latitude: 37.7749,
          longitude: -122.4194,
          accuracy: null,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          speed: null
        },
        timestamp: 1234567890
      };

      (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
        status: Location.PermissionStatus.GRANTED
      });
      (Location.getCurrentPositionAsync as jest.Mock).mockResolvedValue(mockLocation);

      const result = await locationService.getCurrentLocation();

      expect(result.accuracy).toBeNull();
    });

    it('should handle undefined accuracy', async () => {
      const mockLocation = {
        coords: {
          latitude: 37.7749,
          longitude: -122.4194,
          accuracy: undefined,
          altitude: undefined,
          altitudeAccuracy: undefined,
          heading: undefined,
          speed: undefined
        },
        timestamp: 1234567890
      };

      (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
        status: Location.PermissionStatus.GRANTED
      });
      (Location.getCurrentPositionAsync as jest.Mock).mockResolvedValue(mockLocation);

      const result = await locationService.getCurrentLocation();

      expect(result.accuracy).toBeNull();
    });

    it('should throw error when permission is denied', async () => {
      (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
        status: Location.PermissionStatus.DENIED
      });

      await expect(locationService.getCurrentLocation()).rejects.toThrow(
        'Location permission denied'
      );

      expect(Location.getCurrentPositionAsync).not.toHaveBeenCalled();
    });

    it('should throw error when permission is undetermined', async () => {
      (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
        status: Location.PermissionStatus.UNDETERMINED
      });

      await expect(locationService.getCurrentLocation()).rejects.toThrow(
        'Location permission denied'
      );

      expect(Location.getCurrentPositionAsync).not.toHaveBeenCalled();
    });

    it('should throw error when permission request fails', async () => {
      (Location.requestForegroundPermissionsAsync as jest.Mock).mockRejectedValue(
        new Error('Permission request failed')
      );

      await expect(locationService.getCurrentLocation()).rejects.toThrow(
        'Permission request failed'
      );
    });

    it('should throw error when getCurrentPositionAsync fails', async () => {
      (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
        status: Location.PermissionStatus.GRANTED
      });
      (Location.getCurrentPositionAsync as jest.Mock).mockRejectedValue(
        new Error('Location unavailable')
      );

      await expect(locationService.getCurrentLocation()).rejects.toThrow(
        'Location unavailable'
      );
    });
  });

  describe('watchLocation', () => {
    it('should start watching location when permission is granted', async () => {
      const mockSubscription = {
        remove: jest.fn()
      };
      const mockCallback = jest.fn();

      (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
        status: Location.PermissionStatus.GRANTED
      });
      (Location.watchPositionAsync as jest.Mock).mockResolvedValue(mockSubscription);

      const result = await locationService.watchLocation(mockCallback);

      expect(Location.requestForegroundPermissionsAsync).toHaveBeenCalled();
      expect(Location.watchPositionAsync).toHaveBeenCalledWith(
        {
          accuracy: Location.Accuracy.High,
          distanceInterval: 10
        },
        mockCallback
      );
      expect(result).toBe(mockSubscription);
    });

    it('should throw error when permission is denied', async () => {
      const mockCallback = jest.fn();

      (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
        status: Location.PermissionStatus.DENIED
      });

      await expect(locationService.watchLocation(mockCallback)).rejects.toThrow(
        'Location permission denied'
      );

      expect(Location.watchPositionAsync).not.toHaveBeenCalled();
    });

    it('should throw error when permission is undetermined', async () => {
      const mockCallback = jest.fn();

      (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
        status: Location.PermissionStatus.UNDETERMINED
      });

      await expect(locationService.watchLocation(mockCallback)).rejects.toThrow(
        'Location permission denied'
      );

      expect(Location.watchPositionAsync).not.toHaveBeenCalled();
    });

    it('should throw error when permission request fails', async () => {
      const mockCallback = jest.fn();

      (Location.requestForegroundPermissionsAsync as jest.Mock).mockRejectedValue(
        new Error('Permission request failed')
      );

      await expect(locationService.watchLocation(mockCallback)).rejects.toThrow(
        'Permission request failed'
      );
    });

    it('should throw error when watchPositionAsync fails', async () => {
      const mockCallback = jest.fn();

      (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
        status: Location.PermissionStatus.GRANTED
      });
      (Location.watchPositionAsync as jest.Mock).mockRejectedValue(
        new Error('Watch failed')
      );

      await expect(locationService.watchLocation(mockCallback)).rejects.toThrow(
        'Watch failed'
      );
    });

    it('should return subscription that can be removed', async () => {
      const mockSubscription = {
        remove: jest.fn()
      };
      const mockCallback = jest.fn();

      (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
        status: Location.PermissionStatus.GRANTED
      });
      (Location.watchPositionAsync as jest.Mock).mockResolvedValue(mockSubscription);

      const subscription = await locationService.watchLocation(mockCallback);

      expect(subscription.remove).toBeDefined();
      subscription.remove();
      expect(mockSubscription.remove).toHaveBeenCalled();
    });
  });
});

