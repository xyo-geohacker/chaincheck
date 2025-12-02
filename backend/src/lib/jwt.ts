import jwt from 'jsonwebtoken';
import { env } from './env.js';
import { logger } from './logger.js';

export interface JWTPayload {
  driverId: string;
  iat?: number;
  exp?: number;
}

export interface ConfigJWTPayload {
  username: string;
  type: 'config';
  iat?: number;
  exp?: number;
}

/**
 * Generate a JWT token for a driver
 * @param driverId - The driver ID to include in the token
 * @returns JWT token string
 */
export function generateToken(driverId: string): string {
  if (!env.jwtSecret) {
    throw new Error('JWT_SECRET is not configured. Please set it in your environment variables.');
  }

  const payload: JWTPayload = {
    driverId
  };

  // Token expires in 7 days
  const expiresIn = '7d';

  return jwt.sign(payload, env.jwtSecret, {
    expiresIn,
    issuer: 'chaincheck-backend',
    audience: 'chaincheck-mobile'
  });
}

/**
 * Verify and decode a JWT token
 * @param token - The JWT token to verify
 * @returns Decoded token payload or null if invalid
 */
export function verifyToken(token: string): JWTPayload | null {
  if (!env.jwtSecret) {
    logger.error('JWT_SECRET is not configured');
    return null;
  }

  try {
    const decoded = jwt.verify(token, env.jwtSecret, {
      issuer: 'chaincheck-backend',
      audience: 'chaincheck-mobile'
    }) as JWTPayload;

    return decoded;
  } catch (error) {
    // Error is expected for invalid tokens, so we don't log it
    return null;
  }
}

/**
 * Generate a JWT token for configuration access
 * @param username - The configuration username to include in the token
 * @returns JWT token string
 */
export function generateConfigToken(username: string): string {
  if (!env.jwtSecret) {
    throw new Error('JWT_SECRET is not configured. Please set it in your environment variables.');
  }

  const payload: ConfigJWTPayload = {
    username,
    type: 'config'
  };

  // Token expires in 7 days
  const expiresIn = '7d';

  return jwt.sign(payload, env.jwtSecret, {
    expiresIn,
    issuer: 'chaincheck-backend',
    audience: 'chaincheck-config'
  });
}

/**
 * Verify and decode a configuration JWT token
 * @param token - The JWT token to verify
 * @returns Decoded token payload or null if invalid
 */
export function verifyConfigToken(token: string): ConfigJWTPayload | null {
  if (!env.jwtSecret) {
    logger.error('JWT_SECRET is not configured');
    return null;
  }

  try {
    const decoded = jwt.verify(token, env.jwtSecret, {
      issuer: 'chaincheck-backend',
      audience: 'chaincheck-config'
    }) as ConfigJWTPayload;

    // Verify it's a config token
    if (decoded.type !== 'config') {
      return null;
    }

    return decoded;
  } catch (error) {
    // Error is expected for invalid tokens, so we don't log it
    return null;
  }
}

/**
 * Extract token from Authorization header
 * @param authHeader - The Authorization header value (e.g., "Bearer <token>")
 * @returns The token string or null if invalid format
 */
export function extractTokenFromHeader(authHeader: string | undefined): string | null {
  if (!authHeader) {
    return null;
  }

  // Split by space and filter out empty strings to handle multiple spaces
  const parts = authHeader.trim().split(/\s+/);
  if (parts.length < 2 || parts[0] !== 'Bearer') {
    return null;
  }

  // Return the token part (everything after "Bearer")
  return parts.slice(1).join(' ');
}

