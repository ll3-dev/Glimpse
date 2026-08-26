/**
 * Pure URL/endpoint helpers for desktop sync — no React Native imports so
 * these stay unit-testable under bun alone.
 */

import type { DiscoveredSyncDesktop } from '../../../modules/sync-discovery/src';
import type { SyncConfig } from './types';

export function normalizeBaseUrl(value: string): string {
  const trimmed = value.trim().replace(/\/+$/, '');
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export function discoveryBaseUrl(desktop: DiscoveredSyncDesktop): string {
  const host = desktop.host.includes(':') && !desktop.host.startsWith('[')
    ? `[${desktop.host}]`
    : desktop.host;
  return `http://${host}:${desktop.port}`;
}

export function endpointCandidates(
  config: Pick<SyncConfig, 'tailscaleUrl' | 'lanUrl'> = { tailscaleUrl: null, lanUrl: null },
): string[] {
  // The tailnet endpoint remains valid across network changes, while a cached
  // LAN address commonly becomes stale as soon as the phone leaves Wi-Fi.
  return [...new Set([config.tailscaleUrl, config.lanUrl].filter(Boolean))] as string[];
}

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
