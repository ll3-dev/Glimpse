import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { getSyncConfig, syncWithDesktop } from '@/src/features/sync';
import { logger } from '@/src/utils/logger';

export function useAutoSync(): void {
  const queryClient = useQueryClient();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let mounted = true;

    const schedule = () => {
      if (!getSyncConfig().desktopDeviceId || !getSyncConfig().autoSync) return;
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        void syncWithDesktop()
          .then((changed) => {
            if (mounted && changed) return queryClient.invalidateQueries();
          })
          .catch((error) =>
            logger.warn('Automatic desktop sync failed', {
              error: error instanceof Error ? error.message : String(error),
            }),
          );
      }, 1_000);
    };

    schedule();
    const interval = setInterval(schedule, 60_000);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') schedule();
    });
    return () => {
      mounted = false;
      subscription.remove();
      clearInterval(interval);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [queryClient]);
}
