import { Queue, Worker, type Job } from 'bullmq';
import { redisConfig } from '@/config/redis';
import config from '@/config/env';
import { Order, OrderShipment } from '@/modules/order/order.entity';
import Address from '@/modules/address/address.entity';
import { estimateShipping } from '@/lib/shipping';
import { queueOrderStatusEmail } from '@/lib/email-queue';

/**
 * Order fulfillment pipeline. Once an order is paid, it is walked through the
 * lifecycle automatically: paid → processing → shipped → delivered. Each step is
 * a delayed BullMQ job that re-enqueues the next, and every handler guards on the
 * current status so a cancelled (or already-advanced) order is left untouched.
 */

export type ShippingJobName = 'to-processing' | 'to-shipped' | 'to-delivered';

export interface ShippingJobData {
  orderId: number;
}

const connection = {
  host: redisConfig.host,
  port: redisConfig.port,
  password: redisConfig.password,
  db: redisConfig.db,
};

export const shippingQueue = new Queue<ShippingJobData, void, ShippingJobName>('shipping', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 50 },
  },
});

// A stable jobId per (order, step) so re-enqueueing — e.g. on startup
// reconciliation — never duplicates a job that is already in flight.
function addStep(name: ShippingJobName, orderId: number, delay: number) {
  return shippingQueue.add(name, { orderId }, { delay, jobId: `fulfill-${orderId}-${name}` });
}

/** Kicks off the pipeline for a freshly-paid order. */
export async function enqueueFulfillment(orderId: number): Promise<void> {
  await addStep('to-processing', orderId, config.shipping.processingDelayMs);
}

/**
 * Re-queues orders that are mid-fulfillment but have no active job — e.g. orders
 * that became paid before this pipeline existed, or were in flight during a crash
 * before BullMQ persisted their delayed job. Safe to run on every boot: the jobId
 * dedup skips in-flight orders and the handlers guard on status.
 */
export async function reconcileFulfillment(): Promise<void> {
  const orders = await Order.findAll({
    where: { status: ['paid', 'processing', 'shipped'] },
    attributes: ['id', 'status'],
  });
  if (orders.length === 0) return;

  for (const order of orders) {
    if (order.status === 'paid') await addStep('to-processing', order.id, config.shipping.processingDelayMs);
    else if (order.status === 'processing') await addStep('to-shipped', order.id, config.shipping.dispatchDelayMs);
    else if (order.status === 'shipped') await addStep('to-delivered', order.id, config.shipping.dayMs);
  }
  console.log(`📦 Reconciled ${orders.length} in-flight order(s) into the fulfillment queue`);
}

async function handleToProcessing(orderId: number): Promise<void> {
  const order = await Order.findByPk(orderId);
  if (!order || order.status !== 'paid') return;

  await order.update({ status: 'processing' });
  await queueOrderStatusEmail({ orderId, status: 'processing' });
  await addStep('to-shipped', orderId, config.shipping.dispatchDelayMs);
}

async function handleToShipped(orderId: number): Promise<void> {
  const order = await Order.findByPk(orderId);
  if (!order || order.status !== 'processing') return;

  const address = order.shippingAddressId ? await Address.findByPk(order.shippingAddressId) : null;
  const now = new Date();
  const estimate = estimateShipping(address, now);

  const existing = await OrderShipment.findOne({ where: { orderId } });
  if (!existing) {
    await OrderShipment.create({
      orderId,
      carrier: estimate.carrier,
      trackingNumber: estimate.trackingNumber,
      shippedAt: now,
      estimatedDeliveryAt: estimate.estimatedDeliveryAt,
    });
  }

  await order.update({ status: 'shipped' });
  await queueOrderStatusEmail({
    orderId,
    status: 'shipped',
    carrier: estimate.carrier,
    trackingNumber: estimate.trackingNumber,
    estimatedDeliveryAt: estimate.estimatedDeliveryAt.toISOString(),
  });

  const deliveryDelay = estimate.leadTimeDays * config.shipping.dayMs;
  await addStep('to-delivered', orderId, deliveryDelay);
}

async function handleToDelivered(orderId: number): Promise<void> {
  const order = await Order.findByPk(orderId);
  if (!order || order.status !== 'shipped') return;

  await order.update({ status: 'delivered' });
  await queueOrderStatusEmail({ orderId, status: 'delivered' });
  await OrderShipment.update({ deliveredAt: new Date() }, { where: { orderId } });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let shippingWorker: Worker<any, any, any> | null = null;

export function startShippingWorker(): void {
  const worker = new Worker<ShippingJobData, void, ShippingJobName>(
    'shipping',
    async (job: Job<ShippingJobData, void, ShippingJobName>) => {
      const { orderId } = job.data;
      if (job.name === 'to-processing') await handleToProcessing(orderId);
      else if (job.name === 'to-shipped') await handleToShipped(orderId);
      else if (job.name === 'to-delivered') await handleToDelivered(orderId);
    },
    { connection, concurrency: 5 },
  );

  worker.on('completed', (job) => {
    console.log(`📦 Shipping job ${job.id} (${job.name}) completed`);
  });
  worker.on('failed', (job, err) => {
    console.error(`❌ Shipping job ${job?.id} (${job?.name}) failed:`, err.message);
  });

  shippingWorker = worker;
  console.log('✅ Shipping worker started');
}

export async function closeShippingWorker(): Promise<void> {
  if (shippingWorker) {
    await shippingWorker.close();
    shippingWorker = null;
    console.log('✅ Shipping worker closed');
  }
}
