import type { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import Stripe from 'stripe';
import config from '@/config/env';
import { sendSuccess, sendError } from '@/utils/response';
import OrderService from '@/modules/order/order.service';
import WebhookEventService from '@/modules/webhook-event/webhook-event.service';

const stripe = new Stripe(config.stripe.secretKey);
const orderService = new OrderService();
const webhookEvents = new WebhookEventService();

type StripeWebhookEvent = {
  id: string;
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

  // W-01: dedup theo event.id ở TẦNG webhook. Chữ ký đã xác thực ở trên nên
  // event.id tin cậy được. markAsPaid vẫn tự idempotent (guard trạng thái) —
  // đây là lớp phòng thủ thứ hai, và cần thiết cho các sự kiện tương lai
  // (hoàn tiền) vốn không có guard trạng thái tự nhiên.
  const firstTime = await webhookEvents.claim('stripe', event.id, event.type);
  if (!firstTime) {
    sendSuccess(res, null, 'Duplicate event ignored');
    return;
  }

  try {
    if (event.type === 'payment_intent.succeeded') {
      await orderService.markAsPaid(event.data.object.id);
    } else if (event.type === 'payment_intent.payment_failed') {
      await orderService.markPaymentFailed(event.data.object.id);
    }
  } catch (err) {
    // Xử lý lỗi giữa chừng: gỡ dấu để Stripe retry lần sau, không "nuốt" sự kiện.
    await webhookEvents.release('stripe', event.id);
    throw err;
  }

  sendSuccess(res, null, 'Webhook received');
});
