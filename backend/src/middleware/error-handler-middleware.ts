import type { NextFunction, Request, Response } from 'express';

type AppError = Error & {
  status?: number;
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: AppError, _req: Request, res: Response, _next: NextFunction) {
  const statusCode = err.status ?? 500;
  const message = statusCode >= 500 ? 'Internal server error' : err.message;

  if (statusCode >= 500) {
    // eslint-disable-next-line no-console
    console.error(err);
  }

  res.status(statusCode).json({
    error: message
  });
}

