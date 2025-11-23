import type { Request, Response, NextFunction } from 'express';
import { extractTokenFromHeader, verifyToken } from '../lib/jwt.js';

/**
 * Express middleware to authenticate requests using JWT tokens
 * Adds req.driverId to the request object if authentication succeeds
 */
export function authenticateToken(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  const token = extractTokenFromHeader(authHeader);

  if (!token) {
    res.status(401).json({ error: 'Authentication required. Please provide a valid token.' });
    return;
  }

  const payload = verifyToken(token);

  if (!payload || !payload.driverId) {
    res.status(401).json({ error: 'Invalid or expired token. Please log in again.' });
    return;
  }

  // Attach driver ID to request object for use in route handlers
  (req as Request & { driverId: string }).driverId = payload.driverId;

  next();
}

/**
 * Optional authentication middleware - doesn't fail if no token is provided
 * Useful for routes that work with or without authentication
 */
export function optionalAuthenticateToken(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  const token = extractTokenFromHeader(authHeader);

  if (token) {
    const payload = verifyToken(token);
    if (payload && payload.driverId) {
      (req as Request & { driverId?: string }).driverId = payload.driverId;
    }
  }

  next();
}

