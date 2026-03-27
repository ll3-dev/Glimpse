import {
  createGetPendingRecommendations,
  type GetPendingRecommendationsDeps,
  type GetPendingResult,
  type PendingFailureResult,
  type PendingResult,
  type RecommendationWithItems,
} from '@/src/features/core/application/recommendation';
import { mobileCoreClient, type MobileCoreClient } from '@/src/features/core';

function getDefaultDeps(): GetPendingRecommendationsDeps {
  return {
    coreClient: mobileCoreClient as Pick<
      MobileCoreClient,
      'listPendingRecommendations' | 'listKnowledgeItemsByIds'
    >,
  };
}

export type {
  GetPendingRecommendationsDeps,
  GetPendingResult,
  PendingFailureResult,
  PendingResult,
  RecommendationWithItems,
};
export { createGetPendingRecommendations };
export function getPendingRecommendations() {
  return createGetPendingRecommendations(getDefaultDeps())();
}
