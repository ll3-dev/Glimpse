/**
 * Exponential backoff shared by desktop and mobile retry loops. Pure logic:
 * the caller owns time via `now`/`failedAt` so tests never sleep.
 */

const BASE_BACKOFF_MS = 60_000;
export const MAX_BACKOFF_MS = 30 * 60_000;

/**
 * First failure waits one base interval; each additional failure doubles it,
 * clamped at {@link MAX_BACKOFF_MS}.
 */
export function backoffDurationMs(failures: number): number {
  return Math.min(BASE_BACKOFF_MS * 2 ** Math.max(failures - 1, 0), MAX_BACKOFF_MS);
}

/** Earliest retry time for the failure with the given ordinal (>= failedAt itself). */
export function backoffRetryAfterMs(consecutiveFailures: number, failedAt: number): number {
  return failedAt + backoffDurationMs(consecutiveFailures);
}
