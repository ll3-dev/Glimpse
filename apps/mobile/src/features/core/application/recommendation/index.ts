/**
 * Recommendation Application Layer
 * Migrated from @glimpse/core/application/recommendation
 */

import type { KnowledgeItem, RecommendationStatus, FeedbackActionType, CoreClient } from '@glimpse/shared';
import {
  buildFeedbackEvent,
  buildLogFeedbackEvent,
  buildRecommendationReason,
  buildRecommendationRecord,
  collectPendingRecommendationItemIds,
  countSharedTags,
  joinRecommendationsWithItems,
  toAppError,
  toTagOverlapInput,
} from './helpers';
import type {
  GenerateRecommendationsDeps,
  GenerateRecommendationsDepsResult,
  GeneratedRecommendation,
  SaveRecommendationsDeps,
  RecommendationSaveResult,
  GetWeeklyItemsDeps,
  WeeklyItemsResult,
  GetPendingRecommendationsDeps,
  PendingResult,
  RespondToRecommendationDeps,
  RespondToRecommendationResult,
  RecommendationFeedbackDeps,
  LogRecommendationFeedbackResult,
  GetRecentFeedbackResult,
} from './types';

export * from './types';

export async function calculateTagOverlap(
  coreClient: Pick<CoreClient, 'calculateTagOverlap'>,
  left: KnowledgeItem,
  right: KnowledgeItem
): Promise<number> {
  return coreClient.calculateTagOverlap(toTagOverlapInput(left, right));
}

export function createGenerateRecommendations(deps: GenerateRecommendationsDeps) {
  return async (
    input: { since: number; limit?: number } = { since: Date.now() - 7 * 24 * 60 * 60 * 1000 }
  ): Promise<GenerateRecommendationsDepsResult> => {
    try {
      const weeklyItems = await deps.getWeeklyItems();
      if (weeklyItems.success === false) {
        return { success: false, error: weeklyItems.error };
      }

      const recommendations: GeneratedRecommendation[] = [];
      const items = weeklyItems.items;

      for (let leftIndex = 0; leftIndex < items.length; leftIndex += 1) {
        for (let rightIndex = leftIndex + 1; rightIndex < items.length; rightIndex += 1) {
          const itemA = items[leftIndex];
          const itemB = items[rightIndex];
          const overlap = countSharedTags(itemA, itemB);

          if (overlap > 0) {
            recommendations.push({
              itemAId: itemA.id,
              itemBId: itemB.id,
              reason: buildRecommendationReason(overlap),
            });
          }

          if (input.limit && recommendations.length >= input.limit) {
            break;
          }
        }

        if (input.limit && recommendations.length >= input.limit) {
          break;
        }
      }

      return { success: true, recommendations };
    } catch (error) {
      return { success: false, error: toAppError(error) };
    }
  };
}

export function createSaveRecommendations(deps: SaveRecommendationsDeps) {
  return async (
    recommendations: GeneratedRecommendation[]
  ): Promise<RecommendationSaveResult> => {
    try {
      const now = Date.now();
      const toSave = recommendations.map((recommendation) =>
        buildRecommendationRecord(recommendation, deps.nanoid(), now)
      );

      await deps.coreClient.saveRecommendations(toSave);
      return { success: true };
    } catch (error) {
      if (deps.isIdCollisionError(error)) {
        return { success: false, error: { code: 'ID_COLLISION', message: 'ID collision' } };
      }
      return { success: false, error: toAppError(error) };
    }
  };
}

export function createGetWeeklyItems(deps: GetWeeklyItemsDeps) {
  return async (
    since: number = Date.now() - 7 * 24 * 60 * 60 * 1000
  ): Promise<WeeklyItemsResult> => {
    try {
      const items = await deps.coreClient.listWeeklyKnowledgeItems(since);
      return { success: true, items };
    } catch (error) {
      return { success: false, error: toAppError(error) };
    }
  };
}

export function createGetPendingRecommendations(deps: GetPendingRecommendationsDeps) {
  return async (): Promise<PendingResult> => {
    try {
      const recommendations = await deps.coreClient.listPendingRecommendations();
      const itemIds = collectPendingRecommendationItemIds(recommendations);
      const items = await deps.coreClient.listKnowledgeItemsByIds(itemIds);

      return {
        success: true,
        recommendations: joinRecommendationsWithItems(recommendations, items),
      };
    } catch (error) {
      return { success: false, error: toAppError(error) };
    }
  };
}

export function createRespondToRecommendation(deps: RespondToRecommendationDeps) {
  return async (
    recommendationId: string,
    status: RecommendationStatus,
    action: FeedbackActionType
  ): Promise<RespondToRecommendationResult> => {
    try {
      const event = buildFeedbackEvent(recommendationId, action, deps.nanoid(), Date.now());
      await deps.coreClient.respondToRecommendation(recommendationId, status, event);
      return { success: true, recommendationId };
    } catch (error) {
      return { success: false, error: toAppError(error), recommendationId };
    }
  };
}

export function createLogRecommendationFeedback(deps: RecommendationFeedbackDeps) {
  return async (
    event: Omit<import('@glimpse/shared').FeedbackEvent, 'id' | 'createdAt'>
  ): Promise<LogRecommendationFeedbackResult> => {
    try {
      const fullEvent = buildLogFeedbackEvent(event, deps.nanoid(), Date.now());
      const saved = await deps.coreClient.logRecommendationFeedback(fullEvent);
      return { success: true, event: saved, eventId: saved.id };
    } catch (error) {
      if (deps.isIdCollisionError(error)) {
        return { success: false, error: { code: 'ID_COLLISION', message: 'ID collision' } };
      }
      return { success: false, error: toAppError(error) };
    }
  };
}

export function createGetRecentFeedbackEvents(deps: RecommendationFeedbackDeps) {
  return async (limit: number = 50): Promise<GetRecentFeedbackResult> => {
    try {
      const events = await deps.coreClient.listRecentFeedbackEvents(limit);
      return { success: true, events };
    } catch (error) {
      return { success: false, error: toAppError(error) };
    }
  };
}
