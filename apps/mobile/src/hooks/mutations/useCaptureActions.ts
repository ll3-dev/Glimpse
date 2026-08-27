/**
 * useCaptureActions Hook
 *
 * React Query mutation hooks for capture/knowledge item actions.
 */

import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { saveKnowledgeItem, type KnowledgeItemInput } from '@/src/features/capture';
import { mobileCoreClient } from '@/src/features/core';
import type { KnowledgeItem } from '@glimpse/shared';
import { queryKeys } from '@/src/lib/query-keys';

/**
 * 라이브러리 리스트 쿼리를 전체 refetch 대신 로컬 패치로 갱신한다.
 * 리스트는 created_at DESC 정렬이므로 새 아이템은 맨 앞에, 수정은 제자리
 * 교체, 삭제는 제거로 각각 반영하면 refetch 결과와 동일하다.
 */
function patchKnowledgeItems(
  queryClient: ReturnType<typeof useQueryClient>,
  transform: (current: KnowledgeItem[]) => KnowledgeItem[],
) {
  queryClient.setQueryData<KnowledgeItem[]>(
    queryKeys.knowledgeItems.all,
    (current) => (current ? transform(current) : current),
  );
}

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
      return result.item;
    },
    onSuccess: (item) => {
      patchKnowledgeItems(queryClient, (current) => [item, ...current]);
      queryClient.invalidateQueries({ queryKey: queryKeys.recommendations.pending });
    },
  });
}

/**
 * Hook to update an existing knowledge item.
 */
export function useUpdateKnowledgeItemMutation(): UseMutationResult<
  KnowledgeItem,
  Error,
  { itemId: string; patch: Partial<Omit<KnowledgeItem, 'id' | 'createdAt'>> }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ itemId, patch }) => {
      return await mobileCoreClient.updateKnowledgeItem(itemId, patch);
    },
    onSuccess: (item) => {
      patchKnowledgeItems(queryClient, (current) =>
        current.map((entry) => (entry.id === item.id ? item : entry)),
      );
    },
  });
}

/**
 * Hook to delete a knowledge item.
 */
export function useDeleteKnowledgeItemMutation(): UseMutationResult<
  void,
  Error,
  { itemId: string }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ itemId }) => {
      await mobileCoreClient.deleteKnowledgeItem(itemId);
    },
    onSuccess: (_, { itemId }) => {
      patchKnowledgeItems(queryClient, (current) =>
        current.filter((entry) => entry.id !== itemId),
      );
      queryClient.invalidateQueries({ queryKey: queryKeys.recommendations.pending });
      queryClient.invalidateQueries({ queryKey: queryKeys.review.dueItems });
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
  const updateMutation = useUpdateKnowledgeItemMutation();
  const deleteMutation = useDeleteKnowledgeItemMutation();

  return {
    save: saveMutation.mutate,
    saveAsync: saveMutation.mutateAsync,
    update: updateMutation.mutate,
    updateAsync: updateMutation.mutateAsync,
    delete: deleteMutation.mutate,
    deleteAsync: deleteMutation.mutateAsync,
    isPending: saveMutation.isPending || updateMutation.isPending || deleteMutation.isPending,
    saveMutation,
    updateMutation,
    deleteMutation,
  };
}
