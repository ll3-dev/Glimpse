import type {
  KnowledgeItem,
  Recommendation,
  FeedbackEvent,
  CalculateTagOverlapInput,
} from '@glimpse/shared';
import type {
  AppError,
  GeneratedRecommendation,
  RecommendationWithItems,
} from './types';

export function toAppError(error: unknown, code: string = 'RECOMMENDATION_ERROR'): AppError {
  return {
    code,
    message: error instanceof Error ? error.message : String(error),
  };
}

export function countSharedTags(left: KnowledgeItem, right: KnowledgeItem): number {
  const leftTags = new Set(left.tags ?? []);
  const rightTags = new Set(right.tags ?? []);

  let overlap = 0;
  for (const tag of leftTags) {
    if (rightTags.has(tag)) {
      overlap += 1;
    }
  }
  return overlap;
}

export function buildRecommendationReason(overlap: number): string {
  return `Shared ${overlap} tag(s)`;
}

export function buildRecommendationRecord(
  recommendation: GeneratedRecommendation,
  id: string,
  now: number
): Recommendation {
  return {
    id,
    itemA_id: recommendation.itemAId,
    itemB_id: recommendation.itemBId,
    reason: recommendation.reason,
    status: 'pending',
    createdAt: now,
    respondedAt: null,
  };
}

export function buildFeedbackEvent(
  recommendationId: string,
  action: FeedbackEvent['action'],
  id: string,
  createdAt: number
): FeedbackEvent {
  return {
    id,
    recommendationId,
    action,
    createdAt,
  };
}

export function buildLogFeedbackEvent(
  event: Omit<FeedbackEvent, 'id' | 'createdAt'>,
  id: string,
  createdAt: number
): FeedbackEvent {
  return {
    ...event,
    id,
    createdAt,
  };
}

export function collectPendingRecommendationItemIds(recommendations: Recommendation[]): string[] {
  const itemIds = new Set<string>();
  recommendations.forEach((recommendation) => {
    itemIds.add(recommendation.itemA_id);
    itemIds.add(recommendation.itemB_id);
  });
  return Array.from(itemIds);
}

export function joinRecommendationsWithItems(
  recommendations: Recommendation[],
  items: KnowledgeItem[]
): RecommendationWithItems[] {
  const itemMap = new Map(items.map((item) => [item.id, item]));
  const joined: RecommendationWithItems[] = [];

  for (const recommendation of recommendations) {
    const itemA = itemMap.get(recommendation.itemA_id);
    const itemB = itemMap.get(recommendation.itemB_id);
    if (itemA && itemB) {
      joined.push({ recommendation, itemA, itemB });
    }
  }

  return joined;
}

export function toTagOverlapInput(
  left: KnowledgeItem,
  right: KnowledgeItem
): CalculateTagOverlapInput {
  return {
    left: { tags: left.tags },
    right: { tags: right.tags },
  };
}
