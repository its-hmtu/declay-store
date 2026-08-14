import { defineConfig } from 'vitest/config';
import path from 'node:path';

// Integration suite: needs a throwaway Postgres + Redis. Run with:
//   TEST_DATABASE_URL=... REDIS_HOST=... npm run test:integration
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/integration/**/*.integration.test.ts'],
    globals: true,
    hookTimeout: 30000,
    testTimeout: 30000,
  },
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
});
