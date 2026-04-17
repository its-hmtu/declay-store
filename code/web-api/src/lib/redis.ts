import { createClient, type RedisClientType } from 'redis';

let redisClient: RedisClientType | null = null;

export function getRedisClient(): RedisClientType {
  if (!redisClient) {
    const redisUrl = process.env.REDIS_URL;

    redisClient = redisUrl
      ? createClient({ url: redisUrl })
      : createClient({
          socket: {
            host: process.env.REDIS_HOST ?? '127.0.0.1',
            port: Number(process.env.REDIS_PORT ?? 6379),
          },
          password: process.env.REDIS_PASSWORD || undefined,
        });

    redisClient.on('error', (error: Error) => {
      console.error('Redis error:', error.message);
    });
  }

  return redisClient;
}

export async function connectRedis(): Promise<void> {
  const client = getRedisClient();

  if (!client.isOpen) {
    await client.connect().then(() => {
      console.log(`Connected to Redis database with URL: ${process.env.REDIS_URL ?? `${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`}`);
    });
  }
}

export async function disconnectRedis(): Promise<void> {
  if (redisClient?.isOpen) {
    await redisClient.quit().then(() => {
      console.log('Disconnected from Redis database');
    });
  }
}
