import { Queue, Worker, type Job } from 'bullmq';
import { redisConfig } from '@/config/redis';
import ReturnService from '@/modules/order/return.service';

/**
 * M-29 (P12/BR-R8): tự đóng yêu cầu trả hàng treo ở `awaiting_return` quá 14
 * ngày. Một job LẶP (job scheduler) chạy mỗi 24h, không phụ thuộc webhook. Giữ
 * lịch trong Redis nên restart không mất nhịp, scheduler id cố định nên deploy
 * lại không nhân đôi.
 */

const QUEUE_NAME = 'return-expiry';
const SCHEDULER_ID = 'return-expiry-sweep';
const INTERVAL_MS = Number(process.env.RETURN_EXPIRY_INTERVAL_MS) || 24 * 60 * 60 * 1000;
const WINDOW_DAYS = Number(process.env.RETURN_EXPIRY_DAYS) || 14;

const connection = {
  host: redisConfig.host,
  port: redisConfig.port,
  password: redisConfig.password,
  db: redisConfig.db,
};

export const returnExpiryQueue = new Queue(QUEUE_NAME, {
  connection,
  defaultJobOptions: { attempts: 2, backoff: { type: 'exponential', delay: 10000 }, removeOnComplete: { count: 20 }, removeOnFail: { count: 20 } },
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let worker: Worker<any, any, any> | null = null;

export async function startReturnExpiryWorker(): Promise<void> {
  worker = new Worker(
    QUEUE_NAME,
    async (_job: Job) => { await new ReturnService().expireStaleReturns(WINDOW_DAYS); },
    { connection, concurrency: 1 },
  );
  worker.on('failed', (job, err) => console.error(`❌ Return-expiry job ${job?.id} failed:`, err.message));

  await returnExpiryQueue.upsertJobScheduler(SCHEDULER_ID, { every: INTERVAL_MS }, { name: 'sweep' });
  console.log(`✅ Return-expiry sweep started (mỗi ${Math.round(INTERVAL_MS / 3600000)}h, cửa sổ ${WINDOW_DAYS} ngày)`);
}

export async function closeReturnExpiryWorker(): Promise<void> {
  if (worker) {
    await worker.close();
    worker = null;
    console.log('✅ Return-expiry worker closed');
  }
}
