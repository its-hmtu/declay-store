import { Router } from 'express';
import { stripeWebhook } from './payment.controller';

export function createWebhookRouter(): Router {
  const router = Router();

  // raw body required for Stripe signature verification — must be mounted BEFORE express.json()
  router.post('/stripe', stripeWebhook);

  return router;
}
