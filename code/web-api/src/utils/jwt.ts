import jwt, { type SignOptions } from 'jsonwebtoken';
import { AppError } from './http-error';

export interface AuthTokenPayload {
  sub: string;
  email: string;
  role: string;
  tokenType: 'access' | 'refresh';
}

export interface AuthenticatedUser {
  userId: string;
  email: string;
  role: string;
}

function getRequiredEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new AppError(`${name} is not configured`, {
      statusCode: 500,
      code: 'INTERNAL_SERVER_ERROR',
    });
  }

  return value;
}

function parseDuration(value: string): SignOptions['expiresIn'] {
  if (/^\d+$/.test(value)) {
    return Number(value);
  }

  return value as SignOptions['expiresIn'];
}

function signToken(payload: AuthTokenPayload, secret: string, expiresIn: string): string {
  return jwt.sign(payload, secret, {
    expiresIn: parseDuration(expiresIn),
  });
}

function verifyToken(token: string, secret: string, expectedType: 'access' | 'refresh'): AuthenticatedUser {
  let decoded: jwt.JwtPayload;

  try {
    decoded = jwt.verify(token, secret) as jwt.JwtPayload;
  } catch {
    throw new AppError('Invalid or expired token', {
      statusCode: 401,
      code: 'UNAUTHORIZED',
    });
  }

  if (
    typeof decoded.sub !== 'string' ||
    typeof decoded.email !== 'string' ||
    typeof decoded.role !== 'string' ||
    decoded.tokenType !== expectedType
  ) {
    throw new AppError('Invalid token payload', {
      statusCode: 401,
      code: 'UNAUTHORIZED',
    });
  }

  return {
    userId: decoded.sub,
    email: decoded.email,
    role: decoded.role,
  };
}

export function signAccessToken(user: AuthenticatedUser): string {
  return signToken(
    {
      sub: user.userId,
      email: user.email,
      role: user.role,
      tokenType: 'access',
    },
    getRequiredEnv('JWT_ACCESS_SECRET'),
    process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
  );
}

export function signRefreshToken(user: AuthenticatedUser): string {
  return signToken(
    {
      sub: user.userId,
      email: user.email,
      role: user.role,
      tokenType: 'refresh',
    },
    getRequiredEnv('JWT_REFRESH_SECRET'),
    process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
  );
}

export function verifyAccessToken(token: string): AuthenticatedUser {
  return verifyToken(token, getRequiredEnv('JWT_ACCESS_SECRET'), 'access');
}

export function verifyRefreshToken(token: string): AuthenticatedUser {
  return verifyToken(token, getRequiredEnv('JWT_REFRESH_SECRET'), 'refresh');
}
