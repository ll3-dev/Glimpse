/**
 * useRecommendationsQuery Hook
 *
 * React Query hook for fetching pending recommendations.
 */

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import type { Recommendation } from '@glimpse/shared';
import {
  getPendingRecommendations,
  refreshRecommendations,
  type RecommendationWithItems,
} from '@/src/features/recommendation';
import { mobileCoreClient } from '@/src/features/core';
import { queryKeys } from '@/src/lib/query-keys';

/**
 * Hook to fetch pending recommendations with their associated items.
 *
 * @returns UseQueryResult containing RecommendationWithItems array
 *
 * @example
 * const { data: recommendations, isLoading } = useRecommendationsQuery();
 */
export function useRecommendationsQuery(): UseQueryResult<RecommendationWithItems[], Error> {
  return useQuery({
    queryKey: queryKeys.recommendations.pending,
    queryFn: async (): Promise<RecommendationWithItems[]> => {
      await refreshRecommendations();
      const result = await getPendingRecommendations();
      if (result.success === false) {
        throw new Error(result.error.message);
      }
      return result.recommendations;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * All recommendation edges (any status) — read-only consumers like the
 * library detail "연결된 노트" section. Edges are generated on desktop and
 * arrive via sync, so a long staleTime is fine.
 */
export function useAllRecommendationsQuery(): UseQueryResult<Recommendation[], Error> {
  return useQuery({
    // 주의: all 키는 무효화 프리픽스인 동시에 이 쿼리의 실제 키다. pending으로 좁히면 연결된 노트 섹션이 갱신되지 않는다.
    queryKey: queryKeys.recommendations.all,
    queryFn: () => mobileCoreClient.listRecommendations(),
    staleTime: 1000 * 60 * 5,
  });
}
