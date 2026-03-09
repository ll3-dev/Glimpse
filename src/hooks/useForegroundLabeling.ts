import { useEffect, useRef } from 'react';
import { AppState, InteractionManager } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import type { KnowledgeItem } from '@/src/db';
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
    const task = InteractionManager.runAfterInteractions(async () => {
      try {
        const result = await runForegroundLabeling(1);
        if (result.success && result.data.processedCount > 0) {
          queryClient.invalidateQueries({ queryKey: queryKeys.knowledgeItems.all });
        }
      } finally {
        isRunningRef.current = false;
      }
    });

    return () => {
      task.cancel();
      isRunningRef.current = false;
    };
  }, [items, queryClient]);
}
