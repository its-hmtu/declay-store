import type { Request } from 'express';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id?: number;
        userId?: number;
        email?: string;
        [key: string]: any;
      };
    }
  }
}
