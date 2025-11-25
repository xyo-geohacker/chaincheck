import type { Request, Response, NextFunction } from 'express';
import { z, ZodError, ZodSchema } from 'zod';

/**
 * Validation middleware factory
 * Creates Express middleware that validates request data against a Zod schema
 * 
 * @param schema - Zod schema to validate against
 * @param source - Where to validate from: 'body', 'query', 'params', or 'all'
 * @returns Express middleware function
 */
export function validateRequest(
  schema: ZodSchema,
  source: 'body' | 'query' | 'params' | 'all' = 'body'
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      let dataToValidate: unknown;

      if (source === 'body') {
        dataToValidate = req.body;
      } else if (source === 'query') {
        dataToValidate = req.query;
      } else if (source === 'params') {
        dataToValidate = req.params;
      } else {
        // 'all' - validate body, query, and params together
        dataToValidate = {
          body: req.body,
          query: req.query,
          params: req.params
        };
      }

      // Validate and parse the data
      const validatedData = schema.parse(dataToValidate);

      // Replace the original data with validated data
      if (source === 'body') {
        req.body = validatedData;
      } else if (source === 'query') {
        req.query = validatedData as Record<string, string>;
      } else if (source === 'params') {
        req.params = validatedData as Record<string, string>;
      } else {
        // For 'all', merge validated data back into req
        const allData = validatedData as { body?: unknown; query?: unknown; params?: unknown };
        if (allData.body) req.body = allData.body;
        if (allData.query) req.query = allData.query as Record<string, string>;
        if (allData.params) req.params = allData.params as Record<string, string>;
      }

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        // Format Zod validation errors into a user-friendly response
        const errors = error.issues.map((err) => ({
          path: err.path.join('.'),
          message: err.message,
          code: err.code
        }));

        res.status(400).json({
          error: 'Validation failed',
          details: errors,
          message: `Invalid ${source} data: ${errors.map((e) => e.message).join(', ')}`
        });
        return;
      }

      // Unexpected error
      // eslint-disable-next-line no-console
      console.error('Validation middleware error:', error);
      res.status(500).json({
        error: 'Internal validation error',
        message: 'An unexpected error occurred during validation'
      });
    }
  };
}

/**
 * Helper to format validation errors for logging
 */
export function formatValidationErrors(error: ZodError): string {
  return error.issues
    .map((err) => `${err.path.join('.')}: ${err.message}`)
    .join('; ');
}

