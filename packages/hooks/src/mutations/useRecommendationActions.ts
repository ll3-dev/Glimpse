import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  createRespondToRecommendation,
  createLogRecommendationFeedback,
} from '@glimpse/features/recommendation';
import type { RecommendationStatus, FeedbackActionType } from '@glimpse/shared';
import { useCoreClient } from '../core-client-context';
import { queryKeys } from '../query-keys';

export function useRespondToRecommendationMutation() {
  const coreClient = useCoreClient();
  const queryClient = useQueryClient();
  const respond = createRespondToRecommendation({
    coreClient,
    nanoid: () => crypto.randomUUID(),
  });

  return useMutation({
    mutationFn: async (input: {
      recommendationId: string;
      status: RecommendationStatus;
      action: FeedbackActionType;
    }) => {
      const result = await respond(input.recommendationId, input.status, input.action);
      if (result.success === false) throw new Error(result.error.message);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.recommendations.pending });
    },
  });
}

export function useLogRecommendationFeedbackMutation() {
  const coreClient = useCoreClient();
  const logFeedback = createLogRecommendationFeedback({
    coreClient,
    nanoid: () => crypto.randomUUID(),
    isIdCollisionError: () => false,
  });

  return useMutation({
    mutationFn: async (event: Omit<import('@glimpse/shared').FeedbackEvent, 'id' | 'createdAt'>) => {
      const result = await logFeedback(event);
      if (result.success === false) throw new Error(result.error.message);
      return result.event;
    },
  });
}
