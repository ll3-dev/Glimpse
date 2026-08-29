import { useQuery } from '@tanstack/react-query';
import type { KnowledgeItem } from '@glimpse/shared';
import { sortDueItemsByEdgePriority } from '@glimpse/features';
import { useCoreClient } from '../core-client-context';
import { queryKeys } from '../query-keys';

/**
 * The deck shows one card at a time, so the default bounds the fetch —
 * without it the query streams the whole due set (everything with
 * next_review_at in the past or never scheduled) over IPC and re-fetches
 * it after every reviewed/forgotten/postponed action. The key includes the
 * limit so callers with an explicit limit read their own cache slot.
 */
const DEFAULT_DUE_ITEMS_LIMIT = 20;

export function useDueItemsQuery(limit?: number) {
  const coreClient = useCoreClient();
  const effectiveLimit = limit ?? DEFAULT_DUE_ITEMS_LIMIT;
  return useQuery({
    queryKey: [...queryKeys.review.dueItems, { limit: effectiveLimit }] as const,
    queryFn: async (): Promise<KnowledgeItem[]> => {
      const items = await coreClient.getDueKnowledgeItems({
        now: Date.now(),
        limit: effectiveLimit,
      });

      // SQL `ORDER BY next_review_at ASC` 결과 위의 연결도 후정렬.
      // 같은 시각(ms) 버킷 안에서만 순서가 바뀌므로 시간순 의미는 보존된다.
      // dismissed/ignored 엣지는 부여 대상에서 제외(그래프 뷰와 동일한 기준).
      try {
        const allEdges = await coreClient.listRecommendations();
        const activeEdges = allEdges.filter(
          (edge) => edge.status === 'pending' || edge.status === 'accepted',
        );
        return sortDueItemsByEdgePriority(items, activeEdges);
      } catch {
        // 엣지 로드 실패 시 무음 폴백 — 기존 SQL 정렬 순서를 그대로 사용.
        return items;
      }
    },
  });
}
