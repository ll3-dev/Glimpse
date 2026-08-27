import { requireOptionalNativeModule } from 'expo-modules-core';

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

export function isSyncDiscoveryAvailable(): boolean {
  return nativeModule !== null;
}

export async function discoverSyncDesktops(
  timeoutMs: number = 2_500,
): Promise<DiscoveredSyncDesktop[]> {
  if (!nativeModule) {
    return [];
  }
  return nativeModule.discover(Math.min(Math.max(timeoutMs, 500), 10_000));
}
