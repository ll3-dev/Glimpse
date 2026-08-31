import { calculateTagOverlap as calculateTagOverlapWithCore } from '@glimpse/features';
import type { KnowledgeItem } from '@glimpse/shared';
import { mobileCoreClient } from '@/src/features/core';

export function calculateTagOverlap(a: KnowledgeItem, b: KnowledgeItem): Promise<number> {
  return calculateTagOverlapWithCore(mobileCoreClient, a, b);
}
