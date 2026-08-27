import { defineConfig } from '@playwright/test';

/**
 * Browser smoke config: serves the production web bundle (vite preview) and
 * exercises the app shell in Chromium with the Tauri IPC stubbed out. Kept
 * deliberately minimal — one browser, one worker, no retries — so the gate
 * stays fast (~seconds) and deterministic.
 *
 * The `__TAURI_INTERNALS__` stub is injected per-test via addInitScript
 * (see smoke.spec.ts) so it lands before any app module runs.
 */
export default defineConfig({
  testDir: './e2e',
  // `.spec`/`.test` suffixes would make root `bun test` pick the file up as
  // a bun test and crash on Playwright's describe(); a bare name keeps the
  // bun suite clean while Playwright matches everything in testDir.
  testMatch: /e2e-smoke\.ts$/,
  timeout: 30_000,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: {
    browserName: 'chromium',
    // vite binds IPv6 loopback (::1) by default, so use the hostname —
    // a literal 127.0.0.1 would get connection-refused.
    baseURL: 'http://localhost:1420',
  },
  webServer: {
    command: 'bunx vite preview --port 1420 --strictPort',
    port: 1420,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
