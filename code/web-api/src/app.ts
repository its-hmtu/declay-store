import express, { type Express, type Request, type Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { createAuthRouter } from './routes/auth.routes';
import { sequelize } from './lib/sequelize';
import { connectRedis, getRedisClient } from './lib/redis';
import { errorHandlerMiddleware } from './middlewares/error-handler.middleware';
import { notFoundMiddleware } from './middlewares/not-found.middleware';
import { sendSuccess } from './utils/response';

export function createApp(): Express {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(morgan('dev'));
  app.use('/auth', createAuthRouter());

  app.get('/health', async (_request: Request, response: Response) => {
    let postgres: 'up' | 'down' = 'up';
    let redis: 'up' | 'down' = 'up';

    try {
      await sequelize.query('SELECT 1');
    } catch {
      postgres = 'down';
    }

    try {
      await connectRedis();
      await getRedisClient().ping();
    } catch {
      redis = 'down';
    }

    sendSuccess(
      response,
      {
        status: postgres === 'up' && redis === 'up' ? 'ok' : 'degraded',
        services: { postgres, redis },
        timestamp: new Date().toISOString(),
      },
      'Health check completed',
    );
  });

  app.use(notFoundMiddleware);
  app.use(errorHandlerMiddleware);

  return app;
}
