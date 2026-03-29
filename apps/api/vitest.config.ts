import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@barber-go/shared': path.resolve(__dirname, '../../packages/shared/src'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 30000,
    hookTimeout: 30000,
    fileParallelism: false,
    env: {
      DATABASE_URL: 'postgresql://postgres:barbergo@localhost:5433/barbergo?schema=public',
      JWT_SECRET: 'barbergo-dev-secret-key',
      JWT_REFRESH_SECRET: 'barbergo-dev-refresh-secret-key',
      NODE_ENV: 'test',
    },
  },
});
