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

/** Message of the error thrown when the native discovery module is absent —
 * lets callers distinguish "module missing" from "nothing found". */
export const discoveryUnavailableError =
  '이 기기에서는 Desktop 탐색을 사용할 수 없습니다.';

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
