/**
 * useDueItemsQuery Hook
 *
 * React Query hook for fetching knowledge items due for review.
 */

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { getDueItems, type KnowledgeItem, type GetDueItemsOptions } from '@/src/features/review';
import { queryKeys } from '@/src/lib/query-keys';

interface DueItemsData {
  items: KnowledgeItem[];
  count: number;
}

/**
 * Hook to fetch knowledge items that are due for review.
 *
 * @param options - Query options including limit
 * @returns UseQueryResult containing due items data
 *
 * @example
 * const { data, isLoading } = useDueItemsQuery({ limit: 10 });
 * // data.items contains KnowledgeItem[]
 * // data.count contains the count
 */
export function useDueItemsQuery(options?: GetDueItemsOptions): UseQueryResult<DueItemsData, Error> {
  return useQuery({
    queryKey: queryKeys.review.dueItemsList(options),
    queryFn: async (): Promise<DueItemsData> => {
      const result = await getDueItems(options);
      if (result.success === false) {
        throw new Error(result.error.message);
      }

      return {
        items: result.items,
        count: result.items.length,
      };
    },
    staleTime: 1000 * 30, // 30 seconds - review items change frequently
  });
}
