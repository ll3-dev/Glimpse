import { useQuery } from '@tanstack/react-query';
import type { KnowledgeItem } from '@glimpse/shared';
import { useCoreClient } from '../core-client-context';
import { queryKeys } from '../query-keys';

export function useKnowledgeItemsQuery() {
  const coreClient = useCoreClient();
  return useQuery({
    queryKey: queryKeys.knowledgeItems.all,
    queryFn: () => coreClient.listKnowledgeItems(),
  });
}
