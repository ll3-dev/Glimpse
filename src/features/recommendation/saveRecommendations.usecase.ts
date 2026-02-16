import { Effect } from 'effect';
import { appError, isFailure, runEffectSuccess, type AppError, tryPromise } from '@/src/lib/effect-result';
import type { NewRecommendation } from '@/src/db';
import type { GeneratedRecommendation, SaveRecommendationsDeps } from './generateRecommendations.types';

export function createSaveRecommendations(deps: SaveRecommendationsDeps) {
  return async function saveRecommendations(
    recommendationsList: GeneratedRecommendation[]
  ): Promise<{ success: true } | { success: false; error: AppError }> {
    const program = Effect.gen(function* () {
      const now = Date.now();

      const newRecommendations: NewRecommendation[] = recommendationsList.map((recommendation) => ({
        id: deps.nanoid(),
        itemA_id: recommendation.itemA.id,
        itemB_id: recommendation.itemB.id,
        reason: recommendation.reason,
        status: 'pending' as const,
        createdAt: now,
        respondedAt: null,
      }));

      if (newRecommendations.length > 0) {
        yield* tryPromise(
          () => deps.db.insert(deps.recommendations).values(newRecommendations),
          (error): AppError => appError('DATABASE_ERROR', 'Failed to save recommendations', error)
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
