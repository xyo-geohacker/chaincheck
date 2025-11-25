import { describe, it, expect } from 'vitest';
import { haversineDistance } from '../utils/distance.js';

describe('Distance Utilities', () => {
  describe('haversineDistance', () => {
    it('should calculate distance between two identical points as 0', () => {
      const lat = 37.7749;
      const lon = -122.4194;
      const distance = haversineDistance(lat, lon, lat, lon);
      expect(distance).toBe(0);
    });

    it('should calculate distance between San Francisco and Los Angeles approximately', () => {
      // San Francisco coordinates
      const sfLat = 37.7749;
      const sfLon = -122.4194;
      
      // Los Angeles coordinates
      const laLat = 34.0522;
      const laLon = -118.2437;
      
      // Actual distance is approximately 559 km (559,000 meters)
      const distance = haversineDistance(sfLat, sfLon, laLat, laLon);
      
      // Allow 5% tolerance for calculation
      expect(distance).toBeGreaterThan(530_000);
      expect(distance).toBeLessThan(590_000);
    });

    it('should calculate distance between New York and London approximately', () => {
      // New York coordinates
      const nyLat = 40.7128;
      const nyLon = -74.0060;
      
      // London coordinates
      const londonLat = 51.5074;
      const londonLon = -0.1278;
      
      // Actual distance is approximately 5,585 km (5,585,000 meters)
      const distance = haversineDistance(nyLat, nyLon, londonLat, londonLon);
      
      // Allow 5% tolerance for calculation
      expect(distance).toBeGreaterThan(5_300_000);
      expect(distance).toBeLessThan(5_870_000);
    });

    it('should handle coordinates at the equator', () => {
      const lat1 = 0;
      const lon1 = 0;
      const lat2 = 0;
      const lon2 = 1; // 1 degree longitude at equator ≈ 111 km
      
      const distance = haversineDistance(lat1, lon1, lat2, lon2);
      
      // 1 degree longitude at equator ≈ 111,320 meters
      expect(distance).toBeGreaterThan(110_000);
      expect(distance).toBeLessThan(112_000);
    });

    it('should handle coordinates at the poles', () => {
      const lat1 = 90;
      const lon1 = 0;
      const lat2 = 89;
      const lon2 = 0;
      
      const distance = haversineDistance(lat1, lon1, lat2, lon2);
      
      // 1 degree latitude ≈ 111 km
      expect(distance).toBeGreaterThan(110_000);
      expect(distance).toBeLessThan(112_000);
    });

    it('should handle negative coordinates (southern/western hemisphere)', () => {
      // Sydney, Australia
      const sydLat = -33.8688;
      const sydLon = 151.2093;
      
      // Melbourne, Australia
      const melLat = -37.8136;
      const melLon = 144.9631;
      
      // Actual distance is approximately 713 km
      const distance = haversineDistance(sydLat, sydLon, melLat, melLon);
      
      expect(distance).toBeGreaterThan(680_000);
      expect(distance).toBeLessThan(750_000);
    });

    it('should return positive distance regardless of point order', () => {
      const lat1 = 37.7749;
      const lon1 = -122.4194;
      const lat2 = 34.0522;
      const lon2 = -118.2437;
      
      const distance1 = haversineDistance(lat1, lon1, lat2, lon2);
      const distance2 = haversineDistance(lat2, lon2, lat1, lon1);
      
      expect(distance1).toBe(distance2);
      expect(distance1).toBeGreaterThan(0);
    });

    it('should handle very small distances accurately', () => {
      // Two points very close together (about 100 meters apart)
      const lat1 = 37.7749;
      const lon1 = -122.4194;
      const lat2 = 37.7750; // ~0.0001 degree ≈ 11 meters
      const lon2 = -122.4195;
      
      const distance = haversineDistance(lat1, lon1, lat2, lon2);
      
      // Should be a small positive number
      expect(distance).toBeGreaterThan(0);
      expect(distance).toBeLessThan(20); // Less than 20 meters
    });
  });
});

