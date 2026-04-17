import 'dotenv/config';
import { createApp } from './app';
import { connectSequelize, disconnectSequelize } from './lib/sequelize';
import { connectRedis, disconnectRedis } from './lib/redis';

const port = Number(process.env.PORT ?? 3000);
const app = createApp();

async function start(): Promise<void> {
  await Promise.all([connectSequelize(), connectRedis()]);

  app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
  });
}

async function shutdown(signal: string): Promise<void> {
  console.log(`Received ${signal}, shutting down...`);

  await disconnectRedis();
  await disconnectSequelize();

  process.exit(0);
}

process.on('SIGINT', () => {
  void shutdown('SIGINT');
});

process.on('SIGTERM', () => {
  void shutdown('SIGTERM');
});

void start();
