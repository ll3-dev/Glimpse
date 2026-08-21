import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { RecommendationStatus, FeedbackEvent } from '@glimpse/shared';
import { useCoreClient } from '../core-client-context';
import { queryKeys } from '../query-keys';

export function useRespondToRecommendationMutation() {
  const coreClient = useCoreClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      recommendationId,
      status,
      feedbackEvent,
    }: {
      recommendationId: string;
      status: RecommendationStatus;
      feedbackEvent: FeedbackEvent;
    }) => coreClient.respondToRecommendation(recommendationId, status, feedbackEvent),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.recommendations.pending }),
  });
}

export function useLogFeedbackMutation() {
  const coreClient = useCoreClient();
  // Feedback logging has no query-backed read model to invalidate.
  // react-doctor-disable-next-line react-doctor/query-mutation-missing-invalidation
  return useMutation({
    mutationFn: (event: FeedbackEvent) => coreClient.logRecommendationFeedback(event),
  });
}
