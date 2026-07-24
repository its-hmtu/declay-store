import { Router } from 'express';
import ShipmentService from './shipment.service';
import ShipmentWebhookController from './shipment.controller';

// Public webhook endpoints for shipping aggregators/carriers (secret-guarded).
export function createWebhookRouter(): Router {
  const router = Router();
  const controller = new ShipmentWebhookController(new ShipmentService());
  router.post('/easyship', controller.easyship);
  return router;
}
