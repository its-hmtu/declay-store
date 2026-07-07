import { Queue, Worker, type Job } from 'bullmq';
import { redisConfig } from '@/config/redis';
import config from '@/config/env';
import { sequelize } from '@/config/sequelize';
import { Order, OrderItem } from '@/modules/order/order.entity';
import ProductVariant from '@/modules/product-variant/product-variant.entity';

/**
 * Reservation expiry (W-03). Stock is reserved by decrementing ProductVariant.stock
 * the moment an order is created (status `pending_payment`). If the customer never
 * completes payment, that stock must be released. On order creation we schedule a
 * delayed job; when it fires, an order still in `pending_payment` is cancelled and its
 * reserved stock returned. Handlers guard on status so a paid/cancelled order is left
 * untouched.
 */

export interface ReservationJobData {
  orderId: number;
}

export type ReservationJobName = 'expire';

const connection = {
  host: redisConfig.host,
  port: redisConfig.port,
  password: redisConfig.password,
  db: redisConfig.db,
};

export const reservationQueue = new Queue<ReservationJobData, void, ReservationJobName>('reservation', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 50 },
  },
});

/** Schedule the expiry check for a freshly-created, unpaid order. */
export async function enqueueReservationExpiry(
  orderId: number,
  delayMs: number = config.reservation.ttlMs,
): Promise<void> {
  await reservationQueue.add('expire', { orderId }, { delay: delayMs, jobId: `reserve-expire:${orderId}` });
}

/**
 * Release the stock reserved by an order and mark it cancelled — but only if it is
 * still `pending_payment`. Runs in a transaction with a row lock so it can never race
 * with markAsPaid (which also locks the order row before finalizing payment).
 */
async function releaseReservation(orderId: number): Promise<void> {
  await sequelize.transaction(async (t) => {
    const order = await Order.findOne({ where: { id: orderId }, lock: t.LOCK.UPDATE, transaction: t });
    if (!order || order.status !== 'pending_payment') return;

    const items = await OrderItem.findAll({ where: { orderId }, transaction: t });
    for (const item of items) {
      await ProductVariant.increment('stock', { by: item.quantity, where: { id: item.variantId }, transaction: t });
    }

    await order.update({ status: 'cancelled' }, { transaction: t });
  });
}

/**
 * Re-arm expiry for unpaid orders after a restart. Orders already past their window
 * are expired immediately; the rest are re-enqueued for their remaining time. Safe to
 * run on every boot: the jobId dedup skips orders already scheduled.
 */
export async function reconcileReservations(): Promise<void> {
  const orders = await Order.findAll({
    where: { status: 'pending_payment' },
    attributes: ['id', 'createdAt'],
  });
  if (orders.length === 0) return;

  const now = Date.now();
  for (const order of orders) {
    const age = now - new Date(order.createdAt).getTime();
    const remaining = Math.max(0, config.reservation.ttlMs - age);
    await enqueueReservationExpiry(order.id, remaining);
  }
  console.log(`🕒 Reconciled ${orders.length} pending order(s) into the reservation-expiry queue`);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let reservationWorker: Worker<any, any, any> | null = null;

export function startReservationWorker(): void {
  const worker = new Worker<ReservationJobData, void, ReservationJobName>(
    'reservation',
    async (job: Job<ReservationJobData, void, ReservationJobName>) => {
      if (job.name === 'expire') await releaseReservation(job.data.orderId);
    },
    { connection, concurrency: 5 },
  );

  worker.on('completed', (job) => {
    console.log(`🕒 Reservation job ${job.id} (${job.name}) completed`);
  });
  worker.on('failed', (job, err) => {
    console.error(`❌ Reservation job ${job?.id} (${job?.name}) failed:`, err.message);
  });

  reservationWorker = worker;
  console.log('✅ Reservation worker started');
}

export async function closeReservationWorker(): Promise<void> {
  if (reservationWorker) {
    await reservationWorker.close();
    reservationWorker = null;
    console.log('✅ Reservation worker closed');
  }
}
