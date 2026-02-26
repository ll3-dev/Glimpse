/**
 * Get Pending Recommendations Use Case
 *
 * Retrieves all pending recommendations for the digest view.
 */

import { db, recommendations, knowledgeItems, type Recommendation, type KnowledgeItem } from '@/src/db';
import { eq, inArray } from 'drizzle-orm';
import { Effect } from 'effect';
import {
  appError,
  isFailure,
  type AppError,
  runEffectSuccess,
  tryPromise,
} from '@/src/lib/effect-result';

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
  db: typeof db;
  recommendations: typeof recommendations;
  knowledgeItems: typeof knowledgeItems;
  eq: typeof eq;
  inArray: typeof inArray;
}

const defaultDeps: GetPendingRecommendationsDeps = {
  db,
  recommendations,
  knowledgeItems,
  eq,
  inArray,
};

/**
 * Retrieves all pending recommendations with their associated items.
 */
export function createGetPendingRecommendations(
  deps: GetPendingRecommendationsDeps = defaultDeps
) {
  return async function getPendingRecommendations(): Promise<GetPendingResult> {
    const program = Effect.gen(function* () {
      const pendingRecs = (yield* tryPromise(
        () =>
          deps.db
            .select()
            .from(deps.recommendations)
            .where(deps.eq(deps.recommendations.status, 'pending')),
        (error): AppError =>
          appError('DATABASE_ERROR', 'Failed to retrieve pending recommendations', error)
      )) as Recommendation[];

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
        : ((yield* tryPromise(
            () =>
              deps.db
                .select()
                .from(deps.knowledgeItems)
                .where(deps.inArray(deps.knowledgeItems.id, itemIds)),
            (error): AppError =>
              appError('DATABASE_ERROR', 'Failed to retrieve pending recommendations', error)
          )) as KnowledgeItem[]);

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
