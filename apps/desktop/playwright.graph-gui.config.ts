import { defineConfig } from '@playwright/test';

/**
 * Phase C 그래프 GUI 검증 전용 설정.
 *
 * 본체 playwright.config.ts는 testMatch를 e2e-smoke.ts로 고정해 둔 상태라
 * 이 검증 파일을 따로 매칭한다. 웹서버·브라우저 정책은 본체와 동일하게 둔다.
 */
export default defineConfig({
  testDir: './e2e',
  testMatch: /graph-gui-verify\.ts$/,
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
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
