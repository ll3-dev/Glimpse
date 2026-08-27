export type DiscoveredSyncDesktop = {
  name: string;
  host: string;
  port: number;
  deviceId: string | null;
  protocolVersion: number;
};

export function isSyncDiscoveryAvailable(): boolean {
  return false;
}

export async function discoverSyncDesktops(): Promise<DiscoveredSyncDesktop[]> {
  return [];
}
