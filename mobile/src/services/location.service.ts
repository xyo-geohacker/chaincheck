import * as Location from 'expo-location';

export interface LocationSnapshot {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  timestamp: number;
}

export class LocationService {
  async getCurrentLocation(): Promise<LocationSnapshot> {
    const { status } = await Location.requestForegroundPermissionsAsync();

    if (status !== Location.PermissionStatus.GRANTED) {
      throw new Error('Location permission denied');
    }

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High
    });

    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      accuracy: location.coords.accuracy ?? null,
      timestamp: location.timestamp
    };
  }

  async watchLocation(
    callback: (location: Location.LocationObject) => void
  ): Promise<Location.LocationSubscription> {
    const { status } = await Location.requestForegroundPermissionsAsync();

    if (status !== Location.PermissionStatus.GRANTED) {
      throw new Error('Location permission denied');
    }

    return Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        distanceInterval: 10
      },
      callback
    );
  }
}

