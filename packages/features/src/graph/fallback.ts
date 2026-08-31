import type {
  GraphAnalysisRecord,
  KnowledgeItem,
  Recommendation,
} from '@glimpse/shared';
import type { ProposedGraphEdge } from './types';
import { graphPairKey, normalizeGraphPair } from './pair';

export function proposeGraphEdgesByTagOverlap(
  targets: KnowledgeItem[],
  pool: KnowledgeItem[],
  existing: Recommendation[],
  limit = 16,
): ProposedGraphEdge[] {
  const blockedPairs = new Set(
    existing.map((edge) => graphPairKey(edge.itemA_id, edge.itemB_id)),
  );
  const proposals: Array<ProposedGraphEdge & { overlap: number; order: number }> = [];
  const candidates = pool.length > 0 ? pool : targets;
  const withinTargets = pool.length === 0;

  for (let leftIndex = 0; leftIndex < targets.length; leftIndex += 1) {
    const left = targets[leftIndex];
    const partnerStart = withinTargets ? leftIndex + 1 : 0;
    for (let rightIndex = partnerStart; rightIndex < candidates.length; rightIndex += 1) {
      const right = candidates[rightIndex];
      if (left.id === right.id) continue;
      const pair = normalizeGraphPair(left.id, right.id);
      const key = graphPairKey(pair[0], pair[1]);
      if (blockedPairs.has(key)) continue;
      const rightTags = new Set(right.tags ?? []);
      const sharedTags = (left.tags ?? []).filter((tag) => rightTags.has(tag));
      if (sharedTags.length === 0) continue;
      blockedPairs.add(key);
      proposals.push({
        itemAId: pair[0],
        itemBId: pair[1],
        reason: `공통 태그: ${sharedTags.slice(0, 3).join(', ')}`,
        overlap: sharedTags.length,
        order: proposals.length,
      });
    }
  }

  return proposals
    .sort((left, right) => right.overlap - left.overlap || left.order - right.order)
    .slice(0, Math.max(0, limit))
    .map(({ itemAId, itemBId, reason }) => ({ itemAId, itemBId, reason }));
}

export function materializeGraphRecommendations(
  proposed: ProposedGraphEdge[],
  existing: Recommendation[],
  allItems: KnowledgeItem[],
  deps: { now: number; createId: () => string; limit?: number },
): Recommendation[] {
  const validIds = new Set(allItems.map((item) => item.id));
  const occupiedPairs = new Set(
    existing.map((edge) => graphPairKey(edge.itemA_id, edge.itemB_id)),
  );
  const recommendations: Recommendation[] = [];
  const limit = deps.limit ?? 16;

  for (const proposal of proposed) {
    if (
      proposal.itemAId === proposal.itemBId ||
      !validIds.has(proposal.itemAId) ||
      !validIds.has(proposal.itemBId)
    ) continue;
    const pair = normalizeGraphPair(proposal.itemAId, proposal.itemBId);
    const key = graphPairKey(pair[0], pair[1]);
    if (occupiedPairs.has(key)) continue;
    occupiedPairs.add(key);
    recommendations.push({
      id: deps.createId(),
      itemA_id: pair[0],
      itemB_id: pair[1],
      reason: proposal.reason.slice(0, 300),
      status: 'pending',
      createdAt: deps.now + recommendations.length,
      respondedAt: null,
    });
    if (recommendations.length >= limit) break;
  }
  return recommendations;
}

export function buildCompletedGraphAnalysisRecords(
  items: KnowledgeItem[],
  recommendations: Recommendation[],
  analyzedAt: number,
  analyzerVersion: string,
): GraphAnalysisRecord[] {
  return items.map((item) => ({
    itemId: item.id,
    itemUpdatedAt: item.updatedAt,
    analyzerVersion,
    analyzedAt,
    edgeCount: recommendations.filter(
      (edge) => edge.itemA_id === item.id || edge.itemB_id === item.id,
    ).length,
    status: 'completed',
    failureCount: 0,
  }));
}

export function buildFailedGraphAnalysisRecords(
  items: KnowledgeItem[],
  previous: GraphAnalysisRecord[],
  analyzedAt: number,
  analyzerVersion: string,
): GraphAnalysisRecord[] {
  const previousByItem = new Map(previous.map((record) => [record.itemId, record]));
  return items.map((item) => ({
    itemId: item.id,
    itemUpdatedAt: item.updatedAt,
    analyzerVersion,
    analyzedAt,
    edgeCount: 0,
    status: 'failed',
    failureCount: (previousByItem.get(item.id)?.failureCount ?? 0) + 1,
  }));
}
