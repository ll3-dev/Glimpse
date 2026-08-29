import { discoveryUnavailableError } from './discovery-unavailable';

export type DiscoveredSyncDesktop = {
  name: string;
  host: string;
  port: number;
  deviceId: string | null;
  protocolVersion: number;
};

export { discoveryUnavailableError };

export function isSyncDiscoveryAvailable(): boolean {
  return false;
}

export async function discoverSyncDesktops(): Promise<DiscoveredSyncDesktop[]> {
  throw new Error(discoveryUnavailableError);
}
