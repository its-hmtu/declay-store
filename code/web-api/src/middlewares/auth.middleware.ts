import type { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '@/utils/jwt';
import { httpError } from '@/utils/http-error';
import { isTokenDenylisted, isIssuedBeforeRevocation } from '@/lib/token-revocation';

/**
 * Authentication middleware
 * Verifies JWT token from Authorization header (Bearer token),
 * checks it has not been revoked, and attaches user to request
 */
export async function routeProtect(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  let decoded;
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

    decoded = verifyAccessToken(token);
  } catch (error) {
    return next(httpError(401, 'Invalid or expired token', error));
  }

  // Revocation checks run outside the verify try/catch so their specific
  // messages aren't masked as "Invalid or expired token"
  if (decoded.jti && (await isTokenDenylisted(decoded.jti))) {
    return next(httpError(401, 'Token has been revoked'));
  }
  if (decoded.iat && (await isIssuedBeforeRevocation('user', decoded.userId, decoded.iat))) {
    return next(httpError(401, 'Session has been revoked, please log in again'));
  }

  req.user = decoded;
  next();
}

/**
 * Optional authentication — attaches req.user when a valid Bearer token is
 * present, but never rejects. Used by the storefront chatbot so guests can chat
 * while logged-in users unlock personalized lookups (e.g. their order status).
 */
export async function optionalAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return next();

  try {
    const decoded = verifyAccessToken(authHeader.substring(7));
    if (decoded.jti && (await isTokenDenylisted(decoded.jti))) return next();
    if (decoded.iat && (await isIssuedBeforeRevocation('user', decoded.userId, decoded.iat))) {
      return next();
    }
    req.user = decoded;
  } catch {
    // Invalid token on an optional route — proceed as guest
  }
  next();
}
