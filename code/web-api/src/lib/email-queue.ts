import { Queue, Worker, type Job } from 'bullmq';
import { redisConfig } from '@/config/redis';
import {
  sendVerificationEmail, sendPasswordResetEmail, sendOrderStatusEmail,
  sendOrderConfirmation, sendShipmentNotification,
} from '@/lib/email';
import { Order, type OrderStatus } from '@/modules/order/order.entity';
import User from '@/modules/user/user.entity';

export type EmailJobName =
  | 'verify-email' | 'reset-password' | 'order-status-update'
  | 'order-confirmation' | 'order-shipped';

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

export interface OrderConfirmationJobData {
  orderId: number;
}

/** M-18: email báo mã vận đơn. */
export interface OrderShippedJobData {
  orderId: number;
}

export type EmailJobData =
  | VerifyEmailJobData | ResetPasswordJobData | OrderStatusUpdateJobData
  | OrderConfirmationJobData | OrderShippedJobData;

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
        if (!order) return;

        // M-17: khách vãng lai KHÔNG có bản ghi user. Trước đây điều kiện này
        // làm mọi email đơn hàng của họ bị bỏ qua âm thầm — mà email lại là thứ
        // duy nhất họ nhận được, vì họ không xem được lịch sử đơn.
        const recipient = ((order as any)?.user?.email as string | undefined) ?? order.guestEmail ?? null;
        if (!recipient) {
          console.warn(`⚠️ Đơn ${orderId} không có email người nhận — bỏ qua email trạng thái.`);
          return;
        }

        await sendOrderStatusEmail(recipient, orderId, status, {
          carrier: carrier ?? null,
          trackingNumber: trackingNumber ?? null,
          estimatedDeliveryAt: estimatedDeliveryAt ?? null,
        });
      } else if (job.name === 'order-confirmation') {
        // M-17: email xác nhận có đầy đủ sản phẩm và số tiền.
        const { orderId } = job.data as OrderConfirmationJobData;
        await sendOrderConfirmation(orderId);
      } else if (job.name === 'order-shipped') {
        // M-18: email thứ hai, báo mã vận đơn khi hàng đã bàn giao cho hãng.
        const { orderId } = job.data as OrderShippedJobData;
        await sendShipmentNotification(orderId);
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

/** M-17: email xác nhận đơn — gửi cho cả thành viên lẫn khách vãng lai. */
export async function queueOrderConfirmationEmail(orderId: number): Promise<void> {
  await emailQueue.add('order-confirmation', { orderId });
}

/** M-18: email báo mã vận đơn, gửi khi admin tạo vận đơn. */
export async function queueShipmentEmail(orderId: number): Promise<void> {
  await emailQueue.add('order-shipped', { orderId });
}
