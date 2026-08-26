import type { DiscoveredSyncDesktop } from '../../../modules/sync-discovery/src';

export type SyncConfig = {
  autoSync: boolean;
  desktopDeviceId: string | null;
  desktopDeviceName: string | null;
  lanUrl: string | null;
  tailscaleUrl: string | null;
  lastSyncedAt: number | null;
};

export type SyncRuntimeStatus =
  | 'idle'
  | 'discovering'
  | 'pairing'
  | 'syncing'
  | 'synced'
  | 'error';

export type SyncRuntimeState = {
  status: SyncRuntimeStatus;
  error: string | null;
  discovered: DiscoveredSyncDesktop[];
};

export type PairResponse = {
  protocolVersion: number;
  desktopDeviceId: string;
  desktopDeviceName: string;
  token: string;
  endpoints: {
    localPort: number;
    tailscaleUrl: string | null;
  };
};

export type SyncResponse = {
  protocolVersion: number;
  snapshot: unknown;
  endpoints: {
    localPort: number;
    tailscaleUrl: string | null;
  };
  graphQueued: boolean;
};
