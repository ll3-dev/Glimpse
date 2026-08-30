/**
 * Scriptable `@glimpse/bridge-generated` stub for sync tests and the
 * headless E2E script. Under bun there is no rustra JSI surface, so the
 * sync_plan commands (packages/bridge-rust/src/sync_plan.rs) are mirrored
 * here as pure functions — the SAME defaults the Rust unit tests pin:
 * exponential backoff capped at 30 min, auth-rejection freeze, tailnet-first
 * endpoint order, https-defaulting URL normalization, IPv6 bracketing.
 *
 * Suites script outputs by pushing into `syncBridgeCanned`; a canned `Error`
 * makes the command reject (bridge-unavailable paths). Every call's argument
 * is recorded in `syncBridgeCalls` for delegation assertions.
 */
import { mock } from 'bun:test';
import type { BackoffState } from '@glimpse/bridge-generated/types';

const BASE_BACKOFF_MS = 60_000;
const MAX_BACKOFF_MS = 30 * 60_000;

export const syncBridgeCalls = {
  normalizeBaseUrl: [] as { value: string }[],
  discoveryBaseUrl: [] as { host: string; port: number }[],
  endpointCandidates: [] as { tailscaleUrl: string | null; lanUrl: string | null }[],
  recordSyncFailure: [] as { state: BackoffState; now: number; authRejected?: boolean }[],
  recordSyncSuccess: [] as { state: BackoffState }[],
  isHoldingOff: [] as { state: BackoffState; now: number; force?: boolean }[],
};

export const syncBridgeCanned = {
  normalizeBaseUrl: [] as ({ url: string } | Error)[],
  discoveryBaseUrl: [] as ({ url: string } | Error)[],
  endpointCandidates: [] as ({ endpoints: string[] } | Error)[],
  recordSyncFailure: [] as ({ state: BackoffState } | Error)[],
  recordSyncSuccess: [] as ({ state: BackoffState } | Error)[],
  isHoldingOff: [] as ({ holdingOff: boolean } | Error)[],
};

/** Clear recorded calls (and canned outputs unless preserved). */
export function resetSyncBridgeMock(options: { preserveCanned?: boolean } = {}): void {
  for (const key of Object.keys(syncBridgeCalls)) {
    (syncBridgeCalls as Record<string, unknown[]>)[key].length = 0;
  }
  if (!options.preserveCanned) {
    for (const key of Object.keys(syncBridgeCanned)) {
      (syncBridgeCanned as Record<string, unknown[]>)[key].length = 0;
    }
  }
}

function next<T>(queue: (T | Error)[]): T {
  const next_ = queue.shift();
  if (next_ instanceof Error) throw next_;
  return next_ as T;
}

/** Install the mock. Must run before sync-client is first imported. */
export function installSyncBridgeMock(): void {
  mock.module('@glimpse/bridge-generated', () => ({
    normalizeBaseUrl: async (input: { value: string }) => {
      syncBridgeCalls.normalizeBaseUrl.push(input);
      if (syncBridgeCanned.normalizeBaseUrl.length > 0) {
        return next(syncBridgeCanned.normalizeBaseUrl);
      }
      const trimmed = input.value.trim().replace(/\/+$/, '');
      const url = !trimmed
        ? ''
        : /^https?:\/\//i.test(trimmed)
          ? trimmed
          : `https://${trimmed}`;
      return { url };
    },
    discoveryBaseUrl: async (input: { host: string; port: number }) => {
      syncBridgeCalls.discoveryBaseUrl.push(input);
      if (syncBridgeCanned.discoveryBaseUrl.length > 0) {
        return next(syncBridgeCanned.discoveryBaseUrl);
      }
      const host = input.host.includes(':') && !input.host.startsWith('[')
        ? `[${input.host}]`
        : input.host;
      return { url: `http://${host}:${input.port}` };
    },
    endpointCandidates: async (input: {
      tailscaleUrl?: string | null;
      lanUrl?: string | null;
    }) => {
      syncBridgeCalls.endpointCandidates.push({
        tailscaleUrl: input.tailscaleUrl ?? null,
        lanUrl: input.lanUrl ?? null,
      });
      if (syncBridgeCanned.endpointCandidates.length > 0) {
        return next(syncBridgeCanned.endpointCandidates);
      }
      return {
        endpoints: [...new Set([input.tailscaleUrl, input.lanUrl].filter(Boolean))] as string[],
      };
    },
    recordSyncFailure: async (input: {
      state: BackoffState;
      now: number;
      authRejected?: boolean;
    }) => {
      syncBridgeCalls.recordSyncFailure.push(input);
      if (syncBridgeCanned.recordSyncFailure.length > 0) {
        return next(syncBridgeCanned.recordSyncFailure);
      }
      if (input.authRejected || input.state.invalidated) {
        return { state: { ...input.state, invalidated: true } };
      }
      // Bridge i64 fields widen to `number | bigint` in generated types;
      // arithmetic coerces via Number() to keep the mock type-accurate.
      const failures = Number(input.state.failures) + 1;
      const holdUntil =
        input.now +
        Math.min(BASE_BACKOFF_MS * 2 ** Math.max(failures - 1, 0), MAX_BACKOFF_MS);
      return { state: { ...input.state, failures, holdUntil } };
    },
    recordSyncSuccess: async (input: { state: BackoffState }) => {
      syncBridgeCalls.recordSyncSuccess.push(input);
      if (syncBridgeCanned.recordSyncSuccess.length > 0) {
        return next(syncBridgeCanned.recordSyncSuccess);
      }
      return { state: { failures: 0, invalidated: input.state.invalidated, holdUntil: 0 } };
    },
    isHoldingOff: async (input: { state: BackoffState; now: number; force?: boolean }) => {
      syncBridgeCalls.isHoldingOff.push(input);
      if (syncBridgeCanned.isHoldingOff.length > 0) {
        return next(syncBridgeCanned.isHoldingOff);
      }
      const holdingOff = input.force
        ? false
        : input.state.invalidated ||
          (input.state.failures > 0 && input.now < input.state.holdUntil);
      return { holdingOff };
    },
  }));
}
