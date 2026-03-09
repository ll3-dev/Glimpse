import { asc, eq } from 'drizzle-orm';
import { db, knowledgeItems, type KnowledgeItem } from '@/src/db';
import { appError, isFailure, runEffectSuccess, type AppError, tryPromise } from '@/src/lib/effect-result';
import { Effect } from 'effect';
import { deriveRuleBasedLabels } from './rule-based-labeler';
import type { LabelingJobRunResult } from './types';

export interface RunForegroundLabelingDeps {
  db: typeof db;
  knowledgeItems: typeof knowledgeItems;
  eq: typeof eq;
  asc: typeof asc;
  now?: () => number;
}

const defaultDeps: RunForegroundLabelingDeps = {
  db,
  knowledgeItems,
  eq,
  asc,
};

export function createRunForegroundLabeling(deps: RunForegroundLabelingDeps = defaultDeps) {
  return async function runForegroundLabeling(limit: number = 1): Promise<LabelingJobRunResult> {
    const now = deps.now ?? Date.now;

    const program = Effect.gen(function* () {
      const allItems = (yield* tryPromise(
        () =>
          deps.db
            .select()
            .from(deps.knowledgeItems)
            .orderBy(deps.asc(deps.knowledgeItems.labelRequestedAt)),
        (error): AppError =>
          appError('DATABASE_ERROR', 'Failed to load knowledge items for labeling', error)
      )) as KnowledgeItem[];

      const pendingItems = allItems
        .filter((item) => item.labelStatus === 'pending')
        .slice(0, Math.max(0, limit));

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

        const updatedRows = (yield* tryPromise(
          () =>
            deps.db
              .update(deps.knowledgeItems)
              .set({
                provisionalLabels: result.labels,
                labelStatus: 'provisional',
                labelSource: result.source,
                labelVersion: result.version,
                labelScore: result.score,
                labelCompletedAt: completedAt,
                labelError: null,
                updatedAt: completedAt,
              })
              .where(deps.eq(deps.knowledgeItems.id, item.id))
              .returning(),
          (error): AppError =>
            appError('DATABASE_ERROR', 'Failed to persist provisional labels', {
              itemId: item.id,
              error,
            })
        )) as KnowledgeItem[];

        if (updatedRows[0]) {
          completedItems.push(updatedRows[0]);
        }
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
