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

/** Does an error message look like an HTTP 401 from fetchJson? */
export function isAuthErrorMessage(message: string): boolean {
  return /\(401\)/.test(message);
}
