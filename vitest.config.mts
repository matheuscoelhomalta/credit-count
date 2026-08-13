import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./', import.meta.url)),
    },
  },
  test: {
    // Playwright specs live in tests/e2e and are run by `npm run test:e2e`.
    exclude: ['**/node_modules/**', 'tests/e2e/**'],
  },
});
