/**
 * URL helper ownership tests. `normalizeBaseUrl` / `discoveryBaseUrl` /
 * `endpointCandidates` moved to the rustra bridge (`sync_plan.rs`, commandIds
 * 35-37); the authoritative behavior tests (trim/scheme defaulting, IPv6
 * bracketing, tailnet-first dedup) live in the Rust unit tests. What remains
 * to pin on the TS side is the pure HTTP error surface (`HttpError`,
 * `isAuthError`) and the mock harness's faithfulness to the Rust contract —
 * the mirror used by every sync test suite.
 */
import { describe, expect, test } from 'bun:test';
import type { BackoffState } from '@glimpse/bridge-generated/types';
import { HttpError, isAuthError } from './sync-url';
import {
  installSyncBridgeMock,
  resetSyncBridgeMock,
  syncBridgeCalls,
  syncBridgeCanned,
} from './sync-bridge-test-mock';

describe('sync http error surface', () => {
  test('isAuthError reads the response status off an HttpError, not message text', () => {
    expect(isAuthError(new HttpError('페어링 토큰이 필요합니다.', 401))).toBe(true);
    // A 401 whose server message happens to look like something else.
    expect(isAuthError(new HttpError('Desktop 요청 실패 (500)', 401))).toBe(true);
    expect(isAuthError(new HttpError('서버 오류', 500))).toBe(false);
    expect(isAuthError(new HttpError('요청 과다', 429))).toBe(false);
    // Plain errors and non-error values are never auth failures.
    expect(isAuthError(new Error('Desktop 요청 실패 (401)'))).toBe(false);
    expect(isAuthError(null)).toBe(false);
    expect(isAuthError(undefined)).toBe(false);
    expect(isAuthError('Desktop 요청 실패 (401)')).toBe(false);
    expect(isAuthError({ status: 401 })).toBe(false);
  });

  test('HttpError carries the HTTP status for callers that branch on it', () => {
    const error = new HttpError('토큰 만료', 403);
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('HttpError');
    expect(error.status).toBe(403);
    expect(error.message).toBe('토큰 만료');
  });
});

describe('sync bridge mock mirror of the Rust URL contract', () => {
  installSyncBridgeMock();

  test('normalizeBaseUrl mirror trims, strips trailing slashes, defaults to https', async () => {
    resetSyncBridgeMock();
    const bridge = await import('@glimpse/bridge-generated');
    expect((await bridge.normalizeBaseUrl({ value: '  desktop.local:34129/  ' })).url).toBe(
      'https://desktop.local:34129',
    );
    expect((await bridge.normalizeBaseUrl({ value: 'http://192.168.1.4:34129///' })).url).toBe(
      'http://192.168.1.4:34129',
    );
    expect((await bridge.normalizeBaseUrl({ value: 'https://x.ts.net' })).url).toBe(
      'https://x.ts.net',
    );
    expect((await bridge.normalizeBaseUrl({ value: '   ' })).url).toBe('');
  });

  test('discoveryBaseUrl mirror brackets bare IPv6 and uses plain http', async () => {
    resetSyncBridgeMock();
    const bridge = await import('@glimpse/bridge-generated');
    expect(
      (await bridge.discoveryBaseUrl({ host: '192.168.1.4', port: 34_129 })).url,
    ).toBe('http://192.168.1.4:34129');
    expect((await bridge.discoveryBaseUrl({ host: 'fe80::1', port: 34_129 })).url).toBe(
      'http://[fe80::1]:34129',
    );
    expect((await bridge.discoveryBaseUrl({ host: '[fe80::1]', port: 34_129 })).url).toBe(
      'http://[fe80::1]:34129',
    );
  });

  test('endpointCandidates mirror prefers tailnet and dedupes empties', async () => {
    resetSyncBridgeMock();
    const bridge = await import('@glimpse/bridge-generated');
    expect(
      (
        await bridge.endpointCandidates({
          tailscaleUrl: 'https://x.ts.net',
          lanUrl: 'http://1.2.3.4:1',
        })
      ).endpoints,
    ).toEqual(['https://x.ts.net', 'http://1.2.3.4:1']);
    expect(
      (await bridge.endpointCandidates({ tailscaleUrl: null, lanUrl: null })).endpoints,
    ).toEqual([]);
    expect(
      (
        await bridge.endpointCandidates({ tailscaleUrl: 'https://same', lanUrl: 'https://same' })
      ).endpoints,
    ).toEqual(['https://same']);
    // Every call was routed through the mocked command surface.
    expect(syncBridgeCalls.endpointCandidates).toHaveLength(3);
  });

  test('backoff mirror matches the Rust contract: exponential, capped, auth-frozen', async () => {
    resetSyncBridgeMock();
    const bridge = await import('@glimpse/bridge-generated');

    // Bridge i64 fields widen to `number | bigint`; Number() keeps the
    // mirror contract assertions type-exact.
    let state: BackoffState = { failures: 0, invalidated: false, holdUntil: 0 };
    state = (await bridge.recordSyncFailure({ state, now: 1_000 })).state;
    expect(Number(state.holdUntil)).toBe(1_000 + 60_000);

    state = (await bridge.recordSyncFailure({ state, now: Number(state.holdUntil) })).state;
    expect(Number(state.holdUntil)).toBe(1_000 + 60_000 + 120_000);

    // Twelve more failures stay capped at 30 minutes.
    for (let i = 0; i < 12; i += 1) {
      state = (await bridge.recordSyncFailure({ state, now: Number(state.holdUntil) })).state;
    }
    const capped = (await bridge.recordSyncFailure({ state, now: 0 })).state;
    expect(capped.holdUntil).toBeLessThanOrEqual(30 * 60_000);

    // Success resets failures and the hold, preserving invalidation=false.
    const reset = (await bridge.recordSyncSuccess({ state })).state;
    expect(reset.failures).toBe(0);
    expect(reset.holdUntil).toBe(0);

    // Auth rejection freezes: isHoldingOff holds far in the future unless forced.
    let frozen: BackoffState = { failures: 0, invalidated: false, holdUntil: 0 };
    frozen = (await bridge.recordSyncFailure({ state: frozen, now: 0, authRejected: true })).state;
    expect(frozen.invalidated).toBe(true);
    expect(
      (await bridge.isHoldingOff({ state: frozen, now: 10_000_000_000 })).holdingOff,
    ).toBe(true);
    expect(
      (await bridge.isHoldingOff({ state: frozen, now: 10_000_000_000, force: true })).holdingOff,
    ).toBe(false);

    // Canned errors let suites simulate a rejecting bridge.
    syncBridgeCanned.normalizeBaseUrl.push(new Error('bridge down'));
    await expect(bridge.normalizeBaseUrl({ value: 'x' })).rejects.toThrow('bridge down');
  });
});
