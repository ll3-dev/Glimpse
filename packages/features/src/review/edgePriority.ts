import type { KnowledgeItem, Recommendation } from '@glimpse/shared';

/**
 * Edge-count review priority — a pure post-sort over the SQL
 * `ORDER BY next_review_at ASC` result. Hub items (many graph edges)
 * surface earlier among same-time reviews; with no edges the order is
 * byte-identical to the input, so users without a graph see no change.
 */

export const EDGE_PRIORITY_WEIGHT = 0.001;
export const EDGE_PRIORITY_CAP = 5;

/** itemA_id/itemB_id 양쪽을 세는 아이템별 엣지 수. */
export function countEdges(edges: Recommendation[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const edge of edges) {
    counts.set(edge.itemA_id, (counts.get(edge.itemA_id) ?? 0) + 1);
    counts.set(edge.itemB_id, (counts.get(edge.itemB_id) ?? 0) + 1);
  }
  return counts;
}

export interface EdgePriorityOptions {
  weight?: number;
  cap?: number;
}

export function sortDueItemsByEdgePriority(
  items: KnowledgeItem[],
  edges: Recommendation[],
  options: EdgePriorityOptions = {},
): KnowledgeItem[] {
  const weight = options.weight ?? EDGE_PRIORITY_WEIGHT;
  const cap = options.cap ?? EDGE_PRIORITY_CAP;
  const counts = countEdges(edges);

  const decorated = items.map((item, index) => ({
    item,
    index,
    // 시각은 1차 키(오름차순), 연결도는 2차 키 — SQL 정렬 의미 보존.
    timeKey: item.nextReviewAt ?? Number.NEGATIVE_INFINITY,
    boost: weight * Math.min(counts.get(item.id) ?? 0, cap),
  }));

  decorated.sort((left, right) => {
    if (left.timeKey !== right.timeKey) return left.timeKey - right.timeKey;
    if (left.boost !== right.boost) return right.boost - left.boost;
    return left.index - right.index;
  });

  return decorated.map((entry) => entry.item);
}
