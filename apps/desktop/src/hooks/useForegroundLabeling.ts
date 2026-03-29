import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useCoreClient, queryKeys } from '@glimpse/hooks';
import { createRunForegroundLabeling } from '@/features/labeling';

export function useForegroundLabeling() {
  const queryClient = useQueryClient();
  const coreClient = useCoreClient();
  const isRunningRef = useRef(false);

  useEffect(() => {
    if (isRunningRef.current) {
      return;
    }

    isRunningRef.current = true;

    const timeoutId = setTimeout(() => {
      const runLabeling = createRunForegroundLabeling({ coreClient });

      void runLabeling(2).then((result) => {
        if (result.success && result.data.processedCount > 0) {
          void queryClient.invalidateQueries({
            queryKey: queryKeys.knowledgeItems.all,
          });
        }
      }).finally(() => {
        isRunningRef.current = false;
      });
    }, 750);

    return () => {
      clearTimeout(timeoutId);
      isRunningRef.current = false;
    };
  }, [coreClient, queryClient]);
}
