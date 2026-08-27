import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import type { KnowledgeItem } from '@glimpse/shared';
import { runForegroundLabeling } from '@/src/features/labeling';
import { queryKeys } from '@/src/lib/query-keys';

/**
 * 라벨링이 갱신한 아이템만 리스트 캐시에 반영한다. 전체 무효화 대신
 * 부분 패치로 라이브러리 목록 refetch를 막는다.
 */
function patchLabeledItems(
  queryClient: ReturnType<typeof useQueryClient>,
  updated: KnowledgeItem[],
) {
  if (updated.length === 0) return;
  const byId = new Map(updated.map((item) => [item.id, item]));
  queryClient.setQueryData<KnowledgeItem[]>(
    queryKeys.knowledgeItems.all,
    (current) =>
      current?.map((entry) => byId.get(entry.id) ?? entry),
  );
}

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
              patchLabeledItems(queryClient, result.data.items);
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
            patchLabeledItems(queryClient, result.data.items);
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
