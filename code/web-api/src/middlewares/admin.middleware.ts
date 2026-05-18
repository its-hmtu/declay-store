import type { Request, Response, NextFunction } from 'express';
import { verifyAdminAccessToken, type AuthenticatedAdmin } from '@/utils/jwt';
import { httpError } from '@/utils/http-error';

declare global {
  namespace Express {
    interface Request {
      admin?: AuthenticatedAdmin;
    }
  }
}

export function adminProtect(req: Request, res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw httpError(401, 'Admin authorization header with Bearer token is required');
    }

    const token = authHeader.substring(7);
    const decoded = verifyAdminAccessToken(token);
    req.admin = decoded;
    next();
  } catch (error) {
    next(httpError(401, 'Invalid or expired admin token'));
  }
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.admin) {
      return next(httpError(401, 'Not authenticated'));
    }
    if (!roles.includes(req.admin.role)) {
      return next(httpError(403, 'Insufficient permissions'));
    }
    next();
  };
}
