import { useEffect, useRef } from 'react';
import { AppState, InteractionManager } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { runForegroundLabeling } from '@/src/features/labeling';
import { queryKeys } from '@/src/lib/query-keys';

export function useAppForegroundLabeling() {
  const queryClient = useQueryClient();
  const isRunningRef = useRef(false);

  useEffect(() => {
    const run = () => {
      if (isRunningRef.current) {
        return;
      }

      isRunningRef.current = true;
      const task = InteractionManager.runAfterInteractions(async () => {
        try {
          const result = await runForegroundLabeling(2);
          if (result.success && result.data.processedCount > 0) {
            queryClient.invalidateQueries({ queryKey: queryKeys.knowledgeItems.all });
          }
        } finally {
          isRunningRef.current = false;
        }
      });

      return task;
    };

    const initialTask = AppState.currentState === 'active' ? run() : undefined;
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        run();
      }
    });

    return () => {
      initialTask?.cancel();
      subscription.remove();
      isRunningRef.current = false;
    };
  }, [queryClient]);
}
