import { mobileCoreClient, type MobileCoreClient } from '@/src/features/core';
import { appError, isFailure, runEffectSuccess, type AppError, tryPromise } from '@/src/lib/effect-result';
import { Effect } from 'effect';
import { deriveRuleBasedLabels } from './rule-based-labeler';
import type { LabelingJobRunResult } from './types';
import type { KnowledgeItem } from '@glimpse/shared';

export interface RunForegroundLabelingDeps {
  coreClient: Pick<
    MobileCoreClient,
    'listPendingKnowledgeItemsForLabeling' | 'updateKnowledgeItem'
  >;
  now?: () => number;
}

const defaultDeps: RunForegroundLabelingDeps = {
  coreClient: mobileCoreClient,
};

export function createRunForegroundLabeling(deps: RunForegroundLabelingDeps = defaultDeps) {
  return async function runForegroundLabeling(limit: number = 1): Promise<LabelingJobRunResult> {
    const now = deps.now ?? Date.now;

    const program = Effect.gen(function* () {
      const pendingItems = (yield* tryPromise(
        () => deps.coreClient.listPendingKnowledgeItemsForLabeling(limit),
        (error): AppError =>
          appError('DATABASE_ERROR', 'Failed to load knowledge items for labeling', error)
      )) as KnowledgeItem[];

      if (pendingItems.length === 0) {
        return {
          success: true as const,
          data: {
            processedCount: 0,
            items: [],
          },
        };
      }

      const completedItems: KnowledgeItem[] = [];

      for (const item of pendingItems) {
        const result = deriveRuleBasedLabels(item);
        const completedAt = now();

        const updatedItem = (yield* tryPromise(
          () =>
            deps.coreClient.updateKnowledgeItem(item.id, {
              provisionalLabels: result.labels,
              labelStatus: 'provisional',
              labelSource: result.source,
              labelVersion: result.version,
              labelScore: result.score,
              labelCompletedAt: completedAt,
              labelError: null,
              updatedAt: completedAt,
            }),
          (error): AppError =>
            appError('DATABASE_ERROR', 'Failed to persist provisional labels', {
              itemId: item.id,
              error,
            })
        )) as KnowledgeItem;

        completedItems.push(updatedItem);
      }

      return {
        success: true as const,
        data: {
          processedCount: completedItems.length,
          items: completedItems,
        },
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

export const runForegroundLabeling = createRunForegroundLabeling();
