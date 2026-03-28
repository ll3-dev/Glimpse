import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { KnowledgeItem } from '@glimpse/shared';
import { useCoreClient } from '../core-client-context';
import { queryKeys } from '../query-keys';

export function useMarkAsReviewedMutation() {
  const coreClient = useCoreClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ itemId, nextReviewAt }: { itemId: string; nextReviewAt: number }) => {
      const now = Date.now();
      return coreClient.updateKnowledgeItem(itemId, {
        lastReviewedAt: now,
        nextReviewAt,
        updatedAt: now,
      } as Partial<KnowledgeItem>);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.review.dueItems });
      qc.invalidateQueries({ queryKey: queryKeys.knowledgeItems.all });
    },
  });
}

export function usePostponeReviewMutation() {
  const coreClient = useCoreClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ itemId, nextReviewAt }: { itemId: string; nextReviewAt: number }) => {
      const now = Date.now();
      return coreClient.updateKnowledgeItem(itemId, {
        nextReviewAt,
        updatedAt: now,
      } as Partial<KnowledgeItem>);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.review.dueItems }),
  });
}
