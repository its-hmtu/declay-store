import { Queue, Worker, type Job } from 'bullmq';
import { redisConfig } from '@/config/redis';
import { sendVerificationEmail, sendPasswordResetEmail, sendOrderStatusEmail } from '@/lib/email';
import { Order, type OrderStatus } from '@/modules/order/order.entity';
import User from '@/modules/user/user.entity';

export type EmailJobName = 'verify-email' | 'reset-password' | 'order-status-update';

export interface VerifyEmailJobData {
  to: string;
  token: string;
}

export interface ResetPasswordJobData {
  to: string;
  token: string;
}

export interface OrderStatusUpdateJobData {
  orderId: number;
  status: OrderStatus;
  carrier?: string | null;
  trackingNumber?: string | null;
  estimatedDeliveryAt?: string | null;
}

export type EmailJobData = VerifyEmailJobData | ResetPasswordJobData | OrderStatusUpdateJobData;

// BullMQ requires maxRetriesPerRequest: null — already set in redisConfig
const connection = {
  host: redisConfig.host,
  port: redisConfig.port,
  password: redisConfig.password,
  db: redisConfig.db,
};

export const emailQueue = new Queue<EmailJobData, void, EmailJobName>('email', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 50 },
  },
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let emailWorker: Worker<any, any, any> | null = null;

export function startEmailWorker(): void {
  const worker = new Worker<EmailJobData, void, EmailJobName>(
    'email',
    async (job: Job<EmailJobData, void, EmailJobName>) => {
      if (job.name === 'verify-email') {
        const { to, token } = job.data as VerifyEmailJobData;
        await sendVerificationEmail(to, token);
      } else if (job.name === 'reset-password') {
        const { to, token } = job.data as ResetPasswordJobData;
        await sendPasswordResetEmail(to, token);
      } else if (job.name === 'order-status-update') {
        const { orderId, status, carrier, trackingNumber, estimatedDeliveryAt } = job.data as OrderStatusUpdateJobData;
        const order = await Order.findByPk(orderId, {
          include: [{ model: User, as: 'user', attributes: ['email'] }],
        });
        const userEmail = (order as any)?.user?.email as string | undefined;
        if (!order || !userEmail) return;

        await sendOrderStatusEmail(userEmail, orderId, status, {
          carrier: carrier ?? null,
          trackingNumber: trackingNumber ?? null,
          estimatedDeliveryAt: estimatedDeliveryAt ?? null,
        });
      }
    },
    { connection, concurrency: 5 },
  );

  worker.on('completed', (job) => {
    console.log(`✅ Email job ${job.id} (${job.name}) completed`);
  });

  worker.on('failed', (job, err) => {
    console.error(`❌ Email job ${job?.id} (${job?.name}) failed:`, err.message);
  });

  emailWorker = worker;
  console.log('✅ Email worker started');
}

export async function closeEmailWorker(): Promise<void> {
  if (emailWorker) {
    await emailWorker.close();
    emailWorker = null;
    console.log('✅ Email worker closed');
  }
}

export async function queueOrderStatusEmail(data: OrderStatusUpdateJobData): Promise<void> {
  await emailQueue.add('order-status-update', data);
}
