import type { GetDueKnowledgeItemsInput } from '@glimpse/shared';
import { calculateInitialReviewAt, DEFAULT_INITIAL_REVIEW_INTERVAL_MS } from './schedule';
import type {
  AppError,
  BatchInitializeReviewSchedulesDeps,
  GetDueItemsDeps,
  GetDueItemsOptions,
  GetDueItemsResult,
} from './types';
import { toAppError } from './types';

export function createGetDueItems(deps: GetDueItemsDeps) {
  return async (options: GetDueItemsOptions = {}): Promise<GetDueItemsResult> => {
    try {
      const input: GetDueKnowledgeItemsInput = { now: Date.now(), limit: options.limit };
      return { success: true, items: await deps.coreClient.getDueKnowledgeItems(input) };
    } catch (error) {
      deps.logger?.error('Failed to get due items', { error });
      return { success: false, error: toAppError(error) };
    }
  };
}
export function createBatchInitializeReviewSchedules(deps: BatchInitializeReviewSchedulesDeps) {
  return async (
    intervalMs = DEFAULT_INITIAL_REVIEW_INTERVAL_MS,
  ): Promise<{ count: number; error?: AppError }> => {
    try {
      const items = await deps.coreClient.listKnowledgeItems();
      const itemsNeedingSchedule = items.filter((item) => item.nextReviewAt === null);
      await Promise.all(
        itemsNeedingSchedule.map((item) =>
          deps.coreClient.updateKnowledgeItem(item.id, {
            nextReviewAt: calculateInitialReviewAt(item.createdAt, intervalMs),
            updatedAt: Date.now(),
          }),
        ),
      );
      return { count: itemsNeedingSchedule.length };
    } catch (error) {
      deps.logger?.error('Failed to batch initialize review schedules', { error });
      return { count: 0, error: toAppError(error) };
    }
  };
}
