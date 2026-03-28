import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { KnowledgeItem } from '@glimpse/shared';
import { useCoreClient } from '../core-client-context';
import { queryKeys } from '../query-keys';

export function useSaveKnowledgeItemMutation() {
  const coreClient = useCoreClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (item: KnowledgeItem) => coreClient.saveKnowledgeItem(item),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.knowledgeItems.all });
      qc.invalidateQueries({ queryKey: queryKeys.recommendations.pending });
    },
  });
}

export function useUpdateKnowledgeItemMutation() {
  const coreClient = useCoreClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, patch }: { itemId: string; patch: Partial<KnowledgeItem> }) =>
      coreClient.updateKnowledgeItem(itemId, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.knowledgeItems.all }),
  });
}
