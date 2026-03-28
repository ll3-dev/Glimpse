/**
 * Review Application Layer
 *
 * Platform-agnostic review feature functions.
 */

import type {
  KnowledgeItem,
  InitializeReviewScheduleInput,
  InitializeReviewScheduleOutput,
  GetDueKnowledgeItemsInput,
  CoreClient,
} from '@glimpse/shared';

// ============================================================================
// Constants
// ============================================================================

export const DEFAULT_REVIEW_INTERVAL_MS = 24 * 60 * 60 * 1000; // 1 day
export const DEFAULT_POSTPONE_INTERVAL_MS = 4 * 60 * 60 * 1000; // 4 hours
export const DEFAULT_INITIAL_REVIEW_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

// ============================================================================
// Types
// ============================================================================

export interface AppError {
  code: string;
  message: string;
}

function toAppError(error: unknown, code: string = 'REVIEW_ERROR'): AppError {
  return {
    code,
    message: error instanceof Error ? error.message : String(error),
  };
}

export interface ReviewActionsDeps {
  coreClient: {
    getKnowledgeItemById: (itemId: string) => Promise<KnowledgeItem | null>;
    updateKnowledgeItem: (
      itemId: string,
      patch: Partial<Omit<KnowledgeItem, 'id' | 'createdAt'>>
    ) => Promise<KnowledgeItem>;
  };
  logger?: { error: (message: string, meta?: unknown) => void };
  calculateNextReviewFromFeedback: (
    lastReviewedAt: number | null,
    nextReviewAt: number | null,
    feedbackType: 'remembered' | 'postponed',
    now: number
  ) => { intervalMs: number; nextReviewAt: number };
}

export interface ReviewActionSuccessResult {
  success: true;
  item: KnowledgeItem;
}

export interface ReviewActionFailureResult {
  success: false;
  error: AppError;
  itemId: string;
}

export type ReviewActionResult = ReviewActionSuccessResult | ReviewActionFailureResult;

export interface GetDueItemsDeps {
  coreClient: {
    getDueKnowledgeItems: (input: GetDueKnowledgeItemsInput) => Promise<KnowledgeItem[]>;
  };
  logger?: { error: (message: string, meta?: unknown) => void };
}

export interface GetDueItemsOptions {
  limit?: number;
}

export interface GetDueItemsSuccessResult {
  success: true;
  items: KnowledgeItem[];
}

export interface GetDueItemsFailureResult {
  success: false;
  error: AppError;
}

export type GetDueItemsResult = GetDueItemsSuccessResult | GetDueItemsFailureResult;

export interface BatchInitializeReviewSchedulesDeps {
  coreClient: {
    listKnowledgeItems: () => Promise<KnowledgeItem[]>;
    updateKnowledgeItem: (
      itemId: string,
      patch: Partial<Omit<KnowledgeItem, 'id' | 'createdAt'>>
    ) => Promise<KnowledgeItem>;
  };
  logger?: { error: (message: string, meta?: unknown) => void };
}

// ============================================================================
// Helper Functions
// ============================================================================

export function calculateInitialReviewAt(
  createdAt: number,
  intervalMs: number = DEFAULT_INITIAL_REVIEW_INTERVAL_MS
): number {
  return createdAt + intervalMs;
}

export async function loadKnowledgeItemOrFail(
  coreClient: ReviewActionsDeps['coreClient'],
  itemId: string,
  logger?: ReviewActionsDeps['logger']
): Promise<KnowledgeItem | null> {
  const item = await coreClient.getKnowledgeItemById(itemId);
  if (!item) {
    logger?.error('Knowledge item not found', { itemId });
    return null;
  }
  return item;
}

// ============================================================================
// Core Functions
// ============================================================================

export async function initializeReviewScheduleWithCore(
  coreClient: Pick<CoreClient, 'initializeReviewSchedule'>,
  createdAt: number,
  intervalMs: number = DEFAULT_INITIAL_REVIEW_INTERVAL_MS
): Promise<InitializeReviewScheduleOutput> {
  const input: InitializeReviewScheduleInput = {
    createdAt,
    intervalMs,
  };
  return coreClient.initializeReviewSchedule(input);
}

// ============================================================================
// Factory Functions
// ============================================================================

export function createMarkAsReviewed(deps: ReviewActionsDeps) {
  return async (itemId: string, now: number = Date.now()): Promise<ReviewActionResult> => {
    try {
      const item = await loadKnowledgeItemOrFail(deps.coreClient, itemId, deps.logger);
      if (!item) {
        return { success: false, error: { code: 'NOT_FOUND', message: 'Item not found' }, itemId };
      }

      const { nextReviewAt } = deps.calculateNextReviewFromFeedback(
        item.lastReviewedAt,
        item.nextReviewAt,
        'remembered',
        now
      );

      const updated = await deps.coreClient.updateKnowledgeItem(itemId, {
        lastReviewedAt: now,
        nextReviewAt,
        updatedAt: now,
      });

      return { success: true, item: updated };
    } catch (error) {
      return { success: false, error: toAppError(error), itemId };
    }
  };
}

export function createPostponeReview(deps: ReviewActionsDeps) {
  return async (itemId: string, now: number = Date.now()): Promise<ReviewActionResult> => {
    try {
      const item = await loadKnowledgeItemOrFail(deps.coreClient, itemId, deps.logger);
      if (!item) {
        return { success: false, error: { code: 'NOT_FOUND', message: 'Item not found' }, itemId };
      }

      const { nextReviewAt } = deps.calculateNextReviewFromFeedback(
        item.lastReviewedAt,
        item.nextReviewAt,
        'postponed',
        now
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

export function createGetDueItems(deps: GetDueItemsDeps) {
  return async (options: GetDueItemsOptions = {}): Promise<GetDueItemsResult> => {
    try {
      const input: GetDueKnowledgeItemsInput = {
        now: Date.now(),
        limit: options.limit,
      };
      const items = await deps.coreClient.getDueKnowledgeItems(input);
      return { success: true, items };
    } catch (error) {
      deps.logger?.error('Failed to get due items', { error });
      return { success: false, error: toAppError(error) };
    }
  };
}

export function createBatchInitializeReviewSchedules(deps: BatchInitializeReviewSchedulesDeps) {
  return async (intervalMs: number = DEFAULT_INITIAL_REVIEW_INTERVAL_MS): Promise<{ count: number; error?: AppError }> => {
    try {
      const items = await deps.coreClient.listKnowledgeItems();
      const itemsNeedingSchedule = items.filter((item) => item.nextReviewAt === null);

      for (const item of itemsNeedingSchedule) {
        const nextReviewAt = calculateInitialReviewAt(item.createdAt, intervalMs);
        await deps.coreClient.updateKnowledgeItem(item.id, {
          nextReviewAt,
          updatedAt: Date.now(),
        });
      }

      return { count: itemsNeedingSchedule.length };
    } catch (error) {
      deps.logger?.error('Failed to batch initialize review schedules', { error });
      return { count: 0, error: toAppError(error) };
    }
  };
}

// Re-export from adjustIntervalFromFeedback
export {
  calculateCurrentInterval,
  clampInterval,
  calculateAdjustedInterval,
  calculateNextReviewFromFeedback as calculateNextReviewFromFeedbackImpl,
  MIN_INTERVAL_MS,
  MAX_INTERVAL_MS,
  DEFAULT_INITIAL_INTERVAL_MS as DEFAULT_INTERVAL_MS,
  type ReviewFeedbackType,
} from './adjustIntervalFromFeedback';
