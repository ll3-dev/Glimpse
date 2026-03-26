/**
 * useKnowledgeItemsQuery Hook
 *
 * React Query hook for fetching all knowledge items.
 */

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { getAllKnowledgeItems } from '@/src/features/library';
import type { KnowledgeItem } from '@glimpse/shared';
import { queryKeys } from '@/src/lib/query-keys';

/**
 * Hook to fetch all knowledge items from the library.
 *
 * @returns UseQueryResult containing KnowledgeItem array
 *
 * @example
 * const { data: items, isLoading, error } = useKnowledgeItemsQuery();
 */
export function useKnowledgeItemsQuery(): UseQueryResult<KnowledgeItem[], Error> {
  return useQuery({
    queryKey: queryKeys.knowledgeItems.all,
    queryFn: async (): Promise<KnowledgeItem[]> => {
      const result = await getAllKnowledgeItems();
      if (result.success === false) {
        throw result.error;
      }
      return result.items;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
