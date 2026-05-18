import { Router } from 'express';
import { validate } from '@/middlewares/validate';
import { adminProtect } from '@/middlewares/admin.middleware';
import AdminAuthService from './admin-auth.service';
import AdminAuthController from './admin-auth.controller';
import { adminLoginSchema } from './admin-auth.validate';

export function createAdminAuthRouter(): Router {
  const router = Router();
  const controller = new AdminAuthController(new AdminAuthService());

  router.post('/login', validate(adminLoginSchema), controller.login);
  router.get('/me', adminProtect, controller.getAdminInfo);

  return router;
}
