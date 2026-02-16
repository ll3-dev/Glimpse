/**
 * Generate Recommendations Use Case
 *
 * Creates connection recommendations between knowledge items based on tag similarity.
 * MVP v1: Simple tag overlap rule (stub implementation).
 */

import { nanoid } from 'nanoid';
import { Effect } from 'effect';
import { db, recommendations, type KnowledgeItem, type NewRecommendation } from '@/src/db';
import { getWeeklyItems } from './getWeeklyItems';
import {
  appError,
  isFailure,
  type AppError,
  runEffectSuccess,
  tryPromise,
} from '@/src/lib/effect-result';

export interface GeneratedRecommendation {
  itemA: KnowledgeItem;
  itemB: KnowledgeItem;
  reason: string;
}

export interface GenerateResult {
  success: true;
  data: GeneratedRecommendation[];
}

export interface GenerateFailureResult {
  success: false;
  error: AppError;
}

export type GenerateRecommendationsResult = GenerateResult | GenerateFailureResult;

export interface GenerateRecommendationsDeps {
  db: typeof db;
  recommendations: typeof recommendations;
  getWeeklyItems: typeof getWeeklyItems;
}

export interface SaveRecommendationsDeps {
  db: typeof db;
  recommendations: typeof recommendations;
  nanoid: typeof nanoid;
}

const defaultGenerateDeps: GenerateRecommendationsDeps = {
  db,
  recommendations,
  getWeeklyItems,
};

const defaultSaveDeps: SaveRecommendationsDeps = {
  db,
  recommendations,
  nanoid,
};

/**
 * Calculates tag overlap between two items.
 * Returns the number of common tags.
 */
function calculateTagOverlap(a: KnowledgeItem, b: KnowledgeItem): number {
  const tagsA = new Set(a.tags || []);
  const tagsB = new Set(b.tags || []);

  let overlap = 0;
  for (const tag of tagsA) {
    if (tagsB.has(tag)) overlap++;
  }
  return overlap;
}

/**
 * Generates connection recommendations from weekly items.
 * Uses simple tag overlap as the recommendation rule.
 */
export function createGenerateRecommendations(deps: GenerateRecommendationsDeps = defaultGenerateDeps) {
  return async function generateRecommendations(): Promise<GenerateRecommendationsResult> {
    const program = Effect.gen(function* () {
      const weeklyResult = yield* tryPromise(
        () => deps.getWeeklyItems(),
        (error): AppError =>
          appError('GENERATION_ERROR', 'Failed to generate recommendations', error)
      );
      if (weeklyResult.success === false) {
        return yield* Effect.fail(weeklyResult.error);
      }

      const items = weeklyResult.data;

      // Need at least 2 items to make recommendations
      if (items.length < 2) {
        return {
          success: true as const,
          data: [],
        };
      }

      const existingRecommendations = (yield* tryPromise(
        () =>
          deps.db
            .select()
            .from(deps.recommendations),
        (error): AppError =>
          appError('DATABASE_ERROR', 'Failed to generate recommendations', error)
      )) as { itemA_id: string; itemB_id: string }[];

      const existingPairs = new Set(
        existingRecommendations.map((r) => `${r.itemA_id}-${r.itemB_id}`)
      );

      // Find pairs with tag overlap
      const candidates: GeneratedRecommendation[] = [];

      for (let i = 0; i < items.length; i++) {
        for (let j = i + 1; j < items.length; j++) {
          const itemA = items[i];
          const itemB = items[j];

          // Check if this pair already exists
          const pairKey = `${itemA.id}-${itemB.id}`;
          const reversePairKey = `${itemB.id}-${itemA.id}`;
          if (existingPairs.has(pairKey) || existingPairs.has(reversePairKey)) {
            continue;
          }

          // Calculate tag overlap
          const overlap = calculateTagOverlap(itemA, itemB);

          if (overlap > 0) {
            candidates.push({
              itemA,
              itemB,
              reason: `공통 태그 ${overlap}개`,
            });
          }
        }
      }

      // Sort by overlap count (descending) and take top recommendations
      // For MVP, we'll just return all candidates
      return {
        success: true as const,
        data: candidates,
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

/**
 * Saves recommendations to the database.
 */
export function createSaveRecommendations(deps: SaveRecommendationsDeps = defaultSaveDeps) {
  return async function saveRecommendations(
    recommendationsList: GeneratedRecommendation[]
  ): Promise<{ success: true } | { success: false; error: AppError }> {
    const program = Effect.gen(function* () {
      const now = Date.now();

      const newRecommendations: NewRecommendation[] = recommendationsList.map((r) => ({
        id: deps.nanoid(),
        itemA_id: r.itemA.id,
        itemB_id: r.itemB.id,
        reason: r.reason,
        status: 'pending' as const,
        createdAt: now,
        respondedAt: null,
      }));

      if (newRecommendations.length > 0) {
        yield* tryPromise(
          () => deps.db.insert(deps.recommendations).values(newRecommendations),
          (error): AppError =>
            appError('DATABASE_ERROR', 'Failed to save recommendations', error)
        );
      }

      return { success: true as const };
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

export const generateRecommendations = createGenerateRecommendations();
export const saveRecommendations = createSaveRecommendations();
