import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    testTimeout: 30000,
    hookTimeout: 30000,
    globalSetup: './src/__tests__/globalSetup.ts',
    fileParallelism: false,
    env: {
      DATABASE_URL: 'postgresql://postgres:barbergo@localhost:5433/barbergo_test?schema=public',
      JWT_SECRET: 'test-jwt-secret',
      JWT_REFRESH_SECRET: 'test-jwt-refresh-secret',
      NODE_ENV: 'test',
    },
  },
});
