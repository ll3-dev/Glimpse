import type { KnowledgeItem } from '@glimpse/shared';
import type { ReviewActionResult, ReviewActionsDeps } from './types';
import { toAppError } from './types';

export async function loadKnowledgeItemOrFail(
  coreClient: ReviewActionsDeps['coreClient'],
  itemId: string,
  logger?: ReviewActionsDeps['logger'],
): Promise<KnowledgeItem | null> {
  const item = await coreClient.getKnowledgeItemById(itemId);
  if (!item) logger?.error('Knowledge item not found', { itemId });
  return item;
}
export function createMarkAsReviewed(deps: ReviewActionsDeps) {
  return async (itemId: string, now = Date.now()): Promise<ReviewActionResult> => {
    try {
      const item = await loadKnowledgeItemOrFail(deps.coreClient, itemId, deps.logger);
      if (!item) {
        return { success: false, error: { code: 'NOT_FOUND', message: 'Item not found' }, itemId };
      }
      const { nextReviewAt, stability, difficulty } = deps.calculateNextReviewFromFeedback(
        item.lastReviewedAt,
        item.nextReviewAt,
        'remembered',
        now,
        { stabilityDays: item.stability ?? 0.5, difficulty: item.difficulty ?? 5.0 },
      );
      const updated = await deps.coreClient.updateKnowledgeItem(itemId, {
        lastReviewedAt: now,
        nextReviewAt,
        stability,
        difficulty,
        updatedAt: now,
      });
      return { success: true, item: updated };
    } catch (error) {
      return { success: false, error: toAppError(error), itemId };
    }
  };
}

export function createMarkAsForgotten(deps: ReviewActionsDeps) {
  return async (itemId: string, now = Date.now()): Promise<ReviewActionResult> => {
    try {
      const item = await loadKnowledgeItemOrFail(deps.coreClient, itemId, deps.logger);
      if (!item) {
        return { success: false, error: { code: 'NOT_FOUND', message: 'Item not found' }, itemId };
      }
      const { nextReviewAt, stability, difficulty } = deps.calculateNextReviewFromFeedback(
        item.lastReviewedAt,
        item.nextReviewAt,
        'forgotten',
        now,
        { stabilityDays: item.stability ?? 0.5, difficulty: item.difficulty ?? 5.0 },
      );
      const updated = await deps.coreClient.updateKnowledgeItem(itemId, {
        lastReviewedAt: now,
        nextReviewAt,
        stability,
        difficulty,
        updatedAt: now,
      });
      return { success: true, item: updated };
    } catch (error) {
      return { success: false, error: toAppError(error), itemId };
    }
  };
}

export function createPostponeReview(deps: ReviewActionsDeps) {
  return async (itemId: string, now = Date.now()): Promise<ReviewActionResult> => {
    try {
      const item = await loadKnowledgeItemOrFail(deps.coreClient, itemId, deps.logger);
      if (!item) {
        return { success: false, error: { code: 'NOT_FOUND', message: 'Item not found' }, itemId };
      }
      const { nextReviewAt } = deps.calculateNextReviewFromFeedback(
        item.lastReviewedAt,
        item.nextReviewAt,
        'postponed',
        now,
        { stabilityDays: item.stability ?? 0.5, difficulty: item.difficulty ?? 5.0 },
      );
      const updated = await deps.coreClient.updateKnowledgeItem(itemId, {
        nextReviewAt,
        updatedAt: now,
      });
      return { success: true, item: updated };
    } catch (error) {
      return { success: false, error: toAppError(error), itemId };
    }
  };
}
