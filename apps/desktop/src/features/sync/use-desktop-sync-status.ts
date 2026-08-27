import { useCallback, useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';

export interface DesktopSyncStatus {
  protocolVersion: number;
  deviceId: string;
  deviceName: string;
  port: number;
  pairingCode: string;
  pairingCodeExpiresInSeconds: number;
  pairedClients: Array<{
    deviceId: string;
    deviceName: string;
    pairedAt: number;
    lastSeenAt: number | null;
  }>;
  tailscale: {
    installed: boolean;
    connected: boolean;
    serveEnabled: boolean;
    dnsName: string | null;
    url: string | null;
    error: string | null;
  };
  startupError: string | null;
}

export function useDesktopSyncStatus() {
  const [status, setStatus] = useState<DesktopSyncStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setStatus(await invoke<DesktopSyncStatus>('get_sync_status'));
      setError(null);
    } catch (cause) {
      setError(String(cause));
    }
  }, []);

  useEffect(() => {
    // Initial fetch rides the same async callback path as the interval ticks
    // so setState only ever happens after an await, not synchronously here.
    const initial = window.setTimeout(() => void refresh(), 0);
    // Pause polling while the window is hidden — the settings panel can't be
    // read then, and every tick still costs an IPC round trip.
    let interval: number | null = null;
    const startInterval = () => {
      interval = window.setInterval(() => void refresh(), 10_000);
    };
    const stopInterval = () => {
      if (interval !== null) {
        window.clearInterval(interval);
        interval = null;
      }
    };
    const onVisibility = () => {
      if (document.hidden) {
        stopInterval();
      } else {
        void refresh();
        startInterval();
      }
    };
    if (!document.hidden) startInterval();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.clearTimeout(initial);
      stopInterval();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [refresh]);

  const runCommand = useCallback(async (command: string, args?: Record<string, unknown>) => {
    setBusy(true);
    setError(null);
    try {
      setStatus(await invoke<DesktopSyncStatus>(command, args));
    } catch (cause) {
      setError(String(cause));
    } finally {
      setBusy(false);
    }
  }, []);

  return {
    status,
    error,
    busy,
    refresh,
    rotateCode: () => runCommand('rotate_pairing_code'),
    enableTailscale: () => runCommand('enable_tailscale_sync'),
    forgetClient: (deviceId: string) => runCommand('forget_paired_client', { deviceId }),
  };
}
