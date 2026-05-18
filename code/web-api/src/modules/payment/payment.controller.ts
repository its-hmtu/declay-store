import type { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import Stripe from 'stripe';
import config from '@/config/env';
import { sendSuccess, sendError } from '@/utils/response';
import OrderService from '@/modules/order/order.service';

const stripe = new Stripe(config.stripe.secretKey);
const orderService = new OrderService();

type StripeWebhookEvent = {
  type: string;
  data: { object: { id: string } };
};

export const stripeWebhook = asyncHandler(async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'] as string;

  let event: StripeWebhookEvent;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      config.stripe.webhookSecret,
    ) as unknown as StripeWebhookEvent;
  } catch {
    sendError(res, 'Webhook signature verification failed', 400);
    return;
  }

  if (event.type === 'payment_intent.succeeded') {
    await orderService.markAsPaid(event.data.object.id);
  }

  sendSuccess(res, null, 'Webhook received');
});
