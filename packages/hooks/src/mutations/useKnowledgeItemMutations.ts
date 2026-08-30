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
      // 저장이 새 엣지를 만들 수 있으므로 pending뿐 아니라 그래프·연결 노트 쿼리까지 갱신.
      qc.invalidateQueries({ queryKey: queryKeys.recommendations.all });
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
