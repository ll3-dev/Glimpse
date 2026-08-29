/**
 * Pure decision helpers for the adaptive sync schedule. Kept free of I/O and
 * React so the state machine is directly unit-testable; `useAutoSync` owns
 * the timers and subscribes these answers into its scheduling.
 */

/** Poll cadence right after any observed change (or app resume). */
export const BASE_POLL_MS = 60_000;
/** Idle saturation: quiet links stretch polls to this ceiling. */
export const MAX_POLL_MS = 5 * 60_000;
/** Local writes arm a sync attempt this long after the last one armed. */
export const CHANGE_DEBOUNCE_MS = 2_000;

/**
 * Next poll interval given whether the last poll observed a change.
 * `changed` resets to the base cadence (data is moving; stay responsive),
 * idle doubles geometrically so a parked pair of devices converges to the
 * 5-minute ceiling instead of hammering the desktop every minute.
 */
export function nextPollIntervalMs(currentMs: number, changed: boolean): number {
  if (changed) return BASE_POLL_MS;
  return Math.min(currentMs * 2, MAX_POLL_MS);
}

/**
 * Whether a local write should arm a debounced sync attempt. `lastArmedAt`
 * is when the previous attempt was scheduled (null = none pending); arming
 * again inside the debounce window would fire a sync per keystroke batch,
 * so only changes landing after the window re-arm.
 */
export function shouldAttemptAfterLocalChange(
  lastArmedAt: number | null,
  now: number,
  debounceMs: number = CHANGE_DEBOUNCE_MS,
): boolean {
  if (lastArmedAt == null) return true;
  return now - lastArmedAt >= debounceMs;
}
