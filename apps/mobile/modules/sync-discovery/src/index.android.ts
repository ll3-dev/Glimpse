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
 * Android routes discovery through the shared Rust `sync_discover` command
 * (Rust → JNI → NsdManager, plan B2-4). The command needs the JSI bridge
 * installed; until then `invoke` rejects, which the caller surfaces as the
 * explicit unavailable state (same contract as a missing native module).
 */
export function isSyncDiscoveryAvailable(): boolean {
  return Platform.OS === 'android';
}

export async function discoverSyncDesktops(
  timeoutMs: number = 2_500,
): Promise<DiscoveredSyncDesktop[]> {
  if (Platform.OS !== 'android') {
    throw new Error(discoveryUnavailableError);
  }
  const output = await syncDiscover({
    timeoutMs: Math.min(Math.max(timeoutMs, 500), 5_000),
  });
  // The Rust side already dedupes by deviceId and sorts; reshape to the
  // module's long-standing contract (deviceId nullable).
  return output.peers.map((peer) => ({
    name: peer.name,
    host: peer.host,
    port: peer.port,
    deviceId: peer.deviceId === '' ? null : peer.deviceId,
    protocolVersion: peer.protocolVersion,
  }));
}
