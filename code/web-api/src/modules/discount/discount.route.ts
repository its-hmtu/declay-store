import { Router } from 'express';
import { validate } from '@/middlewares/validate';
import { routeProtect } from '@/middlewares/auth.middleware';
import { adminProtect, requireRole } from '@/middlewares/admin.middleware';
import DiscountService from './discount.service';
import DiscountController from './discount.controller';
import {
  validateDiscountSchema,
  createDiscountSchema,
  updateDiscountSchema,
  discountIdSchema,
} from './discount.validate';

// Customer: POST /api/discounts/validate
export function createDiscountRouter(): Router {
  const router = Router();
  const controller = new DiscountController(new DiscountService());

  router.use(routeProtect);
  router.post('/validate', validate(validateDiscountSchema), controller.validate);

  return router;
}

// Admin: /api/admin/discounts
export function createAdminDiscountRouter(): Router {
  const router = Router();
  const controller = new DiscountController(new DiscountService());

  router.use(adminProtect, requireRole('admin', 'super_admin'));

  router.get('/', controller.adminList);
  router.post('/', validate(createDiscountSchema), controller.adminCreate);
  router.get('/:id', validate(discountIdSchema, 'params'), controller.adminFindById);
  router.put('/:id', validate(discountIdSchema, 'params'), validate(updateDiscountSchema), controller.adminUpdate);
  router.delete('/:id', validate(discountIdSchema, 'params'), controller.adminRemove);

  return router;
}
