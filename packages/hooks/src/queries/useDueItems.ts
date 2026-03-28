import { useQuery } from '@tanstack/react-query';
import type { KnowledgeItem } from '@glimpse/shared';
import { useCoreClient } from '../core-client-context';
import { queryKeys } from '../query-keys';

export function useDueItemsQuery(limit?: number) {
  const coreClient = useCoreClient();
  return useQuery({
    queryKey: queryKeys.review.dueItems,
    queryFn: () => coreClient.getDueKnowledgeItems({ now: Date.now(), limit }),
  });
}
