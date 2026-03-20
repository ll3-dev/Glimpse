import type { KnowledgeItem } from '@glimpse/shared';
import { mobileCoreClient } from '@/src/features/core';

export function calculateTagOverlap(a: KnowledgeItem, b: KnowledgeItem): number {
  return mobileCoreClient.calculateTagOverlap({
    left: { tags: a.tags },
    right: { tags: b.tags },
  });
}
