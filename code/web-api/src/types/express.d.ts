import type { Request } from 'express';

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: number;
        email: string;
        [key: string]: any;
      };
    }
  }
}
