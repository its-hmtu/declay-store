import type { Request, Response, NextFunction } from 'express';
import { sendError } from '@/utils/response';
import { AppError } from '@/utils/http-error';
import { logger } from '@/lib/logger';

export function errorHandler(
  error: unknown,
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  logger.error('Request error', {
    method: req.method,
    url: req.originalUrl,
    status: error instanceof AppError ? error.statusCode : 500,
    message: error instanceof Error ? error.message : String(error),
    ...(error instanceof Error && error.stack ? { stack: error.stack } : {}),
  });

  if (error instanceof AppError) {
    return sendError(res, error.message, error.statusCode, {
      code: error.code,
      ...(error.details ? { details: error.details } : {}),
    }) as any;
  }

  sendError(res, 'An unexpected error occurred', 500);
}