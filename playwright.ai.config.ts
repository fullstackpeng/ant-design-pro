import { defineConfig } from '@playwright/test';
import base from './playwright.config';

export default defineConfig({
  ...base,
  testMatch: 'ai.spec.ts',
  use: { ...base.use, baseURL: 'http://127.0.0.1:8017' },
  webServer: {
    command: 'npx max preview --port 8017',
    url: 'http://127.0.0.1:8017',
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
