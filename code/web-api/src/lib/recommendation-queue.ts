import { Queue, Worker, type Job } from 'bullmq';
import { redisConfig } from '@/config/redis';
import RecommendationService from '@/modules/recommendation/recommendation.service';

/**
 * M-35: dựng lại bảng "mua chung" (co-occurrence) từ đơn hàng định kỳ (P-Q5a:
 * mặc định 24h). Một job LẶP (job scheduler) — giữ lịch trong Redis, id cố định
 * nên restart/deploy không nhân đôi.
 */
const QUEUE_NAME = 'recommendation';
const SCHEDULER_ID = 'reco-cooccurrence';
const INTERVAL_MS = Number(process.env.RECO_REBUILD_INTERVAL_MS) || 24 * 60 * 60 * 1000;

const connection = {
  host: redisConfig.host,
  port: redisConfig.port,
  password: redisConfig.password,
  db: redisConfig.db,
};

export const recommendationQueue = new Queue(QUEUE_NAME, {
  connection,
  defaultJobOptions: { attempts: 2, backoff: { type: 'exponential', delay: 10000 }, removeOnComplete: { count: 10 }, removeOnFail: { count: 20 } },
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let worker: Worker<any, any, any> | null = null;

export async function startRecommendationWorker(): Promise<void> {
  worker = new Worker(
    QUEUE_NAME,
    async (_job: Job) => { await new RecommendationService().rebuildCooccurrence(); },
    { connection, concurrency: 1 },
  );
  worker.on('failed', (job, err) => console.error(`❌ Recommendation job ${job?.id} failed:`, err.message));

  await recommendationQueue.upsertJobScheduler(SCHEDULER_ID, { every: INTERVAL_MS }, { name: 'rebuild' });
  console.log(`✅ Recommendation co-occurrence job started (mỗi ${Math.round(INTERVAL_MS / 3600000)}h)`);
}

export async function closeRecommendationWorker(): Promise<void> {
  if (worker) {
    await worker.close();
    worker = null;
    console.log('✅ Recommendation worker closed');
  }
}
