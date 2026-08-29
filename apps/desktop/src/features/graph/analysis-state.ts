import type { KnowledgeItem, Recommendation } from '@glimpse/shared';

export type ItemAnalysisState = 'unanalyzed' | 'analyzed' | 'stale';

/**
 * Per-item graph analysis state derived from existing edges.
 * An item's "analyzed watermark" is the newest edge createdAt among its
 * edges — no extra storage column needed (design: 2026-08-30).
 */
export function classifyItem(
  item: KnowledgeItem,
  itemEdges: Recommendation[],
): ItemAnalysisState {
  if (itemEdges.length === 0) return 'unanalyzed';
  const analyzedAt = Math.max(...itemEdges.map((edge) => edge.createdAt));
  return item.updatedAt > analyzedAt ? 'stale' : 'analyzed';
}

/** Group edges by item id — helper for batch classification. */
export function groupEdgesByItem(edges: Recommendation[]): Map<string, Recommendation[]> {
  const map = new Map<string, Recommendation[]>();
  for (const edge of edges) {
    for (const itemId of [edge.itemA_id, edge.itemB_id]) {
      const bucket = map.get(itemId);
      if (bucket) bucket.push(edge);
      else map.set(itemId, [edge]);
    }
  }
  return map;
}
