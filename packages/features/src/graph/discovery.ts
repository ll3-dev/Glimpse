import type { KnowledgeItem, Recommendation } from '@glimpse/shared';

export interface GraphDiscovery {
  recommendation: Recommendation;
  itemA: KnowledgeItem;
  itemB: KnowledgeItem;
  kind: 'new' | 'recent';
}

function hasReason(recommendation: Recommendation): number {
  return recommendation.reason?.trim() ? 1 : 0;
}

function byPendingPriority(left: Recommendation, right: Recommendation): number {
  return (
    hasReason(right) - hasReason(left) ||
    right.createdAt - left.createdAt ||
    left.id.localeCompare(right.id)
  );
}

function byAcceptedRecency(left: Recommendation, right: Recommendation): number {
  const leftActivity = left.respondedAt ?? left.createdAt;
  const rightActivity = right.respondedAt ?? right.createdAt;
  return rightActivity - leftActivity || left.id.localeCompare(right.id);
}

export function selectTodayDiscoveries(
  items: KnowledgeItem[],
  recommendations: Recommendation[],
  limit = 3,
): GraphDiscovery[] {
  if (limit <= 0) return [];

  const itemMap = new Map(items.map((item) => [item.id, item]));
  const valid = recommendations.filter(
    ({ itemA_id, itemB_id }) => itemMap.has(itemA_id) && itemMap.has(itemB_id),
  );
  const pending = valid.filter(({ status }) => status === 'pending').sort(byPendingPriority);
  const candidates = pending.length > 0
    ? pending
    : valid.filter(({ status }) => status === 'accepted').sort(byAcceptedRecency);
  const kind: GraphDiscovery['kind'] = pending.length > 0 ? 'new' : 'recent';

  return candidates.slice(0, limit).map((recommendation) => ({
    recommendation,
    itemA: itemMap.get(recommendation.itemA_id)!,
    itemB: itemMap.get(recommendation.itemB_id)!,
    kind,
  }));
}
