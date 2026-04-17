import type { Request } from 'express';

export interface RequestContext {
  method: string;
  path: string;
  ip: string;
  userAgent: string;
  requestId: string;
}

export function getRequestContext(request: Request): RequestContext {
  return {
    method: request.method,
    path: request.originalUrl ?? request.url,
    ip: request.ip ?? 'unknown',
    userAgent: request.get('user-agent') ?? 'unknown',
    requestId:
      request.headers['x-request-id']?.toString() ??
      request.headers['x-correlation-id']?.toString() ??
      'unknown',
  };
}
