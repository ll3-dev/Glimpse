import { Platform } from 'react-native';
import { syncDiscover } from '@glimpse/bridge-generated';
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
 * iOS routes discovery through the shared Rust `sync_discover` command
 * (dnssd backend, entitlement-free Bonjour). Before the JSI bridge is
 * installed the command rejects; the caller's catch path surfaces the raw
 * engine error, while a non-iOS platform throws the explicit unavailable
 * error instead. Mirrors the Android adapter (index.android.ts) on the
 * same bridge command; clamps both platforms to the same [500, 5000]
 * window.
 */
export function isSyncDiscoveryAvailable(): boolean {
  return Platform.OS === 'ios';
}

export async function discoverSyncDesktops(
  timeoutMs: number = 2_500,
): Promise<DiscoveredSyncDesktop[]> {
  if (Platform.OS !== 'ios') {
    throw new Error(discoveryUnavailableError);
  }
  const output = await syncDiscover({
    timeoutMs: Math.min(Math.max(timeoutMs, 500), 5_000),
  });
  // The Rust side already dedupes by deviceId and sorts; reshape to the
  // module's long-standing contract (deviceId nullable). i64 widens to
  // `number | bigint` on the TS side (rustra 0.5+); coerce at the seam.
  return output.peers.map((peer) => ({
    name: peer.name,
    host: peer.host,
    port: peer.port,
    deviceId: peer.deviceId === '' ? null : peer.deviceId,
    protocolVersion: Number(peer.protocolVersion),
  }));
}
