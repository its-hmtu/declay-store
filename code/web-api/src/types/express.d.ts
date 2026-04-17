import type { AuthenticatedUser } from '../utils/jwt';

declare module 'express-serve-static-core' {
  interface Request {
    auth?: AuthenticatedUser;
  }
}

export {};
