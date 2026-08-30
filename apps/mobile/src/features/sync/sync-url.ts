/**
 * HTTP error type + auth classification for desktop sync. Pure logic, still
 * unit-testable under bun alone.
 *
 * URL/endpoint helpers (normalizeBaseUrl, discoveryBaseUrl,
 * endpointCandidates) and the backoff controller moved to the rustra bridge
 * (`packages/bridge-rust/src/sync_plan.rs`) — consume them from
 * `@glimpse/bridge-generated`. Keeping a TS fallback here would let the two
 * implementations drift, so there is deliberately none.
 */

/**
 * An HTTP-level failure from the desktop sync API. Carries the response
 * status so callers can branch on semantics (401 → re-pairing needed) instead
 * of parsing human-readable message text, which is locale-dependent and
 * frequently replaced by the server's body anyway.
 */
export class HttpError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
  }
}

/** Was this rejection an HTTP 401 from the desktop (pairing token invalid)? */
export function isAuthError(error: unknown): boolean {
  return error instanceof HttpError && error.status === 401;
}
