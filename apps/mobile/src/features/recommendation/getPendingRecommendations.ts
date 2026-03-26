import {
  createGetPendingRecommendations,
  type GetPendingRecommendationsDeps,
  type GetPendingResult,
  type PendingFailureResult,
  type PendingResult,
  type RecommendationWithItems,
} from '@/src/features/core/application/recommendation';
import { mobileCoreClient, type MobileCoreClient } from '@/src/features/core';

const defaultDeps: GetPendingRecommendationsDeps = {
  coreClient: mobileCoreClient as Pick<
    MobileCoreClient,
    'listPendingRecommendations' | 'listKnowledgeItemsByIds'
  >,
};
export type {
  GetPendingRecommendationsDeps,
  GetPendingResult,
  PendingFailureResult,
  PendingResult,
  RecommendationWithItems,
};
export { createGetPendingRecommendations };
export const getPendingRecommendations = createGetPendingRecommendations(defaultDeps);
