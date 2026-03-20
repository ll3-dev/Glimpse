import { Effect } from 'effect';
import { appError, isFailure, runEffectSuccess, type AppError, tryPromise } from '@/src/lib/effect-result';
import type {
  GenerateRecommendationsDeps,
  GenerateRecommendationsResult,
} from './generateRecommendations.types';
import { calculateTagOverlap } from './recommendationSimilarity';

export function createGenerateRecommendations(deps: GenerateRecommendationsDeps) {
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
      if (items.length < 2) {
        return {
          success: true as const,
          data: [],
        };
      }

      const existingRecommendations = (yield* tryPromise(
        () => deps.coreClient.listRecommendations(),
        (error): AppError =>
          appError('DATABASE_ERROR', 'Failed to generate recommendations', error)
      )) as { itemA_id: string; itemB_id: string }[];

      const existingPairs = new Set(
        existingRecommendations.map((recommendation) =>
          `${recommendation.itemA_id}-${recommendation.itemB_id}`
        )
      );

      const candidates = [];
      for (let i = 0; i < items.length; i++) {
        for (let j = i + 1; j < items.length; j++) {
          const itemA = items[i];
          const itemB = items[j];
          const pairKey = `${itemA.id}-${itemB.id}`;
          const reversePairKey = `${itemB.id}-${itemA.id}`;

          if (existingPairs.has(pairKey) || existingPairs.has(reversePairKey)) {
            continue;
          }

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
