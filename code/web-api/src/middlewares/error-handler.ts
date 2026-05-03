import type { Request, Response, NextFunction } from 'express';
import { sendError } from '@/utils/response';
import { AppError } from '@/utils/http-error';

export function errorHandler(
  error: unknown,
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  console.error('Error:', error);

  if (error instanceof AppError) {
    return sendError(res, error.message, error.statusCode, {
      code: error.code,
      ...(error.details ? { details: error.details } : {}),
    }) as any;
  }

  sendError(res, 'An unexpected error occurred', 500);
}