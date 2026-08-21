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

      // allSettled — 한 아이템 실패가 이미 커밋된 다른 아이템의 성공을
      // 묻히게 하지 않는다. 실패 아이템은 best-effort 로 labelError 를
      // 기록한다.
      const results = await Promise.allSettled(
        pendingItems.map(async (item) => {
          const result = deriveRuleBasedLabels(item);
          const completedAt = now();

          return deps.coreClient.updateKnowledgeItem(item.id, {
            provisionalLabels: result.labels,
            labelStatus: 'provisional',
            labelSource: result.source,
            labelVersion: result.version,
            labelScore: result.score,
            labelCompletedAt: completedAt,
            labelError: null,
            updatedAt: completedAt,
          });
        }),
      );

      const completedItems: KnowledgeItem[] = [];
      const failureUpdates: Promise<unknown>[] = [];
      let failedCount = 0;

      for (const [index, result] of results.entries()) {
        if (result.status === 'fulfilled') {
          completedItems.push(result.value);
          continue;
        }

        failedCount += 1;
        const item = pendingItems[index];
        const message = result.reason instanceof Error ? result.reason.message : String(result.reason);
        // 실패 기록은 best-effort — 이 기록마저 실패해도 전체를
        // 실패시키지 않는다
        failureUpdates.push(
          deps.coreClient
            .updateKnowledgeItem(item.id, {
              labelStatus: 'failed',
              labelError: message,
              updatedAt: now(),
            })
            .catch(() => undefined),
        );
      }

      await Promise.all(failureUpdates);

      if (completedItems.length === 0 && failedCount > 0) {
        return {
          success: false,
          error: `모든 라벨링이 실패했습니다 (${failedCount}건)`,
        };
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
