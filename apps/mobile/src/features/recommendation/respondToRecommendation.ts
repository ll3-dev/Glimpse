import {
  createRespondToRecommendation,
  type RespondFailureResult,
  type RespondResult,
  type RespondToRecommendationDeps,
  type RespondToRecommendationResult,
} from '@/src/features/core/application/recommendation';
import { mobileCoreClient, type MobileCoreClient } from '@/src/features/core';
import { generateId, isIdCollisionError, MAX_ID_COLLISION_RETRIES } from '@/src/lib/id';

function getDefaultDeps(): RespondToRecommendationDeps {
  return {
    coreClient: mobileCoreClient as Pick<MobileCoreClient, 'respondToRecommendation'>,
    nanoid: generateId,
    isIdCollisionError,
    maxIdCollisionRetries: MAX_ID_COLLISION_RETRIES,
  };
}

export type {
  RespondFailureResult,
  RespondResult,
  RespondToRecommendationDeps,
  RespondToRecommendationResult,
};
export { createRespondToRecommendation };
export function respondToRecommendation(
  recommendationId: string,
  status: Parameters<ReturnType<typeof createRespondToRecommendation>>[1],
  action: Parameters<ReturnType<typeof createRespondToRecommendation>>[2]
) {
  return createRespondToRecommendation(getDefaultDeps())(recommendationId, status, action);
}
