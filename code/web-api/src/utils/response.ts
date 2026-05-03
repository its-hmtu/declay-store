import type { Response } from 'express';
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
  meta?: Record<string, unknown>;
}

export function sendSuccess<T>(
  response: Response,
  data: T,
  message = 'OK',
  statusCode = 200,
  meta?: Record<string, unknown>,
): Response {
  const payload: ApiResponse<T> = {
    success: true,
    message,
    data,
    ...(meta ? { meta } : {}),
  };

  return response.status(statusCode).json(payload);
}

export function sendError(
  response: Response,
  message: string,
  statusCode = 500,
  meta?: Record<string, unknown>,
): Response {
  const payload: ApiResponse<null> = {
    success: false,
    message,
    data: null,
    ...(meta ? { meta } : {}),
  };

  return response.status(statusCode).json(payload);
}
