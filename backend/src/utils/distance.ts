/**
 * Distance calculation utilities
 * Uses Haversine formula for calculating distances between geographic coordinates
 */

const EARTH_RADIUS_METERS = 6_371_000;

/**
 * Calculate the distance between two geographic coordinates using the Haversine formula
 * @param lat1 Latitude of first point
 * @param lon1 Longitude of first point
 * @param lat2 Latitude of second point
 * @param lon2 Longitude of second point
 * @returns Distance in meters
 */
export function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const radians = (degrees: number) => (degrees * Math.PI) / 180;

  const dLat = radians(lat2 - lat1);
  const dLon = radians(lon2 - lon1);

  const bearingLat1 = radians(lat1);
  const bearingLat2 = radians(lat2);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(bearingLat1) * Math.cos(bearingLat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_METERS * c;
}

