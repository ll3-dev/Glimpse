import { requireOptionalNativeModule } from 'expo-modules-core';
import { discoveryUnavailableError } from './discovery-unavailable';

export type DiscoveredSyncDesktop = {
  name: string;
  host: string;
  port: number;
  deviceId: string | null;
  protocolVersion: number;
};

type SyncDiscoveryNativeModule = {
  discover(timeoutMs: number): Promise<DiscoveredSyncDesktop[]>;
};

const nativeModule = requireOptionalNativeModule<SyncDiscoveryNativeModule>(
  'GlimpseSyncDiscovery',
);

export { discoveryUnavailableError };

export function isSyncDiscoveryAvailable(): boolean {
  return nativeModule !== null;
}

export async function discoverSyncDesktops(
  timeoutMs: number = 2_500,
): Promise<DiscoveredSyncDesktop[]> {
  if (!nativeModule) {
    // An absent module is a different situation from "no desktops found":
    // surface it explicitly so the UI can say so instead of showing 0 results.
    throw new Error(discoveryUnavailableError);
  }
  return nativeModule.discover(Math.min(Math.max(timeoutMs, 500), 10_000));
}
