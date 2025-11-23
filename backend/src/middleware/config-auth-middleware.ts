/**
 * Configuration Authentication Middleware
 * Authenticates requests for configuration endpoints using configuration user tokens
 */

import type { Request, Response, NextFunction } from 'express';
import { extractTokenFromHeader, verifyConfigToken } from '../lib/jwt.js';

/**
 * Express middleware to authenticate configuration requests using JWT tokens
 * Adds req.configUsername to the request object if authentication succeeds
 */
export function authenticateConfigToken(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  const token = extractTokenFromHeader(authHeader);

  if (!token) {
    res.status(401).json({ error: 'Authentication required. Please provide a valid token.' });
    return;
  }

  const payload = verifyConfigToken(token);

  if (!payload || !payload.username || payload.type !== 'config') {
    res.status(401).json({ error: 'Invalid or expired token. Please log in again.' });
    return;
  }

  // Attach username to request object for use in route handlers
  (req as Request & { configUsername: string }).configUsername = payload.username;

  next();
}

