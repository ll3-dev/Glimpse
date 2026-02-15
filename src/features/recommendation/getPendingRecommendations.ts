/**
 * Get Pending Recommendations Use Case
 *
 * Retrieves all pending recommendations for the digest view.
 */

import { db, recommendations, knowledgeItems, type Recommendation, type KnowledgeItem } from '@/src/db';
import { eq } from 'drizzle-orm';

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
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export type GetPendingResult = PendingResult | PendingFailureResult;

export interface GetPendingRecommendationsDeps {
  db: typeof db;
  recommendations: typeof recommendations;
  knowledgeItems: typeof knowledgeItems;
  eq: typeof eq;
}

const defaultDeps: GetPendingRecommendationsDeps = {
  db,
  recommendations,
  knowledgeItems,
  eq,
};

/**
 * Retrieves all pending recommendations with their associated items.
 */
export function createGetPendingRecommendations(
  deps: GetPendingRecommendationsDeps = defaultDeps
) {
  return async function getPendingRecommendations(): Promise<GetPendingResult> {
    try {
      // Get all pending recommendations
      const pendingRecs = await deps.db
        .select()
        .from(deps.recommendations)
        .where(deps.eq(deps.recommendations.status, 'pending'));

      if (pendingRecs.length === 0) {
        return {
          success: true,
          data: [],
        };
      }

      // Get all unique item IDs
      const itemIds = new Set<string>();
      pendingRecs.forEach((r) => {
        itemIds.add(r.itemA_id);
        itemIds.add(r.itemB_id);
      });

      // Fetch all items
      const items = await deps.db
        .select()
        .from(deps.knowledgeItems);

      // Create item lookup map
      const itemMap = new Map<string, KnowledgeItem>();
      items.forEach((item) => {
        itemMap.set(item.id, item);
      });

      // Combine recommendations with items
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
        success: true,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to retrieve pending recommendations',
          details: error instanceof Error ? error.message : error,
        },
      };
    }
  };
}

export const getPendingRecommendations = createGetPendingRecommendations();
