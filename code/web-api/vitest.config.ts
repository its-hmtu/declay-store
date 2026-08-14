import { defineConfig } from 'vitest/config';
import path from 'node:path';

// Default suite: fast unit tests, no DB/Redis required.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.ts'],
    globals: true,
  },
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
});
