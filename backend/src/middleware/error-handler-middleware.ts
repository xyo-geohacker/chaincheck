import type { NextFunction, Request, Response } from 'express';

type AppError = Error & {
  status?: number;
};

 
export function errorHandler(err: AppError, _req: Request, res: Response, _next: NextFunction) {
  const statusCode = err.status ?? 500;
  const message = statusCode >= 500 ? 'Internal server error' : err.message;

  if (statusCode >= 500) {
     
    console.error(err);
  }

  res.status(statusCode).json({
    error: message
  });
}

