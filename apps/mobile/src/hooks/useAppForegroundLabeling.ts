import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { runForegroundLabeling } from '@/src/features/labeling';
import { queryKeys } from '@/src/lib/query-keys';

export function useAppForegroundLabeling() {
  const queryClient = useQueryClient();
  const isRunningRef = useRef(false);

  useEffect(() => {
    const run = () => {
      if (isRunningRef.current) {
        return undefined;
      }

      isRunningRef.current = true;
      let idleCallbackId: number | null = null;
      const timeoutId = setTimeout(() => {
        if (typeof globalThis.requestIdleCallback === 'function') {
          idleCallbackId = globalThis.requestIdleCallback(async () => {
            try {
              const result = await runForegroundLabeling(2);
              if (result.success && result.data.processedCount > 0) {
                queryClient.invalidateQueries({ queryKey: queryKeys.knowledgeItems.all });
              }
            } finally {
              isRunningRef.current = false;
            }
          });
          return;
        }

        void (async () => {
          try {
            const result = await runForegroundLabeling(2);
            if (result.success && result.data.processedCount > 0) {
              queryClient.invalidateQueries({ queryKey: queryKeys.knowledgeItems.all });
            }
          } finally {
            isRunningRef.current = false;
          }
        })();
      }, 750);

      return {
        cancel: () => {
          clearTimeout(timeoutId);
          if (idleCallbackId !== null && typeof globalThis.cancelIdleCallback === 'function') {
            globalThis.cancelIdleCallback(idleCallbackId);
          }
        },
      };
    };

    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        run();
      }
    });

    return () => {
      subscription.remove();
      isRunningRef.current = false;
    };
  }, [queryClient]);
}
