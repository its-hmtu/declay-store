import jwt, { type SignOptions } from 'jsonwebtoken';
import { AppError } from './http-error';

export interface AuthTokenPayload {
  sub: string;
  email: string;
  tokenType: 'access' | 'refresh';
}

export interface AuthenticatedUser {
  userId: number;
  email: string;
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
    decoded.tokenType !== expectedType
  ) {
    throw new AppError('Invalid token payload', {
      statusCode: 401,
      code: 'UNAUTHORIZED',
    });
  }

  const userId = Number(decoded.sub);
  if (!Number.isInteger(userId) || userId <= 0) {
    throw new AppError('Invalid token payload', {
      statusCode: 401,
      code: 'UNAUTHORIZED',
    });
  }

  return {
    userId,
    email: decoded.email,
  };
}

export function signAccessToken(user: AuthenticatedUser): string {
  return signToken(
    {
      sub: String(user.userId),
      email: user.email,
      tokenType: 'access',
    },
    getRequiredEnv('JWT_ACCESS_SECRET'),
    process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
  );
}

export function signRefreshToken(user: AuthenticatedUser): string {
  return signToken(
    {
      sub: String(user.userId),
      email: user.email,
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

export interface AuthenticatedAdmin {
  adminId: number;
  email: string;
  role: string;
}

export function signAdminAccessToken(admin: AuthenticatedAdmin): string {
  return jwt.sign(
    { sub: String(admin.adminId), email: admin.email, role: admin.role, tokenType: 'admin' },
    getRequiredEnv('JWT_ADMIN_SECRET'),
    { expiresIn: (process.env.JWT_ADMIN_EXPIRED_IN ?? '8h') as SignOptions['expiresIn'] },
  );
}

export function verifyAdminAccessToken(token: string): AuthenticatedAdmin {
  let decoded: jwt.JwtPayload;

  try {
    decoded = jwt.verify(token, getRequiredEnv('JWT_ADMIN_SECRET')) as jwt.JwtPayload;
  } catch {
    throw new AppError('Invalid or expired admin token', { statusCode: 401, code: 'UNAUTHORIZED' });
  }

  if (decoded.tokenType !== 'admin' || typeof decoded.sub !== 'string' || typeof decoded.email !== 'string') {
    throw new AppError('Invalid admin token payload', { statusCode: 401, code: 'UNAUTHORIZED' });
  }

  const adminId = Number(decoded.sub);
  if (!Number.isInteger(adminId) || adminId <= 0) {
    throw new AppError('Invalid admin token payload', { statusCode: 401, code: 'UNAUTHORIZED' });
  }

  return { adminId, email: decoded.email, role: decoded.role as string };
}
