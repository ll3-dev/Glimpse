/**
 * useKnowledgeItemsQuery Hook
 *
 * React Query hook for fetching all knowledge items.
 */

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { getAllKnowledgeItems } from '@/src/features/library';
import type { KnowledgeItem } from '@glimpse/shared';
import { queryKeys } from '@/src/lib/query-keys';
import { effectQueryFn } from '@/src/lib/effect-query';

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
    queryFn: effectQueryFn(getAllKnowledgeItems),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
