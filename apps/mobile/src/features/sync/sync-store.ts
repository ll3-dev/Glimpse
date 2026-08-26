import { useStore } from 'zustand';
import { createStore } from 'zustand/vanilla';
import { storage, StorageKeys } from '@/src/lib/storage';
import type { SyncConfig, SyncRuntimeState, SyncRuntimeStatus } from './types';
import type { DiscoveredSyncDesktop } from '../../../modules/sync-discovery/src';

const DEFAULT_CONFIG: SyncConfig = {
  autoSync: true,
  desktopDeviceId: null,
  desktopDeviceName: null,
  lanUrl: null,
  tailscaleUrl: null,
  lastSyncedAt: null,
};

type SyncStore = {
  config: SyncConfig;
  runtime: SyncRuntimeState;
};

function loadConfig(): SyncConfig {
  const raw = storage.getString(StorageKeys.SYNC_CONFIG);
  if (!raw) return DEFAULT_CONFIG;
  try {
    const parsed = JSON.parse(raw) as Partial<SyncConfig>;
    return { ...DEFAULT_CONFIG, ...parsed };
  } catch {
    return DEFAULT_CONFIG;
  }
}

const syncStore = createStore<SyncStore>(() => ({
  config: loadConfig(),
  runtime: { status: 'idle', error: null, discovered: [] },
}));

function persist(config: SyncConfig): void {
  storage.set(StorageKeys.SYNC_CONFIG, JSON.stringify(config));
}

export function getSyncConfig(): SyncConfig {
  return syncStore.getState().config;
}

export function updateSyncConfig(patch: Partial<SyncConfig>): SyncConfig {
  const config = { ...syncStore.getState().config, ...patch };
  persist(config);
  syncStore.setState({ config });
  return config;
}

export function resetSyncConfig(): void {
  storage.remove(StorageKeys.SYNC_CONFIG);
  syncStore.setState({
    config: DEFAULT_CONFIG,
    runtime: { status: 'idle', error: null, discovered: [] },
  });
}

export function setSyncRuntime(status: SyncRuntimeStatus, error: string | null = null): void {
  syncStore.setState((state) => ({
    runtime: { ...state.runtime, status, error },
  }));
}

export function setDiscoveredSyncDesktops(discovered: DiscoveredSyncDesktop[]): void {
  syncStore.setState((state) => ({
    runtime: { ...state.runtime, discovered },
  }));
}

export function useSyncStore<T>(selector: (state: SyncStore) => T): T {
  return useStore(syncStore, selector);
}
