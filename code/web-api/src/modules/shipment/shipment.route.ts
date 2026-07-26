import express, { Router } from 'express';
import ShipmentService from './shipment.service';
import ShipmentWebhookController from './shipment.controller';
import { vnpayIpn, vnpayVerifyReturn } from '@/modules/payment-provider/vnpay/vnpay.controller';

// Public webhook endpoints for shipping aggregators/carriers (secret-guarded).
export function createWebhookRouter(): Router {
  const router = Router();
  const controller = new ShipmentWebhookController(new ShipmentService());
  router.post('/easyship', controller.easyship);
  // M-12: VNPay IPN. Tài liệu VNPay dùng GET, nhưng một số cấu hình merchant
  // gửi POST form — nhận cả hai để không bao giờ mất callback thanh toán.
  router.get('/vnpay/verify-return', vnpayVerifyReturn);
  router.get('/vnpay', vnpayIpn);
  router.post('/vnpay', express.urlencoded({ extended: true }), vnpayIpn);
  return router;
}
