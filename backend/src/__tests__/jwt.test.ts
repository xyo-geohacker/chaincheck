import { describe, it, expect, beforeEach, vi } from 'vitest';
import { generateToken, verifyToken, generateConfigToken, verifyConfigToken, extractTokenFromHeader } from '../lib/jwt.js';
import { env } from '../lib/env.js';

// Mock env to ensure JWT_SECRET is set
vi.mock('../lib/env.js', () => ({
  env: {
    jwtSecret: 'test-secret-key-for-jwt-testing-only'
  }
}));

describe('JWT Utilities', () => {
  beforeEach(() => {
    // Ensure JWT_SECRET is set for tests
    if (!env.jwtSecret) {
      (env as { jwtSecret: string }).jwtSecret = 'test-secret-key-for-jwt-testing-only';
    }
  });

  describe('generateToken', () => {
    it('should generate a valid JWT token', () => {
      const driverId = 'test-driver-123';
      const token = generateToken(driverId);
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.').length).toBe(3); // JWT has 3 parts
    });

    it('should generate different tokens for different drivers', () => {
      const token1 = generateToken('driver-1');
      const token2 = generateToken('driver-2');
      
      expect(token1).not.toBe(token2);
    });

    it('should generate different tokens for the same driver at different times', async () => {
      const driverId = 'test-driver';
      const token1 = generateToken(driverId);
      
      // Wait a bit to ensure different iat (JWT iat is in seconds)
      await new Promise(resolve => setTimeout(resolve, 1100));
      const token2 = generateToken(driverId);
      
      // Tokens should be different (different iat)
      expect(token1).not.toBe(token2);
    });

    it('should throw error if JWT_SECRET is not configured', () => {
      const originalSecret = env.jwtSecret;
      (env as { jwtSecret?: string }).jwtSecret = undefined;
      
      expect(() => generateToken('test-driver')).toThrow('JWT_SECRET is not configured');
      
      // Restore
      if (originalSecret !== undefined) {
        (env as { jwtSecret: string }).jwtSecret = originalSecret;
      }
    });
  });

  describe('verifyToken', () => {
    it('should verify a valid token', () => {
      const driverId = 'test-driver-123';
      const token = generateToken(driverId);
      const decoded = verifyToken(token);
      
      expect(decoded).not.toBeNull();
      expect(decoded?.driverId).toBe(driverId);
    });

    it('should return null for invalid token', () => {
      const decoded = verifyToken('invalid.token.here');
      expect(decoded).toBeNull();
    });

    it('should return null for malformed token', () => {
      const decoded = verifyToken('not-a-jwt-token');
      expect(decoded).toBeNull();
    });

    it('should return null for empty token', () => {
      const decoded = verifyToken('');
      expect(decoded).toBeNull();
    });

    it('should return null if JWT_SECRET is not configured', () => {
      const token = generateToken('test-driver');
      const originalSecret = env.jwtSecret;
      (env as { jwtSecret?: string }).jwtSecret = undefined;
      
      const decoded = verifyToken(token);
      expect(decoded).toBeNull();
      
      // Restore
      if (originalSecret !== undefined) {
        (env as { jwtSecret: string }).jwtSecret = originalSecret;
      }
    });
  });

  describe('generateConfigToken', () => {
    it('should generate a valid config JWT token', () => {
      const username = 'admin';
      const token = generateConfigToken(username);
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.').length).toBe(3);
    });

    it('should generate different tokens for different usernames', () => {
      const token1 = generateConfigToken('admin');
      const token2 = generateConfigToken('user');
      
      expect(token1).not.toBe(token2);
    });

    it('should throw error if JWT_SECRET is not configured', () => {
      const originalSecret = env.jwtSecret;
      (env as { jwtSecret?: string }).jwtSecret = undefined;
      
      expect(() => generateConfigToken('admin')).toThrow('JWT_SECRET is not configured');
      
      // Restore
      if (originalSecret !== undefined) {
        (env as { jwtSecret: string }).jwtSecret = originalSecret;
      }
    });
  });

  describe('verifyConfigToken', () => {
    it('should verify a valid config token', () => {
      const username = 'admin';
      const token = generateConfigToken(username);
      const decoded = verifyConfigToken(token);
      
      expect(decoded).not.toBeNull();
      expect(decoded?.username).toBe(username);
      expect(decoded?.type).toBe('config');
    });

    it('should return null for regular driver token', () => {
      const driverId = 'test-driver';
      const token = generateToken(driverId);
      const decoded = verifyConfigToken(token);
      
      expect(decoded).toBeNull();
    });

    it('should return null for invalid token', () => {
      const decoded = verifyConfigToken('invalid.token.here');
      expect(decoded).toBeNull();
    });

    it('should return null if JWT_SECRET is not configured', () => {
      const token = generateConfigToken('admin');
      const originalSecret = env.jwtSecret;
      (env as { jwtSecret?: string }).jwtSecret = undefined;
      
      const decoded = verifyConfigToken(token);
      expect(decoded).toBeNull();
      
      // Restore
      if (originalSecret !== undefined) {
        (env as { jwtSecret: string }).jwtSecret = originalSecret;
      }
    });
  });

  describe('extractTokenFromHeader', () => {
    it('should extract token from valid Bearer header', () => {
      const token = 'abc123.def456.ghi789';
      const header = `Bearer ${token}`;
      const extracted = extractTokenFromHeader(header);
      
      expect(extracted).toBe(token);
    });

    it('should return null for missing header', () => {
      const extracted = extractTokenFromHeader(undefined);
      expect(extracted).toBeNull();
    });

    it('should return null for invalid format (no Bearer)', () => {
      const extracted = extractTokenFromHeader('Token abc123');
      expect(extracted).toBeNull();
    });

    it('should return null for invalid format (no space)', () => {
      const extracted = extractTokenFromHeader('Bearerabc123');
      expect(extracted).toBeNull();
    });

    it('should return null for empty header', () => {
      const extracted = extractTokenFromHeader('');
      expect(extracted).toBeNull();
    });

    it('should handle token with extra spaces', () => {
      const token = 'abc123.def456.ghi789';
      const header = `Bearer  ${token}  `;
      const extracted = extractTokenFromHeader(header);
      
      // Should still extract the token (split handles spaces)
      expect(extracted).toBe(token);
    });
  });
});

