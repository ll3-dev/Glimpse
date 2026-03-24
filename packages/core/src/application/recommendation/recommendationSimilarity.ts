import type { KnowledgeItem } from '@glimpse/shared';
import type { CoreClient } from '../../ports/core-client';

export function calculateTagOverlap(
  coreClient: Pick<CoreClient, 'calculateTagOverlap'>,
  a: KnowledgeItem,
  b: KnowledgeItem
): number {
  return coreClient.calculateTagOverlap({
    left: { tags: a.tags },
    right: { tags: b.tags },
  });
}
