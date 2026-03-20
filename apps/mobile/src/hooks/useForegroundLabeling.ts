import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import type { KnowledgeItem } from '@glimpse/shared';
import { runForegroundLabeling } from '@/src/features/labeling';
import { queryKeys } from '@/src/lib/query-keys';

export function useForegroundLabeling(items: KnowledgeItem[] | undefined) {
  const queryClient = useQueryClient();
  const isRunningRef = useRef(false);

  useEffect(() => {
    if (!items || items.length === 0 || isRunningRef.current) {
      return;
    }

    if (AppState.currentState !== 'active') {
      return;
    }

    const pendingCount = items.filter((item) => item.labelStatus === 'pending').length;
    if (pendingCount === 0) {
      return;
    }

    isRunningRef.current = true;
    let idleCallbackId: number | null = null;
    const timeoutId = setTimeout(() => {
      if (typeof globalThis.requestIdleCallback === 'function') {
        idleCallbackId = globalThis.requestIdleCallback(async () => {
          try {
            const result = await runForegroundLabeling(1);
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
          const result = await runForegroundLabeling(1);
          if (result.success && result.data.processedCount > 0) {
            queryClient.invalidateQueries({ queryKey: queryKeys.knowledgeItems.all });
          }
        } finally {
          isRunningRef.current = false;
        }
      })();
    }, 750);

    return () => {
      clearTimeout(timeoutId);
      if (idleCallbackId !== null && typeof globalThis.cancelIdleCallback === 'function') {
        globalThis.cancelIdleCallback(idleCallbackId);
      }
      isRunningRef.current = false;
    };
  }, [items, queryClient]);
}
