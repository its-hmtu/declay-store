import type { Request, Response, NextFunction } from 'express';
import { verifyAdminAccessToken, type AuthenticatedAdmin } from '@/utils/jwt';
import { httpError } from '@/utils/http-error';
import { isTokenDenylisted, isIssuedBeforeRevocation } from '@/lib/token-revocation';

declare global {
  namespace Express {
    interface Request {
      admin?: AuthenticatedAdmin;
    }
  }
}

export async function adminProtect(req: Request, res: Response, next: NextFunction): Promise<void> {
  let decoded;
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw httpError(401, 'Admin authorization header with Bearer token is required');
    }

    const token = authHeader.substring(7);
    decoded = verifyAdminAccessToken(token);
  } catch (error) {
    return next(httpError(401, 'Invalid or expired admin token'));
  }

  if (decoded.jti && (await isTokenDenylisted(decoded.jti))) {
    return next(httpError(401, 'Admin token has been revoked'));
  }
  if (decoded.iat && (await isIssuedBeforeRevocation('admin', decoded.adminId, decoded.iat))) {
    return next(httpError(401, 'Admin session has been revoked, please log in again'));
  }

  req.admin = decoded;
  next();
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
