import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { authenticateToken, optionalAuthenticateToken } from '../middleware/auth-middleware.js';
import { generateToken, verifyToken } from '../lib/jwt.js';

describe('Authentication Middleware', () => {
  const mockRequest = (authHeader?: string) => {
    const req = {
      headers: {
        authorization: authHeader
      }
    } as unknown as Request;
    return req;
  };

  const mockResponse = () => {
    const res = {} as Response;
    res.status = vi.fn().mockReturnValue(res);
    res.json = vi.fn().mockReturnValue(res);
    return res;
  };

  const mockNext = vi.fn() as NextFunction;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('authenticateToken', () => {
    it('should allow request with valid token', () => {
      const token = generateToken('test-driver');
      const req = mockRequest(`Bearer ${token}`);
      const res = mockResponse();

      authenticateToken(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockNext).toHaveBeenCalledWith();
      expect(res.status).not.toHaveBeenCalled();
      expect((req as Request & { driverId: string }).driverId).toBe('test-driver');
    });

    it('should reject request without Authorization header', () => {
      const req = mockRequest();
      const res = mockResponse();

      authenticateToken(req, res, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('Authentication required')
        })
      );
    });

    it('should reject request with invalid token format', () => {
      const req = mockRequest('InvalidFormat token');
      const res = mockResponse();

      authenticateToken(req, res, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('should reject request with expired token', () => {
      // Create a token that will be invalid (using wrong secret or expired)
      const req = mockRequest('Bearer invalid.token.here');
      const res = mockResponse();

      authenticateToken(req, res, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('Invalid or expired token')
        })
      );
    });

    it('should extract driverId from valid token', () => {
      const driverId = 'test-driver-123';
      const token = generateToken(driverId);
      const req = mockRequest(`Bearer ${token}`);
      const res = mockResponse();

      authenticateToken(req, res, mockNext);

      expect((req as Request & { driverId: string }).driverId).toBe(driverId);
    });
  });

  describe('optionalAuthenticateToken', () => {
    it('should allow request with valid token', () => {
      const token = generateToken('test-driver');
      const req = mockRequest(`Bearer ${token}`);
      const res = mockResponse();

      optionalAuthenticateToken(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(1);
      expect((req as Request & { driverId?: string }).driverId).toBe('test-driver');
    });

    it('should allow request without token', () => {
      const req = mockRequest();
      const res = mockResponse();

      optionalAuthenticateToken(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(1);
      expect((req as Request & { driverId?: string }).driverId).toBeUndefined();
    });

    it('should allow request with invalid token (does not fail)', () => {
      const req = mockRequest('Bearer invalid.token');
      const res = mockResponse();

      optionalAuthenticateToken(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(1);
      expect((req as Request & { driverId?: string }).driverId).toBeUndefined();
    });
  });
});

