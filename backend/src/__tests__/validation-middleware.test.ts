import { describe, it, expect, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { validateRequest } from '../middleware/validation-middleware.js';

describe('Validation Middleware', () => {
  const mockRequest = (body?: unknown, query?: unknown, params?: unknown) => {
    return {
      body: body ?? {},
      query: query ?? {},
      params: params ?? {}
    } as unknown as Request;
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

  describe('Body validation', () => {
    const schema = z.object({
      name: z.string().min(1),
      age: z.number().int().positive()
    });

    it('should pass validation with valid body', () => {
      const req = mockRequest({ name: 'John', age: 30 });
      const res = mockResponse();
      const middleware = validateRequest(schema, 'body');

      middleware(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockNext).toHaveBeenCalledWith();
      expect(res.status).not.toHaveBeenCalled();
      expect(req.body).toEqual({ name: 'John', age: 30 });
    });

    it('should reject invalid body data', () => {
      const req = mockRequest({ name: '', age: 30 });
      const res = mockResponse();
      const middleware = validateRequest(schema, 'body');

      middleware(req, res, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Validation failed',
          details: expect.any(Array)
        })
      );
    });

    it('should reject missing required fields', () => {
      const req = mockRequest({ name: 'John' });
      const res = mockResponse();
      const middleware = validateRequest(schema, 'body');

      middleware(req, res, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should reject wrong data types', () => {
      const req = mockRequest({ name: 'John', age: 'thirty' });
      const res = mockResponse();
      const middleware = validateRequest(schema, 'body');

      middleware(req, res, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('Query validation', () => {
    const schema = z.object({
      page: z.string().optional(),
      limit: z.string().optional()
    });

    it('should pass validation with valid query params', () => {
      const req = mockRequest({}, { page: '1', limit: '10' });
      const res = mockResponse();
      const middleware = validateRequest(schema, 'query');

      middleware(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should handle empty query params', () => {
      const req = mockRequest({}, {});
      const res = mockResponse();
      const middleware = validateRequest(schema, 'query');

      middleware(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(1);
    });
  });

  describe('Params validation', () => {
    const schema = z.object({
      id: z.string().uuid()
    });

    it('should pass validation with valid UUID param', () => {
      const uuid = '123e4567-e89b-12d3-a456-426614174000';
      const req = mockRequest({}, {}, { id: uuid });
      const res = mockResponse();
      const middleware = validateRequest(schema, 'params');

      middleware(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should reject invalid UUID param', () => {
      const req = mockRequest({}, {}, { id: 'not-a-uuid' });
      const res = mockResponse();
      const middleware = validateRequest(schema, 'params');

      middleware(req, res, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('Error formatting', () => {
    const schema = z.object({
      email: z.string().email(),
      age: z.number().min(18)
    });

    it('should format validation errors with path and message', () => {
      const req = mockRequest({ email: 'invalid', age: 15 });
      const res = mockResponse();
      const middleware = validateRequest(schema, 'body');

      middleware(req, res, mockNext);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Validation failed',
          details: expect.arrayContaining([
            expect.objectContaining({
              path: expect.any(String),
              message: expect.any(String),
              code: expect.any(String)
            })
          ])
        })
      );
    });
  });
});

