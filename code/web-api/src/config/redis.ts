import dotenv from 'dotenv';

dotenv.config();

export const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD,
  db: Number(process.env.REDIS_DB) || 0,
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  enableReadyCheck: false,
  maxRetriesPerRequest: null,
  enableOfflineQueue: true,
};

export const redisConfigKeys = {
  DEFAULT_CACHE_TTL: 3600,
  CACHE_5_MINUTES: 300,
  CACHE_10_MINUTES: 600,
  CACHE_30_MINUTES: 1800,
  CACHE_1_HOUR: 3600,
}

export const cacheKey = {
  USER_INFO: 'user_info',
}

export default redisConfig;
