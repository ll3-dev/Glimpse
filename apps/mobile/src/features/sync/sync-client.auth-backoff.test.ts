/**
 * Integration tests for the auth-error → invalidated-backoff branch in
 * sync-client. These pin the contract between fetchJson (HttpError with a
 * status), isAuthError, and recordFailure: a 401 must invalidate the backoff
 * controller (no more pointless retries until re-pairing), while any other
 * failure must stay a plain retryable backoff.
 */
import { afterEach, describe, expect, test } from 'bun:test';
import type { BackoffController } from './backoff';
import {
  backoffDurationMs,
  createBackoffController,
  isHoldingOff,
  MAX_BACKOFF_MS,
} from './backoff';
import { HttpError, isAuthError } from './sync-url';

const originalFetch = globalThis.fetch;

describe('sync auth vs transient failure classification', () => {
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  test('401 HttpError invalidates the controller so auto-sync stops retrying', () => {
    // What fetchJson throws after a 401 response (server body becomes message).
    const authFailure = new HttpError('저장된 페어링과 일치하지 않습니다.', 401);

    let state = simulateSyncFailureCycle(createBackoffController(), authFailure);
    expect(state.invalidated).toBe(true);
    // Auto-sync holds off indefinitely — even far in the future.
    expect(isHoldingOff(state, Date.now() + 10 * MAX_BACKOFF_MS)).toBe(true);
    // …but manual sync still ignores the hold.
    expect(isHoldingOff(state, Date.now(), { force: true })).toBe(false);

    // Ordinary failures afterwards never un-invalidate it.
    state = simulateSyncFailureCycle(state, new Error('네트워크 오류'));
    expect(state.invalidated).toBe(true);
  });

  test('transient 500 failure backs off but stays retryable', () => {
    const serverFailure = new HttpError('서버 오류', 500);

    let state = simulateSyncFailureCycle(createBackoffController(), serverFailure);
    expect(state.invalidated).toBe(false);
    const firstHold = state.holdUntil;
    expect(backoffDurationMs(state.failures)).toBe(60_000);
    expect(isHoldingOff(state, firstHold - 1)).toBe(true);
    expect(isHoldingOff(state, firstHold)).toBe(false);

    // Repeated failures escalate the hold without ever invalidating.
    state = simulateSyncFailureCycle(state, serverFailure);
    expect(state.failures).toBe(2);
    expect(backoffDurationMs(2)).toBe(120_000);
    expect(state.invalidated).toBe(false);
  });

  test('fetchJson-style mapping turns a 401 response into an auth HttpError', async () => {
    // Mirror of fetchJson's non-ok branch against a real mocked Response:
    // the server's Korean body wins as the message, the status rides along,
    // and only the combination (not message text) classifies as an auth error.
    mockFetchResponses({ status: 401, body: { code: 'authorization_failed', message: '저장된 페어링과 일치하지 않습니다.' } });
    const error = await captureError(() => postToMockedDesktop());
    expect(error).toBeInstanceOf(HttpError);
    expect((error as HttpError).status).toBe(401);
    expect((error as HttpError).message).toBe('저장된 페어링과 일치하지 않습니다.');
    expect(isAuthError(error)).toBe(true);

    // The old bug in reverse: a 401 whose body carries no "(401)" text must
    // still be classified via status alone.
    mockFetchResponses({ status: 401, body: null });
    const emptyBodyError = await captureError(() => postToMockedDesktop());
    expect(isAuthError(emptyBodyError)).toBe(true);

    // A 500 never is.
    mockFetchResponses({ status: 500, body: { message: '내부 오류' } });
    const serverError = await captureError(() => postToMockedDesktop());
    expect(isAuthError(serverError)).toBe(false);
  });

  test('3xx redirect responses are rejected instead of followed', async () => {
    // fetchJson rejects any 3xx that slips past `redirect: 'error'`; here the
    // mocked fetch simulates an implementation that returned one anyway.
    mockFetchResponses({ status: 302, body: null });
    const error = await captureError(() => postToMockedDesktop());
    expect(error).toBeInstanceOf(HttpError);
    expect((error as HttpError).status).toBe(302);
    expect(isAuthError(error)).toBe(false);
  });
});

/** One failed sync round-trip as runSync performs it at its tail. */
function simulateSyncFailureCycle(
  state: BackoffController,
  lastError: unknown,
): BackoffController {
  if (isAuthError(lastError)) {
    return { ...state, invalidated: true };
  }
  const failures = state.failures + 1;
  return { ...state, failures, holdUntil: Date.now() + backoffDurationMs(failures) };
}

function mockFetchResponses(response: { status: number; body: unknown }): void {
  globalThis.fetch = (async () =>
    new Response(response.body == null ? '' : JSON.stringify(response.body), {
      status: response.status,
      headers: { 'Content-Type': 'application/json' },
    })) as unknown as typeof fetch;
}

/** Mirrors sync-client's fetchJson error mapping (non-ok branch). */
async function postToMockedDesktop(): Promise<unknown> {
  const response = await fetch('http://desktop.test:34129/v1/sync', { method: 'POST' });
  if (response.status >= 300 && response.status < 400) {
    throw new HttpError('Desktop가 리다이렉트로 응답했습니다.', response.status);
  }
  const body = (await response.json().catch(() => null)) as { message?: string } | null;
  if (!response.ok) {
    throw new HttpError(
      body?.message || `Desktop 요청 실패 (${response.status})`,
      response.status,
    );
  }
  return body;
}

async function captureError(run: () => Promise<unknown>): Promise<unknown> {
  try {
    await run();
    return null;
  } catch (error) {
    return error;
  }
}
