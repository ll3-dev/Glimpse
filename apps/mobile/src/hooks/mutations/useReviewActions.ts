/**
 * useReviewActions Hook
 *
 * React Query mutation hooks for review actions.
 */

import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import {
  markAsForgotten,
  markAsReviewed,
  postponeReview,
  type KnowledgeItem,
} from '@/src/features/review';
import { ensureLabelingBackgroundTaskRegistered } from '@/src/features/labeling';
import { queryKeys } from '@/src/lib/query-keys';

/**
 * 복습 액션이 라이브러리에서 바꾸는 것은 이 아이템뿐이다. 리스트 전체
 * 무효화 대신 캐시에서 해당 아이템만 갱신 결과로 교체해 라이브러리
 * 목록 refetch를 막는다. 아이템이 캐시에 없으면(마운트된 리스트 없음)
 * 아무것도 하지 않는다.
 */
function patchReviewedItem(
  queryClient: ReturnType<typeof useQueryClient>,
  item: KnowledgeItem,
) {
  queryClient.setQueryData<KnowledgeItem[]>(queryKeys.knowledgeItems.all, (current) => {
    if (!current) return current;
    const index = current.findIndex((entry) => entry.id === item.id);
    if (index === -1) return current;
    const next = current.slice();
    next[index] = item;
    return next;
  });
}

/**
 * Hook to mark an item as reviewed.
 * Automatically invalidates the due items query on success.
 *
 * @returns UseMutationResult for marking as reviewed
 *
 * @example
 * const { mutate: completeReview, isPending } = useMarkAsReviewedMutation();
 * completeReview({ itemId: '123' });
 */
export function useMarkAsReviewedMutation(): UseMutationResult<
  KnowledgeItem,
  Error,
  { itemId: string }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ itemId }: { itemId: string }): Promise<KnowledgeItem> => {
      const result = await markAsReviewed(itemId);
      if (result.success === false) {
        throw new Error(result.error.message);
      }
      return result.item;
    },
    onSuccess: (item) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.review.dueItems });
      patchReviewedItem(queryClient, item);
      void ensureLabelingBackgroundTaskRegistered();
    },
  });
}

/**
 * Hook to postpone a review.
 * Automatically invalidates the due items query on success.
 *
 * @returns UseMutationResult for postponing review
 *
 * @example
 * const { mutate: postpone, isPending } = usePostponeReviewMutation();
 * postpone({ itemId: '123' });
 */
export function usePostponeReviewMutation(): UseMutationResult<
  KnowledgeItem,
  Error,
  { itemId: string }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ itemId }: { itemId: string }): Promise<KnowledgeItem> => {
      const result = await postponeReview(itemId);
      if (result.success === false) {
        throw new Error(result.error.message);
      }
      return result.item;
    },
    onSuccess: (item) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.review.dueItems });
      patchReviewedItem(queryClient, item);
    },
  });
}

/**
 * Hook to mark an item as forgotten (recall failed).
 * Contracts the review interval and records the lapse in memory state.
 *
 * @example
 * const { mutate: forgot } = useMarkAsForgottenMutation();
 * forgot({ itemId: '123' });
 */
export function useMarkAsForgottenMutation(): UseMutationResult<
  KnowledgeItem,
  Error,
  { itemId: string }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ itemId }: { itemId: string }): Promise<KnowledgeItem> => {
      const result = await markAsForgotten(itemId);
      if (result.success === false) {
        throw new Error(result.error.message);
      }
      return result.item;
    },
    onSuccess: (item) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.review.dueItems });
      patchReviewedItem(queryClient, item);
    },
  });
}

/**
 * Combined hook that provides both review actions.
 * Convenient for components that need both actions.
 *
 * @returns Object with markAsReviewed and postponeReview mutations
 *
 * @example
 * const { markAsReviewed, postponeReview, isPending } = useReviewActionsMutation();
 */
export function useReviewActionsMutation() {
  const markAsReviewedMutation = useMarkAsReviewedMutation();
  const postponeReviewMutation = usePostponeReviewMutation();
  const markAsForgottenMutation = useMarkAsForgottenMutation();

  return {
    markAsReviewed: markAsReviewedMutation.mutate,
    postponeReview: postponeReviewMutation.mutate,
    markAsForgotten: markAsForgottenMutation.mutate,
    markAsReviewedAsync: markAsReviewedMutation.mutateAsync,
    postponeReviewAsync: postponeReviewMutation.mutateAsync,
    markAsForgottenAsync: markAsForgottenMutation.mutateAsync,
    isPending:
      markAsReviewedMutation.isPending ||
      postponeReviewMutation.isPending ||
      markAsForgottenMutation.isPending,
    markAsReviewedMutation,
    postponeReviewMutation,
    markAsForgottenMutation,
  };
}
