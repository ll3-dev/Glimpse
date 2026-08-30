import { useCallback, useState } from 'react';
import { discoveryBaseUrl } from '@glimpse/bridge-generated';
import {
  discoverDesktops,
  pairWithDesktop,
  syncWithDesktop,
  unpairDesktop,
  updateSyncConfig,
  useSyncStore,
} from '@/src/features/sync';

/**
 * Maps a discovered desktop to its plain-http base URL, resolved through the
 * rustra bridge (`discoveryBaseUrl`). Keyed by `host:port` so the (synchronous)
 * render path can look URLs up without duplicating the bridge's shaping
 * logic — the discovery list is tiny, so sequential awaits are fine.
 */
async function resolveDiscoveredUrls(
  desktops: { host: string; port: number; deviceId: string | null }[],
): Promise<Record<string, string>> {
  const urls: Record<string, string> = {};
  for (const desktop of desktops) {
    urls[`${desktop.host}:${desktop.port}`] = (
      await discoveryBaseUrl({ host: desktop.host, port: desktop.port })
    ).url;
  }
  return urls;
}

export function useDesktopSyncSettings() {
  const config = useSyncStore((state) => state.config);
  const runtime = useSyncStore((state) => state.runtime);
  const [address, setAddress] = useState(config.tailscaleUrl ?? config.lanUrl ?? '');
  const [pairingCode, setPairingCode] = useState('');
  const [discoveredUrls, setDiscoveredUrls] = useState<Record<string, string>>({});

  const discover = useCallback(async () => {
    const desktops = await discoverDesktops();
    const urls = await resolveDiscoveredUrls(desktops);
    setDiscoveredUrls(urls);
    const first = desktops[0];
    if (first) setAddress(urls[`${first.host}:${first.port}`] ?? '');
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
    discoveredUrls,
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
