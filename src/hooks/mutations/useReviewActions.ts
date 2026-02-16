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
  type ReviewFeedbackType,
} from '@/src/features/review';
import { queryKeys } from '@/src/lib/query-keys';

/**
 * Hook to mark an item as reviewed.
 * Automatically invalidates the due items query on success.
 *
 * @returns UseMutationResult for marking as reviewed
 *
 * @example
 * const { mutate: completeReview, isPending } = useMarkAsReviewedMutation();
 * completeReview({ itemId: '123', feedbackType: 'remembered' });
 */
export function useMarkAsReviewedMutation(): UseMutationResult<
  KnowledgeItem,
  Error,
  { itemId: string; feedbackType?: ReviewFeedbackType }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      itemId,
      feedbackType = 'remembered',
    }: {
      itemId: string;
      feedbackType?: ReviewFeedbackType;
    }): Promise<KnowledgeItem> => {
      const result = await markAsReviewed(itemId, feedbackType);
      if (result.success === false) {
        throw new Error(result.error.message);
      }
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.review.dueItems() });
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
  { itemId: string; intervalMs?: number }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      itemId,
      intervalMs,
    }: {
      itemId: string;
      intervalMs?: number;
    }): Promise<KnowledgeItem> => {
      const result = await postponeReview(itemId, intervalMs);
      if (result.success === false) {
        throw new Error(result.error.message);
      }
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.review.dueItems() });
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
