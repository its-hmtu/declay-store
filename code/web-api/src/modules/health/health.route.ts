import { Router, type Request, type Response } from 'express';
import { sequelize } from '@/config/sequelize';
import { getRedisClient } from '@/lib/redis';

// Public liveness/readiness probe: GET /api/health
export function createHealthRouter(): Router {
  const router = Router();

  router.get('/', async (_req: Request, res: Response) => {
    const started = Date.now();
    const checks: Record<string, 'up' | 'down'> = {};
    let ok = true;

    try {
      await sequelize.authenticate();
      checks.database = 'up';
    } catch {
      checks.database = 'down';
      ok = false;
    }

    try {
      const pong = await getRedisClient().ping();
      checks.redis = pong === 'PONG' ? 'up' : 'down';
      if (checks.redis === 'down') ok = false;
    } catch {
      checks.redis = 'down';
      ok = false;
    }

    res.status(ok ? 200 : 503).json({
      status: ok ? 'ok' : 'degraded',
      checks,
      uptimeSeconds: Math.round(process.uptime()),
      responseTimeMs: Date.now() - started,
      timestamp: new Date().toISOString(),
    });
  });

  return router;
}
