import { discoveryUnavailableError } from './discovery-unavailable';

export type DiscoveredSyncDesktop = {
  name: string;
  host: string;
  port: number;
  deviceId: string | null;
  protocolVersion: number;
};

export { discoveryUnavailableError };

/**
 * Fallback entry point for resolvers without platform-extension support
 * (bun tests, tsc). Discovery is unavailable in those contexts. Metro
 * resolves device builds to index.ios.ts / index.android.ts instead — both
 * route through the shared Rust `sync_discover` bridge command. The Swift
 * native module binding this file used to carry is gone.
 *
 * The signatures mirror the platform adapters so every entry point of the
 * module keeps one contract (`discoverSyncDesktops` takes an optional
 * timeout — callers like sync-client pass one).
 */
export function isSyncDiscoveryAvailable(): boolean {
  return false;
}

export async function discoverSyncDesktops(
  timeoutMs: number = 2_500,
): Promise<DiscoveredSyncDesktop[]> {
  // `timeoutMs` is accepted for contract parity with the platform adapters;
  // without a native runtime there is nothing to discover on any resolver
  // that lands here.
  void timeoutMs;
  throw new Error(discoveryUnavailableError);
}
