import { haversineDistance } from '../utils/distance';

describe('haversineDistance', () => {
  // Known test cases with expected results
  // Using online calculators to verify: https://www.movable-type.co.uk/scripts/latlong.html

  it('should calculate distance between two identical points as 0', () => {
    const lat = 37.7749;
    const lon = -122.4194;
    const distance = haversineDistance(lat, lon, lat, lon);
    expect(distance).toBe(0);
  });

  it('should calculate distance between San Francisco and Los Angeles', () => {
    // San Francisco: 37.7749° N, 122.4194° W
    // Los Angeles: 34.0522° N, 118.2437° W
    // Expected distance: ~559 km (347 miles)
    const sfLat = 37.7749;
    const sfLon = -122.4194;
    const laLat = 34.0522;
    const laLon = -118.2437;
    
    const distance = haversineDistance(sfLat, sfLon, laLat, laLon);
    
    // Allow 1% tolerance for floating point precision
    const expectedDistance = 559000; // meters
    expect(distance).toBeGreaterThan(expectedDistance * 0.99);
    expect(distance).toBeLessThan(expectedDistance * 1.01);
  });

  it('should calculate distance between New York and London', () => {
    // New York: 40.7128° N, 74.0060° W
    // London: 51.5074° N, 0.1278° W
    // Expected distance: ~5570 km (3460 miles)
    const nyLat = 40.7128;
    const nyLon = -74.0060;
    const londonLat = 51.5074;
    const londonLon = -0.1278;
    
    const distance = haversineDistance(nyLat, nyLon, londonLat, londonLon);
    
    // Allow 1% tolerance
    const expectedDistance = 5570000; // meters
    expect(distance).toBeGreaterThan(expectedDistance * 0.99);
    expect(distance).toBeLessThan(expectedDistance * 1.01);
  });

  it('should calculate short distance accurately (within 50 meters)', () => {
    // Two points approximately 50 meters apart
    // Using a known distance: 0.00045 degrees latitude ≈ 50 meters
    const lat1 = 37.7749;
    const lon1 = -122.4194;
    const lat2 = 37.7754; // ~50 meters north
    const lon2 = -122.4194;
    
    const distance = haversineDistance(lat1, lon1, lat2, lon2);
    
    // Should be approximately 50 meters (allow wider tolerance for small distances)
    expect(distance).toBeGreaterThan(45);
    expect(distance).toBeLessThan(60); // Increased tolerance to account for calculation precision
  });

  it('should handle negative coordinates (southern/western hemisphere)', () => {
    // Sydney: -33.8688° S, 151.2093° E
    // Melbourne: -37.8136° S, 144.9631° E
    // Expected distance: ~713 km
    const sydneyLat = -33.8688;
    const sydneyLon = 151.2093;
    const melbourneLat = -37.8136;
    const melbourneLon = 144.9631;
    
    const distance = haversineDistance(sydneyLat, sydneyLon, melbourneLat, melbourneLon);
    
    // Allow 1% tolerance
    const expectedDistance = 713000; // meters
    expect(distance).toBeGreaterThan(expectedDistance * 0.99);
    expect(distance).toBeLessThan(expectedDistance * 1.01);
  });

  it('should handle coordinates crossing the equator', () => {
    // Point in northern hemisphere: 10° N, 0° E
    // Point in southern hemisphere: -10° S, 0° E
    // Expected distance: ~2224 km
    const northLat = 10;
    const northLon = 0;
    const southLat = -10;
    const southLon = 0;
    
    const distance = haversineDistance(northLat, northLon, southLat, southLon);
    
    // Allow 1% tolerance
    const expectedDistance = 2224000; // meters
    expect(distance).toBeGreaterThan(expectedDistance * 0.99);
    expect(distance).toBeLessThan(expectedDistance * 1.01);
  });

  it('should handle coordinates crossing the prime meridian', () => {
    // Point west of prime meridian: 0° N, -10° W
    // Point east of prime meridian: 0° N, 10° E
    // Expected distance: ~2224 km
    const westLat = 0;
    const westLon = -10;
    const eastLat = 0;
    const eastLon = 10;
    
    const distance = haversineDistance(westLat, westLon, eastLat, eastLon);
    
    // Allow 1% tolerance
    const expectedDistance = 2224000; // meters
    expect(distance).toBeGreaterThan(expectedDistance * 0.99);
    expect(distance).toBeLessThan(expectedDistance * 1.01);
  });

  it('should handle coordinates crossing the international date line', () => {
    // Point west of date line: 0° N, 179° E
    // Point east of date line: 0° N, -179° W
    // Expected distance: ~222 km (short distance across date line)
    const westLat = 0;
    const westLon = 179;
    const eastLat = 0;
    const eastLon = -179;
    
    const distance = haversineDistance(westLat, westLon, eastLat, eastLon);
    
    // Allow 1% tolerance
    const expectedDistance = 222000; // meters
    expect(distance).toBeGreaterThan(expectedDistance * 0.99);
    expect(distance).toBeLessThan(expectedDistance * 1.01);
  });

  it('should return positive distance regardless of parameter order', () => {
    const lat1 = 37.7749;
    const lon1 = -122.4194;
    const lat2 = 34.0522;
    const lon2 = -118.2437;
    
    const distance1 = haversineDistance(lat1, lon1, lat2, lon2);
    const distance2 = haversineDistance(lat2, lon2, lat1, lon1);
    
    expect(distance1).toBe(distance2);
    expect(distance1).toBeGreaterThan(0);
  });

  it('should handle edge case: same latitude, different longitude', () => {
    // Two points on the same latitude line
    const lat = 37.7749;
    const lon1 = -122.4194;
    const lon2 = -122.4000; // ~1.7 km east
    
    const distance = haversineDistance(lat, lon1, lat, lon2);
    
    // Should be approximately 1.7 km
    expect(distance).toBeGreaterThan(1600);
    expect(distance).toBeLessThan(1800);
  });

  it('should handle edge case: same longitude, different latitude', () => {
    // Two points on the same longitude line
    const lat1 = 37.7749;
    const lat2 = 37.7800; // ~0.57 km north
    const lon = -122.4194;
    
    const distance = haversineDistance(lat1, lon, lat2, lon);
    
    // Should be approximately 0.57 km
    expect(distance).toBeGreaterThan(550);
    expect(distance).toBeLessThan(600);
  });

  it('should handle very small distances (centimeters)', () => {
    // Two points very close together (approximately 1 meter apart)
    const lat1 = 37.7749;
    const lon1 = -122.4194;
    const lat2 = 37.7749001; // Very small difference
    const lon2 = -122.4194;
    
    const distance = haversineDistance(lat1, lon1, lat2, lon2);
    
    // Should be a very small positive number
    expect(distance).toBeGreaterThan(0);
    expect(distance).toBeLessThan(100); // Less than 100 meters
  });

  it('should handle extreme coordinates (poles)', () => {
    // North pole: 90° N, 0° E
    // Point near north pole: 89° N, 0° E
    // Expected distance: ~111 km
    const poleLat = 90;
    const poleLon = 0;
    const nearPoleLat = 89;
    const nearPoleLon = 0;
    
    const distance = haversineDistance(poleLat, poleLon, nearPoleLat, nearPoleLon);
    
    // Allow 1% tolerance
    const expectedDistance = 111000; // meters
    expect(distance).toBeGreaterThan(expectedDistance * 0.99);
    expect(distance).toBeLessThan(expectedDistance * 1.01);
  });
});

