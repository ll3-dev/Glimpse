// apps/mobile/src/features/library/getAllKnowledgeItems.ts
import type { KnowledgeItem } from '@glimpse/shared';
import { Effect } from 'effect';
import { appError, type AppError } from '@/src/lib/effect-result';
import { mobileCoreClient } from '@/src/features/core';

export interface GetItemsSuccessResult {
  success: true;
  items: KnowledgeItem[];
}

export interface GetItemsFailureResult {
  success: false;
  error: Error;
}

export type GetItemsResult = GetItemsSuccessResult | GetItemsFailureResult;

export interface GetAllKnowledgeItemsDeps {
  coreClient: {
    listKnowledgeItems: () => Promise<KnowledgeItem[]>;
  };
}

export function createGetAllKnowledgeItems(deps: GetAllKnowledgeItemsDeps) {
  return async (): Promise<GetItemsResult> => {
    try {
      const items = await deps.coreClient.listKnowledgeItems();
      return {
        success: true,
        items,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  };
}

// ============================================================================
// Effect-based Get All Knowledge Items
// ============================================================================

/**
 * Create an Effect-based version of getAllKnowledgeItems
 */
export function createGetAllKnowledgeItemsEffect(deps: GetAllKnowledgeItemsDeps) {
  return (): Effect.Effect<KnowledgeItem[], AppError> =>
    Effect.tryPromise({
      try: () => deps.coreClient.listKnowledgeItems(),
      catch: (e) => appError('DATABASE_ERROR', 'Failed to list knowledge items', { cause: e }),
    });
}

const defaultDeps: GetAllKnowledgeItemsDeps = {
  coreClient: mobileCoreClient,
};

export const getAllKnowledgeItems = createGetAllKnowledgeItems(defaultDeps);
export const getAllKnowledgeItemsEffect = createGetAllKnowledgeItemsEffect(defaultDeps);
