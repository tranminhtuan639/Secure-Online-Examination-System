import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: 'postgresql://exam:exam@localhost:5432/exam',
      DIRECT_URL: 'postgresql://exam:exam@localhost:5432/exam',
      JWT_ACCESS_SECRET: 'test-access-secret-test-access-secret',
      JWT_REFRESH_SECRET: 'test-refresh-secret-test-refresh-secret',
      CORS_ORIGINS: 'http://localhost:5173',
      ENABLE_DOCS: 'true',
    },
  },
});
