/**
 * useCaptureActions Hook
 *
 * React Query mutation hooks for capture/knowledge item actions.
 */

import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { saveKnowledgeItem, type KnowledgeItemInput } from '@/src/features/capture';
import type { KnowledgeItem } from '@glimpse/shared';
import { queryKeys } from '@/src/lib/query-keys';

/**
 * Hook to save a knowledge item.
 * Automatically invalidates the knowledge items query on success.
 *
 * @returns UseMutationResult for saving knowledge items
 *
 * @example
 * const { mutate: save, isPending } = useSaveKnowledgeItemMutation();
 * save({ type: 'note', body: 'Hello world' });
 */
export function useSaveKnowledgeItemMutation(): UseMutationResult<
  KnowledgeItem,
  Error,
  KnowledgeItemInput
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: KnowledgeItemInput): Promise<KnowledgeItem> => {
      const result = await saveKnowledgeItem(input);
      if (result.success === false) {
        throw new Error(result.error.message);
      }
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.knowledgeItems.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.recommendations.pending });
    },
  });
}

/**
 * Combined hook that provides capture actions.
 *
 * @returns Object with save mutation and convenience methods
 *
 * @example
 * const { save, isPending } = useCaptureActionsMutation();
 * save({ type: 'note', body: 'Hello world' });
 */
export function useCaptureActionsMutation() {
  const saveMutation = useSaveKnowledgeItemMutation();

  return {
    save: saveMutation.mutate,
    saveAsync: saveMutation.mutateAsync,
    isPending: saveMutation.isPending,
    saveMutation,
  };
}
