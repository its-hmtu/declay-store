import 'dotenv/config';
import { createApp } from './app';
import { initializeDatabase, disconnectDatabase } from './config/database';
import { connectRedis, disconnectRedis } from './lib/redis';

const port = Number(process.env.PORT ?? 3000);
const app = createApp();

async function start(): Promise<void> {
  try {
    await Promise.all([
      initializeDatabase(),
      connectRedis(),
    ]);

    app.listen(port, '0.0.0.0', () => {
      console.log(`✅ Server running on http://localhost:${port}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    await shutdown('startup_error', error, 1);
  }
}

async function shutdown(signal: string, error?: unknown, exitCode?: number): Promise<void> {
  console.log(`Received ${signal}, shutting down...`);
  await Promise.all([
    disconnectDatabase(),
    disconnectRedis(),
  ]);
  process.exit(exitCode || 0);
}

process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  void shutdown('uncaughtException', error, 1);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason);
  void shutdown('unhandledRejection', reason, 1);
});

process.on('SIGINT', () => {
  void shutdown('SIGINT');
});

process.on('SIGTERM', () => {
  void shutdown('SIGTERM');
});

void start();

