import { expect, test } from '@playwright/test';
import { tauriStubInitScript } from './smoke-stubs';

/**
 * App-shell smoke test: the production web bundle must mount, redirect
 * `/` → `/library`, render the navigation shell and empty-state copy, and
 * do it all without crashing into the ErrorBoundary.
 *
 * The Tauri IPC layer is stubbed (see smoke-stubs.ts) — this verifies the
 * frontend bundle integrity and shell wiring, not the Rust backend.
 */

/** Uncaught page errors that mean the app shell is broken. */
test.describe('desktop web smoke', () => {
  let pageErrors: Error[] = [];
  let consoleErrors: string[] = [];

  test.beforeEach(async ({ page }) => {
    pageErrors = [];
    consoleErrors = [];
    await page.addInitScript(tauriStubInitScript);
    page.on('pageerror', (error) => pageErrors.push(error));
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });
  });

  test('library shell renders after root redirect', async ({ page }) => {
    await page.goto('/');

    // Root route redirects to /library before anything renders.
    await expect(page).toHaveURL(/\/library$/);

    // Sidebar nav (buttons wired to navigate) + page header = shell mounted.
    for (const nav of ['Library', 'Chat', 'Review', 'Digest', 'Graph']) {
      await expect(page.getByRole('button', { name: nav })).toBeVisible();
    }
    await expect(page.getByRole('heading', { name: 'Library' })).toBeVisible();

    // Empty library (stubbed listKnowledgeItems → []), not a spinner.
    await expect(
      page.getByText(/0 items?/),
    ).toBeVisible();

    // Never land in the ErrorBoundary fallback.
    await expect(page.getByText(/something went wrong/i)).toHaveCount(0);
  });

  test('shell mounts without fatal errors or unexpected invoke failures', async ({
    page,
  }) => {
    await page.goto('/library');
    // Give foreground labeling / sync polling their timers a beat to fire
    // so post-mount invokes are exercised too.
    await page.waitForTimeout(1_500);

    await expect(page.getByRole('heading', { name: 'Library' })).toBeVisible();

    // Uncaught exceptions always fail; console errors must all be accounted
    // for by the stub-rejection allowlist below (features that legitimately
    // degrade when the fake backend says "no").
    const allowedConsoleErrorPatterns = [
      // Known-degradable paths under stubs: LLM/model manager and sync
      // endpoints reject with our own stub error text.
      /smoke stub rejects/,
      /Failed to load resource/,
    ];
    const unexpectedConsoleErrors = consoleErrors.filter(
      (text) => !allowedConsoleErrorPatterns.some((pattern) => pattern.test(text)),
    );
    expect(unexpectedConsoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });
});
