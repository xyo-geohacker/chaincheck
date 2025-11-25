import { describe, it, expect, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { errorHandler } from '../middleware/error-handler-middleware.js';

describe('Error Handler Middleware', () => {
  const mockRequest = {} as Request;
  const mockResponse = () => {
    const res = {} as Response;
    res.status = vi.fn().mockReturnValue(res);
    res.json = vi.fn().mockReturnValue(res);
    return res;
  };
  const mockNext = vi.fn() as NextFunction;

  describe('errorHandler', () => {
    it('should handle errors with status code', () => {
      const res = mockResponse();
      const error = new Error('Not found') as Error & { status?: number };
      error.status = 404;

      errorHandler(error, mockRequest, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Not found'
      });
    });

    it('should use default 500 status for errors without status', () => {
      const res = mockResponse();
      const error = new Error('Internal error');

      errorHandler(error, mockRequest, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Internal server error'
      });
    });

    it('should mask error message for 500+ status codes', () => {
      const res = mockResponse();
      const error = new Error('Sensitive database error') as Error & { status?: number };
      error.status = 500;

      errorHandler(error, mockRequest, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Internal server error' // Should not expose actual error message
      });
    });

    it('should expose error message for 4xx status codes', () => {
      const res = mockResponse();
      const error = new Error('Validation failed') as Error & { status?: number };
      error.status = 400;

      errorHandler(error, mockRequest, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Validation failed' // Should expose error message for client errors
      });
    });

    it('should handle non-Error objects', () => {
      const res = mockResponse();
      const error = { message: 'String error' } as unknown as Error;

      errorHandler(error, mockRequest, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Internal server error'
      });
    });
  });
});

