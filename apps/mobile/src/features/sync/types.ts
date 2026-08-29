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
   * Highest merge clock this device has confirmed with the desktop. When set,
   * outbound syncs send `sinceWatermark` instead of a full snapshot; only
   * ever advanced from a server-issued `newWatermark`, reset on full-snapshot
   * fallback or unpair. Every FULL_SYNC_EVERY_MS the client skips the
   * watermark and uploads a full snapshot anyway — the periodic reconciliation
   * that carries mobile-side edits upstream (the delta request cannot) and
   * reseals any clock-skew gap.
   */
  outboundWatermark: number | null;
  /**
   * Highest local merge clock the desktop has confirmed merging from this
   * device (upstream delta ack). Advanced ONLY from a successful server
   * response (`upstreamAck`) — never optimistically — so a failed transfer
   * re-sends the same rows next attempt, which LWW merging absorbs
   * idempotently. Null until the first successful sync establishes a
   * baseline; the delta export then starts from 0 (full history), which the
   * desktop's LWW merge deduplicates.
   */
  lastAckedUpstreamClock: number | null;
};

export type SyncRuntimeStatus =
  | 'idle'
  | 'discovering'
  | 'pairing'
  | 'syncing'
  | 'synced'
  | 'error'
  /** The native discovery module is absent on this device (e.g. Expo Go). */
  | 'unavailable';

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
   * Server-issued replacement for {@link SyncConfig.outboundWatermark}.
   * Set on the delta path (freshest merge clock sent) and, since
   * watermark-aware desktops, on the full path too (dataset's highest clock)
   * so the client can adopt the incremental path.
   */
  newWatermark: number | null;
  /**
   * Highest merge clock the server confirmed merging from this request's
   * upstream delta (`upstreamDelta`). The client advances
   * `lastAckedUpstreamClock` only from this value; null (legacy desktop)
   * keeps the cursor frozen and the periodic full snapshot remains the
   * upstream carrier.
   */
  upstreamAck: number | null;
  /** Null on the delta path: no desktop-side rewrite means no fresh print. */
  fingerprint: string | null;
  endpoints: {
    localPort: number;
    tailscaleUrl: string | null;
  };
};
