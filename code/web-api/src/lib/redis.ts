import Redis from 'ioredis';
import { redisConfig } from '@/config/redis';

let redisClient: Redis | null = null;

/**
 * Get or create Redis client
 */
export function getRedisClient(): Redis {
  if (!redisClient) {
    redisClient = new Redis(redisConfig);

    redisClient.on('connect', () => {
      console.log('✅ Redis connected');
    });

    redisClient.on('error', (error) => {
      console.error('❌ Redis error:', error);
    });

    redisClient.on('close', () => {
      console.log('⚠️ Redis connection closed');
    });

    redisClient.on('reconnecting', () => {
      console.log('🔄 Redis reconnecting...');
    });
  }

  return redisClient;
}

/**
 * Connect to Redis
 */
export async function connectRedis(): Promise<void> {
  try {
    const client = getRedisClient();
    await client.ping();
    console.log('✅ Redis connection verified');
  } catch (error) {
    console.error('❌ Failed to connect to Redis:', error);
    throw error;
  }
}

/**
 * Disconnect from Redis
 */
export async function disconnectRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.disconnect();
    redisClient = null;
    console.log('✅ Redis disconnected');
  }
}

/**
 * Redis operations helper functions
 */
export const redisOperations = {
  /**
   * Set a key with optional expiration (in seconds)
   */
  async set(key: string, value: string | number | object, expirationSeconds?: number): Promise<void> {
    const client = getRedisClient();
    const serializedValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
    
    if (expirationSeconds) {
      await client.setex(key, expirationSeconds, serializedValue);
    } else {
      await client.set(key, serializedValue);
    }
  },

  /**
   * Get a key value
   */
  async get(key: string): Promise<any> {
    const client = getRedisClient();
    const value = await client.get(key);
    
    if (!value) return null;
    
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  },

  /**
   * Delete a key
   */
  async delete(key: string): Promise<void> {
    const client = getRedisClient();
    await client.del(key);
  },

  /**
   * Delete multiple keys
   */
  async deleteMany(keys: string[]): Promise<void> {
    const client = getRedisClient();
    if (keys.length > 0) {
      await client.del(...keys);
    }
  },

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    const client = getRedisClient();
    const result = await client.exists(key);
    return result === 1;
  },

  /**
   * Increment a key value
   */
  async increment(key: string): Promise<number> {
    const client = getRedisClient();
    return await client.incr(key);
  },

  /**
   * Add to a set
   */
  async addToSet(key: string, ...values: string[]): Promise<void> {
    const client = getRedisClient();
    await client.sadd(key, ...values);
  },

  /**
   * Get all members of a set
   */
  async getSetMembers(key: string): Promise<string[]> {
    const client = getRedisClient();
    return await client.smembers(key);
  },

  /**
   * Remove from set
   */
  async removeFromSet(key: string, ...values: string[]): Promise<void> {
    const client = getRedisClient();
    await client.srem(key, ...values);
  },

  /**
   * Push to a list
   */
  async pushToList(key: string, ...values: string[]): Promise<void> {
    const client = getRedisClient();
    await client.rpush(key, ...values);
  },

  /**
   * Get all elements from a list
   */
  async getList(key: string): Promise<string[]> {
    const client = getRedisClient();
    return await client.lrange(key, 0, -1);
  },

  /**
   * Clear all data in Redis (use with caution!)
   */
  async flushAll(): Promise<void> {
    const client = getRedisClient();
    await client.flushall();
    console.log('⚠️ Redis flushed');
  },
};

export default getRedisClient;
