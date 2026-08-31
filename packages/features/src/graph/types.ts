import type { KnowledgeItem } from '@glimpse/shared';

export interface ProposedGraphEdge {
  itemAId: string;
  itemBId: string;
  reason: string;
}

export interface LivingGraphCyclePlan {
  toAnalyze: KnowledgeItem[];
  analyzedPool: KnowledgeItem[];
  backlogTotal: number;
  remainingBacklog: number;
  deferredTotal: number;
  skippedCount: number;
}
