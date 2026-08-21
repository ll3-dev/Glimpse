import type { GetDueKnowledgeItemsInput, KnowledgeItem } from '@glimpse/shared';

export interface AppError { code: string; message: string; }

export function toAppError(error: unknown, code = 'REVIEW_ERROR'): AppError {
  return { code, message: error instanceof Error ? error.message : String(error) };
}
export interface ReviewActionsDeps {
  coreClient: {
    getKnowledgeItemById: (itemId: string) => Promise<KnowledgeItem | null>;
    updateKnowledgeItem: (
      itemId: string,
      patch: Partial<Omit<KnowledgeItem, 'id' | 'createdAt'>>,
    ) => Promise<KnowledgeItem>;
  };
  logger?: { error: (message: string, meta?: unknown) => void };
  calculateNextReviewFromFeedback: (
    lastReviewedAt: number | null,
    nextReviewAt: number | null,
    feedbackType: 'remembered' | 'postponed',
    now: number,
  ) => { intervalMs: number; nextReviewAt: number };
}

export interface ReviewActionSuccessResult { success: true; item: KnowledgeItem; }
export interface ReviewActionFailureResult { success: false; error: AppError; itemId: string; }
export type ReviewActionResult = ReviewActionSuccessResult | ReviewActionFailureResult;

export interface GetDueItemsDeps {
  coreClient: { getDueKnowledgeItems: (input: GetDueKnowledgeItemsInput) => Promise<KnowledgeItem[]> };
  logger?: { error: (message: string, meta?: unknown) => void };
}
export interface GetDueItemsOptions { limit?: number; }
export interface GetDueItemsSuccessResult { success: true; items: KnowledgeItem[]; }
export interface GetDueItemsFailureResult { success: false; error: AppError; }
export type GetDueItemsResult = GetDueItemsSuccessResult | GetDueItemsFailureResult;

export interface BatchInitializeReviewSchedulesDeps {
  coreClient: {
    listKnowledgeItems: () => Promise<KnowledgeItem[]>;
    updateKnowledgeItem: (
      itemId: string,
      patch: Partial<Omit<KnowledgeItem, 'id' | 'createdAt'>>,
    ) => Promise<KnowledgeItem>;
  };
  logger?: { error: (message: string, meta?: unknown) => void };
}
