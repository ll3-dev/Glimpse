import type { KnowledgeItem, Recommendation } from '@glimpse/shared';
import { classifyItem, groupEdgesByItem } from './analysis-state';

export const MAX_BATCH_PER_CYCLE = 8;
export const RECHECK_LIMIT = 20;

export interface IncrementalCyclePlan {
  /** LLM 분석 대상: 신규(unanalyzed) + stale, 배치 상한 적용, 최신 우선 */
  toAnalyze: KnowledgeItem[];
  /** 재검증 페어 생성을 위한 analyzed 풀 */
  analyzedPool: KnowledgeItem[];
}

/**
 * Incremental analysis plan for one graph generation cycle.
 *
 * An item's analysis watermark is the newest edge createdAt among its edges
 * (analysis-state.ts), so no extra storage is needed. Hard-deleted items
 * disappear from both lists by construction — deletion cleanup is handled
 * by the write-path skip in generate-knowledge-graph and consumer-side
 * filtering in the views (decision: 2026-08-30, no deleteRecommendation
 * bridge command this cycle).
 */
export function planIncrementalCycle(
  allItems: KnowledgeItem[],
  existingEdges: Recommendation[],
): IncrementalCyclePlan {
  const edgesByItem = groupEdgesByItem(existingEdges);
  const analyzed: KnowledgeItem[] = [];
  const backlog: KnowledgeItem[] = [];
  for (const item of allItems) {
    const state = classifyItem(item, edgesByItem.get(item.id) ?? []);
    if (state === 'analyzed') analyzed.push(item);
    else backlog.push(item);
  }
  // 최신 우선 처리 — 백로그가 쌓여도 최근 지식부터 그래프에 편입
  backlog.sort((left, right) => right.updatedAt - left.updatedAt);
  return {
    toAnalyze: backlog.slice(0, MAX_BATCH_PER_CYCLE),
    analyzedPool: analyzed,
  };
}
