/**
 * Semantic (embedding-based) search ranking.
 *
 * Pure math over caller-supplied vectors: no runtime coupling, so mobile and
 * desktop can feed vectors from whichever embedding backend they have while
 * sharing identical ranking semantics. Items without embeddings pass through
 * at neutral relevance so keyword matches are never lost.
 */

import type { KnowledgeItem } from '@glimpse/shared';

/** Cosine similarity for unit-normalizable vectors; 0 when undefined. */
export function cosineSimilarity(
  left: readonly number[],
  right: readonly number[],
): number {
  if (left.length === 0 || left.length !== right.length) return 0;
  let dot = 0;
  let leftNorm = 0;
  let rightNorm = 0;
  for (let i = 0; i < left.length; i += 1) {
    dot += left[i] * right[i];
    leftNorm += left[i] * left[i];
    rightNorm += right[i] * right[i];
  }
  const denominator = Math.sqrt(leftNorm) * Math.sqrt(rightNorm);
  return denominator === 0 ? 0 : dot / denominator;
}

export interface SemanticRankInput {
  queryEmbedding: readonly number[];
  /** Item vectors by id; missing entries rank neutrally after keyword order. */
  itemEmbeddings: ReadonlyMap<string, readonly number[]>;
}

export interface RankedItem {
  item: KnowledgeItem;
  score: number;
}

/**
 * Re-ranks keyword-filtered items by semantic similarity, preserving the
 * caller's order as the tie-break. Items lacking vectors keep relative order
 * at the tail.
 */
export function rankBySemanticSimilarity(
  items: KnowledgeItem[],
  input: SemanticRankInput,
): RankedItem[] {
  if (input.queryEmbedding.length === 0) {
    return items.map((item) => ({ item, score: 0 }));
  }

  const ranked = items.map((item, index) => {
    const vector = input.itemEmbeddings.get(item.id);
    const score = vector ? cosineSimilarity(input.queryEmbedding, vector) : -1;
    return { item, score, index };
  });

  ranked.sort((left, right) => {
    if (left.score !== right.score) return right.score - left.score;
    return left.index - right.index;
  });

  return ranked.map(({ item, score }) => ({ item, score }));
}
