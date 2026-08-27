import { useCallback, useState } from 'react';
import {
  discoveryBaseUrl,
  discoverDesktops,
  pairWithDesktop,
  syncWithDesktop,
  unpairDesktop,
  updateSyncConfig,
  useSyncStore,
} from '@/src/features/sync';

export function useDesktopSyncSettings() {
  const config = useSyncStore((state) => state.config);
  const runtime = useSyncStore((state) => state.runtime);
  const [address, setAddress] = useState(config.tailscaleUrl ?? config.lanUrl ?? '');
  const [pairingCode, setPairingCode] = useState('');

  const discover = useCallback(async () => {
    const desktops = await discoverDesktops();
    if (desktops[0]) setAddress(discoveryBaseUrl(desktops[0]));
  }, []);

  const selectDesktop = useCallback((host: string) => setAddress(host), []);

  const pair = useCallback(async () => {
    await pairWithDesktop(address, pairingCode);
    setPairingCode('');
  }, [address, pairingCode]);

  const syncNow = useCallback(async () => {
    await syncWithDesktop({ force: true });
  }, []);

  const unpair = useCallback(async () => {
    await unpairDesktop();
    setAddress('');
    setPairingCode('');
  }, []);

  const setAutoSync = useCallback((autoSync: boolean) => {
    updateSyncConfig({ autoSync });
  }, []);

  return {
    config,
    runtime,
    address,
    pairingCode,
    setAddress,
    setPairingCode,
    discover,
    selectDesktop,
    pair,
    syncNow,
    unpair,
    setAutoSync,
  };
}
