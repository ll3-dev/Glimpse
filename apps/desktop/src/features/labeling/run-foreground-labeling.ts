import type { CoreClient, KnowledgeItem } from '@glimpse/shared';
import { deriveRuleBasedLabels } from './rule-based-labeler';
import type { LabelingJobRunResult } from './types';

export interface RunForegroundLabelingDeps {
  coreClient: Pick<CoreClient, 'listPendingKnowledgeItemsForLabeling' | 'updateKnowledgeItem'>;
  now?: () => number;
}

export function createRunForegroundLabeling(deps: RunForegroundLabelingDeps) {
  return async function runForegroundLabeling(limit: number = 2): Promise<LabelingJobRunResult> {
    const now = deps.now ?? Date.now;

    try {
      const pendingItems = await deps.coreClient.listPendingKnowledgeItemsForLabeling(limit);

      if (pendingItems.length === 0) {
        return {
          success: true,
          data: { processedCount: 0, items: [] },
        };
      }

      const completedItems: KnowledgeItem[] = [];

      for (const item of pendingItems) {
        const result = deriveRuleBasedLabels(item);
        const completedAt = now();

        const updatedItem = await deps.coreClient.updateKnowledgeItem(item.id, {
          provisionalLabels: result.labels,
          labelStatus: 'provisional',
          labelSource: result.source,
          labelVersion: result.version,
          labelScore: result.score,
          labelCompletedAt: completedAt,
          labelError: null,
          updatedAt: completedAt,
        });

        completedItems.push(updatedItem);
      }

      return {
        success: true,
        data: { processedCount: completedItems.length, items: completedItems },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  };
}
