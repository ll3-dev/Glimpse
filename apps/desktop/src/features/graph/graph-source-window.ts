import type { KnowledgeItem } from '@glimpse/shared';

/** Only the newest MAX_ITEMS feed the graph — must match the generator's input window. */
export const GRAPH_INPUT_ITEMS = 24;

/**
 * The exact slice generate-knowledge-graph consumes: newest items by
 * updatedAt, capped at GRAPH_INPUT_ITEMS.
 */
export function selectGraphSourceWindow(items: KnowledgeItem[]): KnowledgeItem[] {
  return [...items]
    .sort((left, right) => right.updatedAt - left.updatedAt)
    .slice(0, GRAPH_INPUT_ITEMS);
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
