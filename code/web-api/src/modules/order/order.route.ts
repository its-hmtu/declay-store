import { Router } from 'express';
import { validate } from '@/middlewares/validate';
import { routeProtect } from '@/middlewares/auth.middleware';
import { adminProtect } from '@/middlewares/admin.middleware';
import OrderService from './order.service';
import OrderController from './order.controller';
import { createOrderSchema, updateOrderStatusSchema, orderIdSchema } from './order.validate';

export function createOrderRouter(): Router {
  const router = Router();
  const controller = new OrderController(new OrderService());

  router.use(routeProtect);

  router.post('/checkout', validate(createOrderSchema), controller.createCheckout);
  router.get('/', controller.listMyOrders);
  router.get('/:id', validate(orderIdSchema, 'params'), controller.getOrder);
  router.post('/:id/cancel', validate(orderIdSchema, 'params'), controller.cancelOrder);

  return router;
}

export function createAdminOrderRouter(): Router {
  const router = Router();
  const controller = new OrderController(new OrderService());

  router.use(adminProtect);

  router.get('/', controller.adminListOrders);
  router.get('/:id', validate(orderIdSchema, 'params'), controller.getOrder);
  router.put('/:id/status', validate(orderIdSchema, 'params'), validate(updateOrderStatusSchema), controller.adminUpdateStatus);

  return router;
}
