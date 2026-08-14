import { Router } from 'express';
import { validate } from '@/middlewares/validate';
import { routeProtect, optionalAuth } from '@/middlewares/auth.middleware';
import { adminProtect, requireRole } from '@/middlewares/admin.middleware';
import OrderService from './order.service';
import OrderController from './order.controller';
import { createOrderSchema, updateOrderStatusSchema, returnOrderSchema, orderIdSchema } from './order.validate';

export function createOrderRouter(): Router {
  const router = Router();
  const controller = new OrderController(new OrderService());

  // M-01: guests can check out and track an order by token; everything else needs a login.
  router.post('/checkout', optionalAuth, validate(createOrderSchema), controller.createCheckout);
  router.get('/lookup', controller.lookupGuestOrder);
  router.get('/summary', controller.guestOrderSummary);

  router.use(routeProtect);

  router.get('/', controller.listMyOrders);
  router.get('/:id', validate(orderIdSchema, 'params'), controller.getOrder);
  router.post('/:id/cancel', validate(orderIdSchema, 'params'), controller.cancelOrder);
  // M-29e: khách gửi yêu cầu trả hàng lỗi.
  router.post('/:id/returns', validate(orderIdSchema, 'params'), controller.createReturn);

  return router;
}

export function createAdminOrderRouter(): Router {
  const router = Router();
  const controller = new OrderController(new OrderService());

  router.use(adminProtect, requireRole('admin', 'super_admin'));

  router.get('/', controller.adminListOrders);
  // M-29d: yêu cầu huỷ — đặt TRƯỚC '/:id' để không bị route động nuốt.
  router.get('/cancellations', controller.adminListCancellations);
  router.post('/cancellations/:id/approve', validate(orderIdSchema, 'params'), controller.adminApproveCancellation);
  router.post('/cancellations/:id/reject', validate(orderIdSchema, 'params'), controller.adminRejectCancellation);
  // M-29e: yêu cầu trả hàng — đặt TRƯỚC '/:id'.
  router.get('/returns', controller.adminListReturns);
  router.post('/returns/:id/approve', validate(orderIdSchema, 'params'), controller.adminApproveReturn);
  router.post('/returns/:id/reject', validate(orderIdSchema, 'params'), controller.adminRejectReturn);
  router.post('/returns/:id/receive', validate(orderIdSchema, 'params'), controller.adminReceiveReturn);
  router.get('/:id', validate(orderIdSchema, 'params'), controller.adminGetOrder);
  router.put('/:id/status', validate(orderIdSchema, 'params'), validate(updateOrderStatusSchema), controller.adminUpdateStatus);
  router.post('/:id/return', validate(orderIdSchema, 'params'), validate(returnOrderSchema), controller.adminReturnOrder);

  return router;
}
