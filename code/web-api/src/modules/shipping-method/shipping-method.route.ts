import { Router } from 'express';
import { validate } from '@/middlewares/validate';
import { adminProtect, requireRole } from '@/middlewares/admin.middleware';
import ShippingMethodService from './shipping-method.service';
import ShippingMethodController from './shipping-method.controller';
import {
  createShippingMethodSchema, updateShippingMethodSchema, shippingMethodIdSchema,
} from './shipping-method.validate';

// Public: GET /api/shipping-methods (active only)
export function createShippingMethodRouter(): Router {
  const router = Router();
  const controller = new ShippingMethodController(new ShippingMethodService());
  router.get('/', controller.list);
  return router;
}

// Admin: /api/admin/shipping-methods — admin & super_admin only
export function createAdminShippingMethodRouter(): Router {
  const router = Router();
  const controller = new ShippingMethodController(new ShippingMethodService());
  router.use(adminProtect, requireRole('admin', 'super_admin'));
  router.get('/', controller.adminList);
  router.get('/:id', validate(shippingMethodIdSchema, 'params'), controller.adminFindById);
  router.post('/', validate(createShippingMethodSchema), controller.adminCreate);
  router.put('/:id', validate(shippingMethodIdSchema, 'params'), validate(updateShippingMethodSchema), controller.adminUpdate);
  router.delete('/:id', validate(shippingMethodIdSchema, 'params'), controller.adminRemove);
  return router;
}
