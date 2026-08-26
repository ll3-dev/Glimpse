import type { DiscoveredSyncDesktop } from '../../../modules/sync-discovery/src';

export type SyncConfig = {
  autoSync: boolean;
  desktopDeviceId: string | null;
  desktopDeviceName: string | null;
  lanUrl: string | null;
  tailscaleUrl: string | null;
  lastSyncedAt: number | null;
  /** Content fingerprint of the last snapshot the desktop confirmed equal. */
  snapshotFingerprint: string | null;
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
  /** Null when the desktop saw identical content and skipped the merge. */
  snapshot: unknown | null;
  fingerprint: string;
  endpoints: {
    localPort: number;
    tailscaleUrl: string | null;
  };
};
