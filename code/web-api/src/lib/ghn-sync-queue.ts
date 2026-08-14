import { Queue, Worker, type Job } from 'bullmq';
import { redisConfig } from '@/config/redis';
import config from '@/config/env';
import OrderShipmentService from '@/modules/order-shipment/order-shipment.service';

/**
 * M-27: đồng bộ trạng thái vận đơn GHN tự động.
 *
 * Webhook (M-24) là kênh CHÍNH nhưng không đáng tin tuyệt đối: server free-tier
 * ngủ, URL chưa đăng ký, hoặc GHN bỏ lỡ retry. Job này là LƯỚI AN TOÀN — cứ mỗi
 * `syncIntervalMs` nó quét các vận đơn GHN đang giao dở và chủ động kéo trạng
 * thái mới nhất (Order Info, chỉ đọc, không tốn cước), áp bằng đúng luật
 * forward-only của webhook. Nút "Đồng bộ từ GHN" (M-26) là phiên bản thủ công
 * của chính việc này.
 *
 * Một job LẶP duy nhất (job scheduler) thay vì tự re-enqueue: BullMQ giữ lịch
 * trong Redis nên restart không mất nhịp, và scheduler id cố định nên deploy lại
 * không nhân đôi lịch.
 */

const QUEUE_NAME = 'ghn-sync';
const SCHEDULER_ID = 'ghn-sync-poll';
const JOB_NAME = 'poll';

const connection = {
  host: redisConfig.host,
  port: redisConfig.port,
  password: redisConfig.password,
  db: redisConfig.db,
};

export const ghnSyncQueue = new Queue(QUEUE_NAME, {
  connection,
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: 'exponential', delay: 10000 },
    removeOnComplete: { count: 50 },
    removeOnFail: { count: 50 },
  },
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let ghnSyncWorker: Worker<any, any, any> | null = null;

/**
 * Bật job lặp. Gọi một lần lúc khởi động. Không làm gì nếu cờ tắt hoặc đang mock
 * — tránh dựng worker vô ích và tránh đánh dấu nhầm đơn ở môi trường dev.
 */
export async function startGhnSyncWorker(): Promise<void> {
  if (!config.ghn.syncEnabled) {
    console.log('⏭️  GHN auto-sync disabled (GHN_SYNC_ENABLED=false hoặc chưa có GHN_TOKEN)');
    return;
  }

  const worker = new Worker(
    QUEUE_NAME,
    async (_job: Job) => {
      // Khởi tạo service trong handler: nếu là mock, chính service tự bỏ qua.
      await new OrderShipmentService().syncActiveGhnShipments(config.ghn.syncBatchSize);
    },
    { connection, concurrency: 1 },
  );

  worker.on('failed', (job, err) => {
    console.error(`❌ GHN sync job ${job?.id} failed:`, err.message);
  });

  ghnSyncWorker = worker;

  // Lịch lặp: id cố định nên gọi lại lúc restart chỉ CẬP NHẬT lịch, không nhân đôi.
  await ghnSyncQueue.upsertJobScheduler(
    SCHEDULER_ID,
    { every: config.ghn.syncIntervalMs },
    { name: JOB_NAME },
  );

  console.log(`✅ GHN auto-sync started (mỗi ${Math.round(config.ghn.syncIntervalMs / 1000)}s)`);
}

export async function closeGhnSyncWorker(): Promise<void> {
  if (ghnSyncWorker) {
    await ghnSyncWorker.close();
    ghnSyncWorker = null;
    console.log('✅ GHN sync worker closed');
  }
}
