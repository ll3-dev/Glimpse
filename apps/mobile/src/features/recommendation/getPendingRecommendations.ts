/**
 * Get Pending Recommendations Use Case
 *
 * Retrieves all pending recommendations for the digest view.
 */

import { Effect } from 'effect';
import { mobileCoreClient, type MobileCoreClient } from '@/src/features/core';
import {
  appError,
  isFailure,
  type AppError,
  runEffectSuccess,
} from '@/src/lib/effect-result';
import type { Recommendation, KnowledgeItem } from '@glimpse/shared';

export interface RecommendationWithItems {
  recommendation: Recommendation;
  itemA: KnowledgeItem;
  itemB: KnowledgeItem;
}

export interface PendingResult {
  success: true;
  data: RecommendationWithItems[];
}

export interface PendingFailureResult {
  success: false;
  error: AppError;
}

export type GetPendingResult = PendingResult | PendingFailureResult;

export interface GetPendingRecommendationsDeps {
  coreClient: Pick<MobileCoreClient, 'listPendingRecommendations' | 'listKnowledgeItemsByIds'>;
}

const defaultDeps: GetPendingRecommendationsDeps = {
  coreClient: mobileCoreClient,
};

/**
 * Retrieves all pending recommendations with their associated items.
 */
export function createGetPendingRecommendations(
  deps: GetPendingRecommendationsDeps = defaultDeps
) {
  return async function getPendingRecommendations(): Promise<GetPendingResult> {
    const program = Effect.gen(function* () {
      const pendingRecs = (yield* Effect.tryPromise({
        try: () => deps.coreClient.listPendingRecommendations(),
        catch: (error): AppError =>
          appError('DATABASE_ERROR', 'Failed to retrieve pending recommendations', error),
      })) as Recommendation[];

      if (pendingRecs.length === 0) {
        return { success: true as const, data: [] };
      }

      const itemIds = Array.from(
        new Set(
          pendingRecs.flatMap((recommendation) => [
            recommendation.itemA_id,
            recommendation.itemB_id,
          ])
        )
      );
      const items = itemIds.length === 0
        ? []
        : ((yield* Effect.tryPromise({
            try: () => deps.coreClient.listKnowledgeItemsByIds(itemIds),
            catch: (error): AppError =>
              appError('DATABASE_ERROR', 'Failed to retrieve pending recommendations', error),
          })) as KnowledgeItem[]);

      const itemMap = new Map<string, KnowledgeItem>();
      items.forEach((item) => {
        itemMap.set(item.id, item);
      });

      const result: RecommendationWithItems[] = [];
      for (const rec of pendingRecs) {
        const itemA = itemMap.get(rec.itemA_id);
        const itemB = itemMap.get(rec.itemB_id);

        if (itemA && itemB) {
          result.push({
            recommendation: rec,
            itemA,
            itemB,
          });
        }
      }

      return {
        success: true as const,
        data: result,
      };
    });

    const result = await runEffectSuccess(program);
    if (isFailure(result)) {
      return {
        success: false,
        error: result.error,
      };
    }

    return result;
  };
}

export const getPendingRecommendations = createGetPendingRecommendations();
