// Index routes for the application
import { Router } from 'express';
import { createAuthRouter } from '../modules/auth/auth.route';
import { createAddressRoutes } from '../modules/address/address.route';
import { createUserRouter } from '../modules/user/user.route';
import { createArticleRouter } from '../modules/article/artical.route';

export function createRoutes(): Router {
  const router = Router();
  router.use('/auth', createAuthRouter());
  router.use('/users', createUserRouter());
  router.use('/addresses', createAddressRoutes());
  router.use('/articles', createArticleRouter());
  return router;
}