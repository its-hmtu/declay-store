import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../utils/http-error';
import { getRequestContext } from '../utils/request';
import { sendError } from '../utils/response';

export function errorHandlerMiddleware(
  error: unknown,
  request: Request,
  response: Response,
  _next: NextFunction,
): void {
  const context = getRequestContext(request);

  if (response.headersSent) {
    return;
  }

  if (error instanceof AppError) {
    console.error('[AppError]', {
      message: error.message,
      code: error.code,
      statusCode: error.statusCode,
      ...context,
      details: error.details,
    });

    sendError(response, error.message, error.statusCode, {
      code: error.code,
      details: error.details,
      requestId: context.requestId,
    });
    return;
  }

  const message = error instanceof Error ? error.message : 'Internal server error';

  console.error('[UnhandledError]', {
    message,
    ...context,
    error: error instanceof Error ? error.stack : error,
  });

  sendError(response, 'Internal server error', 500, {
    requestId: context.requestId,
  });
}
