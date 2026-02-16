import type { KnowledgeItem } from '@/src/db';

export function calculateTagOverlap(a: KnowledgeItem, b: KnowledgeItem): number {
  const tagsA = new Set(a.tags || []);
  const tagsB = new Set(b.tags || []);

  let overlap = 0;
  for (const tag of tagsA) {
    if (tagsB.has(tag)) {
      overlap += 1;
    }
  }

  return overlap;
}
