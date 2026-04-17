export type ErrorCode =
  | 'BAD_REQUEST'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'INTERNAL_SERVER_ERROR'
  | 'DATABASE_ERROR'
  | 'REDIS_ERROR';

export interface AppErrorOptions {
  statusCode?: number;
  code?: ErrorCode;
  details?: unknown;
  isOperational?: boolean;
}

export class AppError extends Error {
  readonly statusCode: number;
  readonly code: ErrorCode;
  readonly details?: unknown;
  readonly isOperational: boolean;

  constructor(message: string, options: AppErrorOptions = {}) {
    super(message);

    this.name = 'AppError';
    this.statusCode = options.statusCode ?? 500;
    this.code = options.code ?? 'INTERNAL_SERVER_ERROR';
    this.details = options.details;
    this.isOperational = options.isOperational ?? true;

    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace?.(this, AppError);
  }
}
