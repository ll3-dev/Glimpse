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
  /**
   * Highest merge clock this device has pushed to the desktop. When set,
   * outbound syncs send `sinceWatermark` instead of a full snapshot; only
   * ever advanced from a server-issued `newWatermark`, reset on full-snapshot
   * fallback or unpair.
   */
  outboundWatermark: number | null;
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
  /**
   * Incremental payload (protocol v1, additive) on the watermark path:
   * rows newer than the requested watermark. Null on the full path.
   */
  delta: unknown | null;
  /**
   * Server-issued replacement for {@link SyncConfig.outboundWatermark};
   * only present on the delta path.
   */
  newWatermark: number | null;
  /** Null on the delta path: no desktop-side rewrite means no fresh print. */
  fingerprint: string | null;
  endpoints: {
    localPort: number;
    tailscaleUrl: string | null;
  };
};
