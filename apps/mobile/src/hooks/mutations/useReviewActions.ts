/**
 * useReviewActions Hook
 *
 * React Query mutation hooks for review actions.
 */

import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import {
  markAsReviewed,
  postponeReview,
  type KnowledgeItem,
} from '@/src/features/review';
import { ensureLabelingBackgroundTaskRegistered } from '@/src/features/labeling';
import { queryKeys } from '@/src/lib/query-keys';

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.review.dueItems });
      queryClient.invalidateQueries({ queryKey: queryKeys.knowledgeItems.all });
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.review.dueItems });
      queryClient.invalidateQueries({ queryKey: queryKeys.knowledgeItems.all });
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

  return {
    markAsReviewed: markAsReviewedMutation.mutate,
    postponeReview: postponeReviewMutation.mutate,
    markAsReviewedAsync: markAsReviewedMutation.mutateAsync,
    postponeReviewAsync: postponeReviewMutation.mutateAsync,
    isPending: markAsReviewedMutation.isPending || postponeReviewMutation.isPending,
    markAsReviewedMutation,
    postponeReviewMutation,
  };
}
