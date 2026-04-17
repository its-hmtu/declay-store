import type { Request, Response, NextFunction } from 'express';
import { sendError } from '../utils/response';

export function notFoundMiddleware(
  request: Request,
  response: Response,
  _next: NextFunction,
): void {
  sendError(response, 'Route not found', 404, {
    path: request.originalUrl ?? request.url,
  });
}
