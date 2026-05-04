import type { Request, Response, NextFunction } from 'express';
import { redisOperations } from '@/lib/redis';
import { httpError } from '@/utils/http-error';

export interface CacheOptions {
  ttl?: number; // Time to live in seconds (default: 1 hour)
  keyGenerator?: (req: Request) => string; // Custom key generator
}

const DEFAULT_CACHE_TTL = 3600; // 1 hour

/**
 * Cache middleware for caching response data
 * 
 * Usage:
 * router.get('/endpoint', cache({ ttl: 1800 }), handler);
 * 
 * Or with custom key generator:
 * router.get('/user-info', cache({
 *   keyGenerator: (req) => `user:${req.user?.userId}:info`
 * }), handler);
 */
export function cache(options: CacheOptions = {}) {
  const { ttl = DEFAULT_CACHE_TTL, keyGenerator } = options;

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Generate cache key
      const cacheKey = keyGenerator ? keyGenerator(req) : generateDefaultKey(req);

      // Try to get from cache
      const cachedData = await redisOperations.get(cacheKey);
      
      if (cachedData) {
        console.log(`[CACHE HIT] ${cacheKey}`);
        // Return cached data with X-Cache header
        return res.set('X-Cache', 'HIT').json(cachedData);
      }

      console.log(`[CACHE MISS] ${cacheKey}`);

      // Store original json method
      const originalJson = res.json.bind(res);

      // Override json method to cache response before sending
      res.json = function (data: any) {
        // Only cache successful responses (2xx status codes)
        if (res.statusCode >= 200 && res.statusCode < 300) {
          // Cache the response data
          redisOperations
            .set(cacheKey, data, ttl)
            .catch((err) => console.error(`[CACHE ERROR] Failed to cache ${cacheKey}:`, err));
        }

        // Add cache header indicating this is a fresh response
        res.set('X-Cache', 'MISS');
        
        // Call original json method
        return originalJson(data);
      };

      next();
    } catch (error) {
      console.error('[CACHE MIDDLEWARE ERROR]', error);
      // Don't block request on cache error
      next();
    }
  };
}

/**
 * Generate default cache key from request
 * Format: {method}:{path}:{userId}
 */
function generateDefaultKey(req: Request): string {
  const method = req.method.toUpperCase();
  const path = req.path;
  const userId = req.user ? (req.user as any).userId || (req.user as any).id : 'guest';

  if (!userId) {
    throw httpError(401, 'User ID is required for caching');
  }

  return `cache:${method}:${path}:${userId}`;
}

/**
 * Invalidate cache by key pattern
 * 
 * Usage:
 * await invalidateCache('user:*:info'); // Invalidate all user info caches
 */
export async function invalidateCache(keyPattern: string): Promise<void> {
  try {
    const redis = require('@/lib/redis').getRedisClient();
    const keys = await redis.keys(keyPattern);
    
    if (keys.length > 0) {
      await redisOperations.deleteMany(keys);
      console.log(`[CACHE INVALIDATED] Deleted ${keys.length} keys matching ${keyPattern}`);
    }
  } catch (error) {
    console.error('[CACHE INVALIDATION ERROR]', error);
  }
}

/**
 * Invalidate single cache key
 */
export async function invalidateCacheKey(cacheKey: string): Promise<void> {
  try {
    await redisOperations.delete(cacheKey);
    console.log(`[CACHE INVALIDATED] ${cacheKey}`);
  } catch (error) {
    console.error('[CACHE KEY INVALIDATION ERROR]', error);
  }
}
