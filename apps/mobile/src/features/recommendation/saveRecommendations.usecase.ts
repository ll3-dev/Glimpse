import { appError, isFailure, runEffectResult, type AppError, tryPromise } from '@/src/lib/effect-result';
import type { NewRecommendation } from '@glimpse/shared';
import type { GeneratedRecommendation, SaveRecommendationsDeps } from './generateRecommendations.types';
import { isIdCollisionError, MAX_ID_COLLISION_RETRIES } from '@/src/lib/id';

export function createSaveRecommendations(deps: SaveRecommendationsDeps) {
  return async function saveRecommendations(
    recommendationsList: GeneratedRecommendation[]
  ): Promise<{ success: true } | { success: false; error: AppError }> {
    if (recommendationsList.length === 0) {
      return { success: true as const };
    }

    for (let attempt = 0; attempt <= MAX_ID_COLLISION_RETRIES; attempt++) {
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

      const insertResult = await runEffectResult(
        tryPromise(
          () => deps.coreClient.saveRecommendations(newRecommendations),
          (error): AppError => appError('DATABASE_ERROR', 'Failed to save recommendations', error)
        )
      );

      if (insertResult.success) {
        return { success: true as const };
      }
      if (!isFailure(insertResult)) {
        continue;
      }

      const isFinalAttempt = attempt === MAX_ID_COLLISION_RETRIES;
      if (!isIdCollisionError(insertResult.error.details) || isFinalAttempt) {
        return { success: false, error: insertResult.error };
      }
    }

    return {
      success: false,
      error: appError(
        'DATABASE_ERROR',
        'Failed to save recommendations after ID collision retries'
      ),
    };
  };
}
