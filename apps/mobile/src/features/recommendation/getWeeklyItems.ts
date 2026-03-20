/**
 * Get Weekly Items Use Case
 *
 * Retrieves knowledge items from the last 7 days for digest recommendations.
 */

import { Effect } from 'effect';
import { mobileCoreClient, type MobileCoreClient } from '@/src/features/core';
import {
  appError,
  type FailureResult,
  type Result,
  runEffectResult,
} from '@/src/lib/effect-result';
import type { KnowledgeItem } from '@glimpse/shared';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export type WeeklyItemsSuccessResult = { success: true; data: KnowledgeItem[] };
export type WeeklyItemsFailureResult = FailureResult;
export type WeeklyItemsResult = Result<KnowledgeItem[]>;

export interface GetWeeklyItemsDeps {
  coreClient: Pick<MobileCoreClient, 'listWeeklyKnowledgeItems'>;
}

const defaultDeps: GetWeeklyItemsDeps = {
  coreClient: mobileCoreClient,
};

/**
 * Retrieves knowledge items created in the last 7 days.
 * Returns items ordered by creation date (newest first).
 */
export function createGetWeeklyItems(deps: GetWeeklyItemsDeps = defaultDeps) {
  return async function getWeeklyItems(): Promise<WeeklyItemsResult> {
    const sevenDaysAgo = Date.now() - SEVEN_DAYS_MS;
    const queryEffect = Effect.tryPromise({
      try: () => deps.coreClient.listWeeklyKnowledgeItems(sevenDaysAgo),
      catch: (error) => appError('DATABASE_ERROR', 'Failed to retrieve weekly items', error),
    });

    return runEffectResult(queryEffect.pipe(Effect.map((items) => items as KnowledgeItem[])));
  };
}

export const getWeeklyItems = createGetWeeklyItems();
