export {
  ensureSyncBackgroundTaskRegistered,
  SYNC_BACKGROUND_TASK,
} from './background-task';
export {
  discoverDesktops,
  pairWithDesktop,
  syncWithDesktop,
  unpairDesktop,
} from './sync-client';
export {
  getSyncConfig,
  resetSyncConfig,
  setSyncRuntime,
  updateSyncConfig,
  useSyncStore,
} from './sync-store';
export {
  discoveryBaseUrl,
  endpointCandidates,
  HttpError,
  isAuthError,
  normalizeBaseUrl,
} from './sync-url';
export type { SyncConfig, SyncRuntimeState, SyncRuntimeStatus } from './types';
export type { DiscoveredSyncDesktop } from '../../../modules/sync-discovery/src';
