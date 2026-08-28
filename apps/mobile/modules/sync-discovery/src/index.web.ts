export type DiscoveredSyncDesktop = {
  name: string;
  host: string;
  port: number;
  deviceId: string | null;
  protocolVersion: number;
};

/** Message of the error thrown when the native discovery module is absent —
 * lets callers distinguish "module missing" from "nothing found". */
export const discoveryUnavailableError =
  '이 기기에서는 Desktop 탐색을 사용할 수 없습니다.';

export function isSyncDiscoveryAvailable(): boolean {
  return false;
}

export async function discoverSyncDesktops(): Promise<DiscoveredSyncDesktop[]> {
  throw new Error(discoveryUnavailableError);
}
