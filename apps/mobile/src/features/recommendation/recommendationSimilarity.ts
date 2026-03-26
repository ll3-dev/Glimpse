import { calculateTagOverlap as calculateTagOverlapWithCore } from '@/src/features/core/application/recommendation';
import type { KnowledgeItem } from '@glimpse/shared';
import { mobileCoreClient } from '@/src/features/core';

export function calculateTagOverlap(a: KnowledgeItem, b: KnowledgeItem): number {
  return calculateTagOverlapWithCore(mobileCoreClient, a, b);
}
