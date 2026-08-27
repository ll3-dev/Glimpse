/**
 * Exponential backoff for automatic desktop sync. Pure logic: the caller
 * owns time via `now` so tests never sleep.
 */

const BASE_BACKOFF_MS = 60_000;
export const MAX_BACKOFF_MS = 30 * 60_000;

export interface BackoffController {
  /** Consecutive failures so far (reset to 0 on success). */
  readonly failures: number;
  /** True once an auth rejection made retrying pointless until re-pairing. */
  readonly invalidated: boolean;
  /** Timestamp (ms) until which auto-sync should hold off. */
  readonly holdUntil: number;
}

export function createBackoffController(): BackoffController {
  return { failures: 0, invalidated: false, holdUntil: 0 };
}

export function backoffDurationMs(failures: number): number {
  // First failure waits one base interval; each additional failure doubles it.
  return Math.min(BASE_BACKOFF_MS * 2 ** Math.max(failures - 1, 0), MAX_BACKOFF_MS);
}

export function recordSuccess(state: BackoffController): BackoffController {
  return { ...state, failures: 0, holdUntil: 0 };
}

/** `authRejected` freezes the controller until an explicit reset (re-pairing). */
export function recordFailure(
  state: BackoffController,
  now: number,
  authRejected = false,
): BackoffController {
  if (authRejected || state.invalidated) {
    return { ...state, invalidated: true };
  }
  const failures = state.failures + 1;
  return { ...state, failures, holdUntil: now + backoffDurationMs(failures) };
}

/** Manual (user-triggered) syncs ignore backoff; auto syncs respect it. */
export function isHoldingOff(state: BackoffController, now: number, options: { force?: boolean } = {}): boolean {
  if (options.force) return false;
  if (state.invalidated) return true;
  return state.failures > 0 && now < state.holdUntil;
}
