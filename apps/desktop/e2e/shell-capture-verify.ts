import { expect, test } from '@playwright/test';
import { tauriStubInitScript } from './smoke-stubs';

const shellCaptureInitScript = `
  ${tauriStubInitScript}
  (() => {
    const state = { items: [], records: [], commits: [] };
    window.__glimpseShellCaptureState = state;
    const prevInvoke = window.__TAURI_INTERNALS__.invoke;
    window.__TAURI_INTERNALS__.invoke = async (cmd, args) => {
      if (cmd === 'rustra_dispatch') {
        const command = args && args.command ? String(args.command) : '';
        const input = args && args.args ? args.args : {};
        if (command === 'listKnowledgeItems') {
          return { items: structuredClone(state.items) };
        }
        if (command === 'saveKnowledgeItem') {
          state.items.push(structuredClone(input.item));
          return { item: structuredClone(input.item) };
        }
        if (command === 'listGraphAnalysisRecords') {
          return { records: structuredClone(state.records) };
        }
        if (command === 'listRecommendations') {
          return { recommendations: [] };
        }
        if (command === 'commitGraphAnalysis') {
          state.records = structuredClone(input.records ?? []);
          state.commits.push(structuredClone(input));
          return {
            savedRecommendations: (input.recommendations ?? []).length,
            savedAnalysisRecords: (input.records ?? []).length,
          };
        }
      }
      return prevInvoke(cmd, args);
    };
  })();
`;

test('shell 캡처 저장이 Living Graph 증분 분석으로 자동 반영된다', async ({ page }) => {
  await page.addInitScript(shellCaptureInitScript);
  const consoleErrors: string[] = [];
  page.on('pageerror', (error) => consoleErrors.push(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });

  await page.goto('/library');
  await expect(page.getByRole('heading', { name: '보관함' })).toBeVisible();

  await page.evaluate(() => {
    (window as any).__glimpseSmokeEmitEvent('glimpse://shell-navigate', 'capture');
  });
  await expect(page).toHaveURL(/\/capture$/);

  await page.locator('#capture-title').fill('셸 캡처 그래프 검증');
  await page.locator('#capture-note-body').fill('저장 직후 Living Graph가 자동 분석해야 합니다.');
  await page.getByRole('button', { name: '저장하기' }).click();

  await expect(page).toHaveURL(/\/library$/, { timeout: 5_000 });
  await expect(page.getByText('셸 캡처 그래프 검증')).toBeVisible();
  await expect.poll(
    () => page.evaluate(() => (window as any).__glimpseShellCaptureState.commits.length),
    { timeout: 6_000 },
  ).toBe(1);

  const firstCommit = (await page.evaluate(
    () => (window as any).__glimpseShellCaptureState.commits[0],
  ));
  expect(firstCommit.records).toHaveLength(1);
  expect(firstCommit.records[0]).toMatchObject({
    status: 'completed',
    edgeCount: 0,
    analyzerVersion: 'living-graph-v1',
  });

  await page.evaluate(() => {
    (window as any).__glimpseSmokeEmitEvent('glimpse://sync-complete', {});
  });
  await page.waitForTimeout(1_500);
  expect(await page.evaluate(
    () => (window as any).__glimpseShellCaptureState.commits.length,
  )).toBe(1);

  await page.evaluate(() => {
    (window as any).__glimpseSmokeEmitEvent('glimpse://shell-navigate', 'graph');
  });
  await expect(page).toHaveURL(/\/graph$/);
  await expect(page.getByText('지식 그래프', { exact: true }).first()).toBeVisible();

  expect(
    consoleErrors.filter((error) => !/smoke stub rejects|Failed to load resource/.test(error)),
  ).toEqual([]);
});
