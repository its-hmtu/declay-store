import { Router } from 'express';
import { validate } from '@/middlewares/validate';
import { routeProtect, optionalAuth } from '@/middlewares/auth.middleware';
import { adminProtect, requireRole } from '@/middlewares/admin.middleware';
import OrderService from './order.service';
import OrderController from './order.controller';
import { createOrderSchema, updateOrderStatusSchema, orderIdSchema } from './order.validate';

export function createOrderRouter(): Router {
  const router = Router();
  const controller = new OrderController(new OrderService());

  // M-01: guests can check out and track an order by token; everything else needs a login.
  router.post('/checkout', optionalAuth, validate(createOrderSchema), controller.createCheckout);
  router.get('/lookup', controller.lookupGuestOrder);

  router.use(routeProtect);

  router.get('/', controller.listMyOrders);
  router.get('/:id', validate(orderIdSchema, 'params'), controller.getOrder);
  router.post('/:id/cancel', validate(orderIdSchema, 'params'), controller.cancelOrder);

  return router;
}

export function createAdminOrderRouter(): Router {
  const router = Router();
  const controller = new OrderController(new OrderService());

  router.use(adminProtect, requireRole('admin', 'super_admin'));

  router.get('/', controller.adminListOrders);
  router.get('/:id', validate(orderIdSchema, 'params'), controller.getOrder);
  router.put('/:id/status', validate(orderIdSchema, 'params'), validate(updateOrderStatusSchema), controller.adminUpdateStatus);

  return router;
}
