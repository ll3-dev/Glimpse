import type { KnowledgeItem } from '@glimpse/shared';

/** Only the newest MAX_ITEMS feed the graph — must match the generator's input window. */
export const GRAPH_INPUT_ITEMS = 24;

/**
 * The exact slice generate-knowledge-graph consumes: newest items by
 * updatedAt, capped at GRAPH_INPUT_ITEMS.
 *
 * Full sort is O(n log n) over every item; only the top GRAPH_INPUT_ITEMS
 * matter, so a bounded selection (single pass keeping the newest N) keeps
 * this O(n) — it runs on every items-array identity change.
 */
export function selectGraphSourceWindow(items: KnowledgeItem[]): KnowledgeItem[] {
  if (items.length <= GRAPH_INPUT_ITEMS) {
    return [...items].sort((left, right) => right.updatedAt - left.updatedAt);
  }
  const window: KnowledgeItem[] = [];
  let worstUpdatedAt = Infinity;
  let worstIndex = -1;
  for (const item of items) {
    if (window.length < GRAPH_INPUT_ITEMS) {
      window.push(item);
      if (item.updatedAt < worstUpdatedAt) {
        worstUpdatedAt = item.updatedAt;
        worstIndex = window.length - 1;
      }
      continue;
    }
    if (item.updatedAt > worstUpdatedAt) {
      window[worstIndex] = item;
      // Recompute the worst slot in the (small) window.
      worstUpdatedAt = Infinity;
      worstIndex = -1;
      window.forEach((candidate, index) => {
        if (candidate.updatedAt < worstUpdatedAt) {
          worstUpdatedAt = candidate.updatedAt;
          worstIndex = index;
        }
      });
    }
  }
  return window.sort((left, right) => right.updatedAt - left.updatedAt);
}

/**
 * Digest of the graph source window. The hook compares this against its
 * stored value so only edits inside the window trigger regeneration;
 * keeping it a pure function keeps that contract unit-testable.
 */
export function computeGraphSourceDigest(items: KnowledgeItem[]): string {
  const windowed = selectGraphSourceWindow(items);
  return windowed
    .map((item) => `${item.id}:${item.updatedAt}`)
    .sort()
    .join('|');
}
