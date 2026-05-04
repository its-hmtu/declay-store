// Index routes for the application
import { Router } from 'express';
import { createAuthRouter } from '../auth/auth.route';
import { createAddressRoutes } from '../address/address.route';
import { createUserRouter } from '../user/user.route';

export function createRoutes(): Router {
  const router = Router();
  router.use('/auth', createAuthRouter());
  router.use('/users', createUserRouter());
  router.use('/addresses', createAddressRoutes());
  return router;
}