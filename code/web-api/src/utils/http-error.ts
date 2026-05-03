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

/**
 * Helper function to create HTTP errors
 * @param statusCode HTTP status code (400, 401, 404, 500, etc.)
 * @param message Error message
 * @param details Additional error details/context
 * @returns AppError instance
 */
export function httpError(
  statusCode: number,
  message: string,
  details?: unknown
): AppError {
  // Map status codes to error codes
  let code: ErrorCode = 'INTERNAL_SERVER_ERROR';
  
  if (statusCode === 400) code = 'BAD_REQUEST';
  else if (statusCode === 401) code = 'UNAUTHORIZED';
  else if (statusCode === 403) code = 'FORBIDDEN';
  else if (statusCode === 404) code = 'NOT_FOUND';

  return new AppError(message, {
    statusCode,
    code,
    details,
    isOperational: true,
  });
}
