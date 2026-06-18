import { Queue, Worker, type Job } from 'bullmq';
import { redisConfig } from '@/config/redis';
import { sendVerificationEmail, sendPasswordResetEmail } from '@/lib/email';

export type EmailJobName = 'verify-email' | 'reset-password';

export interface VerifyEmailJobData {
  to: string;
  token: string;
}

export interface ResetPasswordJobData {
  to: string;
  token: string;
}

export type EmailJobData = VerifyEmailJobData | ResetPasswordJobData;

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
      const { to, token } = job.data as VerifyEmailJobData;
      if (job.name === 'verify-email') {
        await sendVerificationEmail(to, token);
      } else if (job.name === 'reset-password') {
        await sendPasswordResetEmail(to, token);
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
