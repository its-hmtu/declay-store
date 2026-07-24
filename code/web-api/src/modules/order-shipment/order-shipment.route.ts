import { Router } from 'express';
import { validate } from '@/middlewares/validate';
import { routeProtect } from '@/middlewares/auth.middleware';
import { adminProtect, requireRole } from '@/middlewares/admin.middleware';
import OrderShipmentService from './order-shipment.service';
import OrderShipmentController from './order-shipment.controller';
import {
  orderIdParamSchema,
  createShipmentSchema,
  updateShipmentSchema,
  simulateTrackingSchema,
} from './order-shipment.validate';

// Customer: GET /api/orders/:orderId/shipment (own order only)
export function createShipmentRouter(): Router {
  const router = Router({ mergeParams: true });
  const controller = new OrderShipmentController(new OrderShipmentService());

  router.use(routeProtect);
  router.get('/', validate(orderIdParamSchema, 'params'), controller.getMine);

  return router;
}

// Admin: /api/admin/orders/:orderId/shipment
export function createAdminShipmentRouter(): Router {
  const router = Router({ mergeParams: true });
  const controller = new OrderShipmentController(new OrderShipmentService());

  router.use(adminProtect, requireRole('admin', 'super_admin'));

  router.get('/', validate(orderIdParamSchema, 'params'), controller.adminGet);
  router.post('/', validate(orderIdParamSchema, 'params'), validate(createShipmentSchema), controller.adminCreate);
  router.post('/provider', validate(orderIdParamSchema, 'params'), controller.adminCreateViaProvider);
  router.post('/simulate', validate(orderIdParamSchema, 'params'), validate(simulateTrackingSchema), controller.adminSimulate);
  router.put('/', validate(orderIdParamSchema, 'params'), validate(updateShipmentSchema), controller.adminUpdate);
  router.delete('/', validate(orderIdParamSchema, 'params'), controller.adminRemove);

  return router;
}
