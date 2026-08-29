import type { KnowledgeItem } from '@glimpse/shared';

/** Shared-tag similarity: |A∩B| (Jaccard 불필요 — 정렬만 목적). */
function tagOverlap(left: KnowledgeItem, right: KnowledgeItem): number {
  const rightTags = new Set(right.tags ?? []);
  return (left.tags ?? []).filter((tag) => rightTags.has(tag)).length;
}

/**
 * Re-verification candidates for a newly analyzed item: analyzed items
 * ranked by shared-tag overlap, capped at K (design default 20).
 * O(n) per incoming item — tag set membership, no embeddings needed here;
 * embedding-based ranking can replace the scorer later without changing
 * the contract.
 */
export function selectRecheckCandidates(
  incoming: KnowledgeItem,
  analyzedPool: KnowledgeItem[],
  limit: number,
): KnowledgeItem[] {
  const self = incoming.id;
  return analyzedPool
    .filter((item) => item.id !== self)
    .map((item) => ({ item, overlap: tagOverlap(incoming, item) }))
    .filter(({ overlap }) => overlap > 0)
    .sort((left, right) => right.overlap - left.overlap)
    .slice(0, limit)
    .map(({ item }) => item);
}
