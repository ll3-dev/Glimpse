import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { refreshRecommendations } from '@/src/features/recommendation';
import { queryKeys } from '@/src/lib/query-keys';
import { useTimeoutScheduler } from './useTimeoutScheduler';

export function useAppForegroundRecommendations(): void {
  const queryClient = useQueryClient();
  const isScheduledRef = useRef(false);
  const { schedule, cancel } = useTimeoutScheduler();

  useEffect(() => {
    let active = true;
    let idleCallbackId: number | null = null;

    const run = () => {
      if (isScheduledRef.current) {
        return;
      }
      isScheduledRef.current = true;

      const refresh = async () => {
        try {
          const result = await refreshRecommendations();
          if (active && result.success && result.createdCount > 0) {
            await queryClient.invalidateQueries({
              queryKey: queryKeys.recommendations.all,
            });
          }
        } finally {
          isScheduledRef.current = false;
        }
      };

      schedule(() => {
        if (typeof globalThis.requestIdleCallback === 'function') {
          idleCallbackId = globalThis.requestIdleCallback(() => void refresh());
        } else {
          void refresh();
        }
      }, 1_000);
    };

    run();
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        run();
      }
    });

    return () => {
      active = false;
      subscription.remove();
      cancel();
      if (idleCallbackId !== null && typeof globalThis.cancelIdleCallback === 'function') {
        globalThis.cancelIdleCallback(idleCallbackId);
      }
      isScheduledRef.current = false;
    };
  }, [cancel, queryClient, schedule]);
}
