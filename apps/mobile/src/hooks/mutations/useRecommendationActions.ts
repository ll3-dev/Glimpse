/**
 * useRecommendationActions Hook
 *
 * React Query mutation hooks for recommendation actions.
 */

import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { respondToRecommendation } from '@/src/features/recommendation';
import type { RecommendationStatus } from '@glimpse/shared';
import { queryKeys } from '@/src/lib/query-keys';

type RecommendationAction = 'accept' | 'ignore' | 'dismiss';

interface RecommendationActionResult {
  status: RecommendationStatus;
}

/**
 * Hook to respond to a recommendation (accept/ignore/dismiss).
 * Automatically invalidates the pending recommendations query on success.
 *
 * @returns UseMutationResult for responding to recommendations
 *
 * @example
 * const { mutate: respond, isPending } = useRespondToRecommendationMutation();
 * respond({ recommendationId: '123', action: 'accept' });
 */
export function useRespondToRecommendationMutation(): UseMutationResult<
  RecommendationActionResult,
  Error,
  { recommendationId: string; action: RecommendationAction }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      recommendationId,
      action,
    }: {
      recommendationId: string;
      action: RecommendationAction;
    }): Promise<RecommendationActionResult> => {
      const result = await respondToRecommendation(recommendationId, action);
      if (result.success === false) {
        throw new Error(result.error.message);
      }
      return { status: result.status };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.recommendations.pending });
    },
  });
}

/**
 * Combined hook that provides all recommendation actions.
 *
 * @returns Object with respond mutation and convenience methods
 *
 * @example
 * const { accept, ignore, dismiss, isPending } = useRecommendationActionsMutation();
 * accept('recommendation-id');
 */
export function useRecommendationActionsMutation() {
  const respondMutation = useRespondToRecommendationMutation();

  return {
    respond: respondMutation.mutate,
    respondAsync: respondMutation.mutateAsync,
    accept: (recommendationId: string) => respondMutation.mutate({ recommendationId, action: 'accept' }),
    ignore: (recommendationId: string) => respondMutation.mutate({ recommendationId, action: 'ignore' }),
    dismiss: (recommendationId: string) => respondMutation.mutate({ recommendationId, action: 'dismiss' }),
    isPending: respondMutation.isPending,
    respondMutation,
  };
}
