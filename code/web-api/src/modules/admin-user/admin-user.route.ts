import { Router } from 'express';
import { validate } from '@/middlewares/validate';
import { adminProtect, requireRole } from '@/middlewares/admin.middleware';
import AdminUserService from './admin-user.service';
import AdminUserController from './admin-user.controller';
import { createAdminSchema, updateAdminSchema, adminIdSchema } from './admin-user.validate';

// Admin user management — restricted to super_admin
export function createAdminUserRouter(): Router {
  const router = Router();
  const controller = new AdminUserController(new AdminUserService());

  router.use(adminProtect, requireRole('super_admin'));

  router.get('/', controller.list);
  router.post('/', validate(createAdminSchema), controller.create);
  router.get('/:id', validate(adminIdSchema, 'params'), controller.findById);
  router.put('/:id', validate(adminIdSchema, 'params'), validate(updateAdminSchema), controller.update);
  router.delete('/:id', validate(adminIdSchema, 'params'), controller.remove);

  return router;
}
