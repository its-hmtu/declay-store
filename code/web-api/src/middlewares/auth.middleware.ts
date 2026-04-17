import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../utils/http-error';
import { verifyAccessToken } from '../utils/jwt';

function getBearerToken(request: Request): string {
  const authorizationHeader = request.headers.authorization;

  if (!authorizationHeader) {
    throw new AppError('Missing authorization header', {
      statusCode: 401,
      code: 'UNAUTHORIZED',
    });
  }

  const [scheme, token] = authorizationHeader.split(' ');

  if (scheme !== 'Bearer' || !token) {
    throw new AppError('Invalid authorization format. Use Bearer <token>', {
      statusCode: 401,
      code: 'UNAUTHORIZED',
    });
  }

  return token;
}

export function authMiddleware(request: Request, _response: Response, next: NextFunction): void {
  const token = getBearerToken(request);
  const user = verifyAccessToken(token);

  request.auth = user;
  next();
}
