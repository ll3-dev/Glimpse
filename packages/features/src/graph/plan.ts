import type { GraphAnalysisRecord, KnowledgeItem } from '@glimpse/shared';
import { backoffRetryAfterMs } from '@glimpse/shared';
import type { LivingGraphCyclePlan } from './types';

export const LIVING_GRAPH_ANALYZER_VERSION = 'living-graph-v1';
export const DEFAULT_GRAPH_BATCH_LIMIT = 8;
export const MAX_GRAPH_FAILURES = 3;

export function planLivingGraphCycle(
  items: KnowledgeItem[],
  records: GraphAnalysisRecord[],
  options: {
    now: number;
    analyzerVersion?: string;
    batchLimit?: number;
    maxFailures?: number;
  },
): LivingGraphCyclePlan {
  const analyzerVersion = options.analyzerVersion ?? LIVING_GRAPH_ANALYZER_VERSION;
  const batchLimit = options.batchLimit ?? DEFAULT_GRAPH_BATCH_LIMIT;
  const maxFailures = options.maxFailures ?? MAX_GRAPH_FAILURES;
  const recordsByItem = new Map(records.map((record) => [record.itemId, record]));
  const actionable: KnowledgeItem[] = [];
  const analyzedPool: KnowledgeItem[] = [];
  let deferredTotal = 0;

  for (const item of items) {
    const record = recordsByItem.get(item.id);
    if (
      !record ||
      record.itemUpdatedAt !== item.updatedAt ||
      record.analyzerVersion !== analyzerVersion
    ) {
      actionable.push(item);
      continue;
    }
    if (record.status === 'completed') {
      analyzedPool.push(item);
      continue;
    }
    if (
      record.failureCount < maxFailures &&
      options.now >= backoffRetryAfterMs(record.failureCount, record.analyzedAt)
    ) {
      actionable.push(item);
    } else {
      deferredTotal += 1;
    }
  }

  const sortItems = (left: KnowledgeItem, right: KnowledgeItem) =>
    right.updatedAt - left.updatedAt || left.id.localeCompare(right.id);
  actionable.sort(sortItems);
  analyzedPool.sort(sortItems);
  const toAnalyze = actionable.slice(0, Math.max(0, batchLimit));
  return {
    toAnalyze,
    analyzedPool,
    backlogTotal: actionable.length,
    remainingBacklog: Math.max(0, actionable.length - toAnalyze.length),
    deferredTotal,
    skippedCount: analyzedPool.length,
  };
}
