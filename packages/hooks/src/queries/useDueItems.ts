import { useQuery } from '@tanstack/react-query';
import type { KnowledgeItem } from '@glimpse/shared';
import { useCoreClient } from '../core-client-context';
import { queryKeys } from '../query-keys';

/**
 * The deck shows one card at a time, so the default bounds the fetch —
 * without it the query streams the whole due set (everything with
 * next_review_at in the past or never scheduled) over IPC and re-fetches
 * it after every reviewed/forgotten/postponed action. The key includes the
 * limit so callers with an explicit limit read their own cache slot.
 */
const DEFAULT_DUE_ITEMS_LIMIT = 20;

export function useDueItemsQuery(limit?: number) {
  const coreClient = useCoreClient();
  const effectiveLimit = limit ?? DEFAULT_DUE_ITEMS_LIMIT;
  return useQuery({
    queryKey: [...queryKeys.review.dueItems, { limit: effectiveLimit }] as const,
    queryFn: () =>
      coreClient.getDueKnowledgeItems({ now: Date.now(), limit: effectiveLimit }),
  });
}
