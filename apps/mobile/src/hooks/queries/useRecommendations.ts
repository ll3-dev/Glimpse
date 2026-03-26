/**
 * useRecommendationsQuery Hook
 *
 * React Query hook for fetching pending recommendations.
 */

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import {
  getPendingRecommendations,
  type RecommendationWithItems,
} from '@/src/features/recommendation';
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
      const result = await getPendingRecommendations();
      if (result.success === false) {
        throw new Error(result.error.message);
      }
      return result.recommendations;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
