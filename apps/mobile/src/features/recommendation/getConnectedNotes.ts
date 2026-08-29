import type { KnowledgeItem, Recommendation } from '@glimpse/shared';

export interface ConnectedNote {
  item: KnowledgeItem;
  /** LLM 관계 설명 (없으면 null — UI는 공통 태그만 표시) */
  reason: string | null;
  /** 두 아이템이 공유하는 태그 */
  sharedTags: string[];
}

/**
 * Read-side lookup for the mobile "연결된 노트" section: the counterpart
 * items of every edge touching itemId, with the edge reason and shared
 * tags. Dangling edges (counterpart hard-deleted) are skipped — deletion
 * cleanup is consumer-side filtering per the 2026-08-30 decision.
 */
export function connectedNotesForItem(
  itemId: string,
  edges: Recommendation[],
  items: KnowledgeItem[],
): ConnectedNote[] {
  const itemById = new Map(items.map((item) => [item.id, item]));
  const notes: ConnectedNote[] = [];
  const seen = new Set<string>();
  for (const edge of edges) {
    const counterpartId =
      edge.itemA_id === itemId ? edge.itemB_id : edge.itemB_id === itemId ? edge.itemA_id : null;
    if (!counterpartId || counterpartId === itemId || seen.has(counterpartId)) continue;
    const counterpart = itemById.get(counterpartId);
    if (!counterpart) continue;
    seen.add(counterpartId);
    const ownTags = new Set(itemById.get(itemId)?.tags ?? []);
    const sharedTags = (counterpart.tags ?? []).filter((tag) => ownTags.has(tag));
    notes.push({ item: counterpart, reason: edge.reason, sharedTags });
  }
  return notes;
}
