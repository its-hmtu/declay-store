import type { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '@/utils/jwt';
import { httpError } from '@/utils/http-error';

/**
 * Authentication middleware
 * Verifies JWT token from Authorization header (Bearer token)
 * and attaches user to request
 */
export function routeProtect(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw httpError(401, 'Authorization header with Bearer token is required');
    }

    // Extract token from "Bearer {token}"
    const token = authHeader.substring(7);

    if (!token) {
      throw httpError(401, 'Token is missing');
    }

    const decoded = verifyAccessToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    next(httpError(401, 'Invalid or expired token', error));
  }
}
