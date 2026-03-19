import type { KnowledgeItem } from '@/src/db';
import { mobileCoreClient } from '@/src/features/core';

export function calculateTagOverlap(a: KnowledgeItem, b: KnowledgeItem): number {
  return mobileCoreClient.calculateTagOverlap({
    left: { tags: a.tags },
    right: { tags: b.tags },
  });
}
