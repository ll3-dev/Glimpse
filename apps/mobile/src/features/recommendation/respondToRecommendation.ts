import {
  createRespondToRecommendation,
  type RespondFailureResult,
  type RespondResult,
  type RespondToRecommendationDeps,
  type RespondToRecommendationResult,
} from '@/src/features/core/application/recommendation';
import { mobileCoreClient, type MobileCoreClient } from '@/src/features/core';
import { generateId, isIdCollisionError, MAX_ID_COLLISION_RETRIES } from '@/src/lib/id';

const defaultDeps: RespondToRecommendationDeps = {
  coreClient: mobileCoreClient as Pick<MobileCoreClient, 'respondToRecommendation'>,
  nanoid: generateId,
  isIdCollisionError,
  maxIdCollisionRetries: MAX_ID_COLLISION_RETRIES,
};
export type {
  RespondFailureResult,
  RespondResult,
  RespondToRecommendationDeps,
  RespondToRecommendationResult,
};
export { createRespondToRecommendation };
export const respondToRecommendation = createRespondToRecommendation(defaultDeps);
