import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  testMatch: /shell-capture-verify\.ts$/,
  timeout: 30_000,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: {
    browserName: 'chromium',
    baseURL: 'http://localhost:1420',
  },
  webServer: {
    command: 'bunx vite preview --port 1420 --strictPort',
    port: 1420,
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
