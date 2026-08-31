import type {
  FeedbackEvent,
  GraphAnalysisRecord,
  KnowledgeItem,
  Recommendation,
  RecommendationStatus,
} from '@glimpse/shared';
import { LIVING_GRAPH_ANALYZER_VERSION, planLivingGraphCycle } from './plan';

export interface LivingGraphQualityMetrics {
  analysis: {
    targetCount: number;
    completedCount: number;
    failedCount: number;
    backlogCount: number;
    actionableBacklogCount: number;
    deferredCount: number;
    reanalysisSkippedCount: number;
  };
  connections: {
    generatedCount: number;
    visibleCount: number;
    connectedItemCount: number;
    isolatedItemCount: number;
    statusCounts: Record<RecommendationStatus, number>;
    statusRatios: Record<RecommendationStatus, number>;
  };
  feedbackEventCount: number;
}

const STATUSES: RecommendationStatus[] = ['pending', 'accepted', 'ignored', 'dismissed'];
const VISIBLE_STATUSES = new Set<RecommendationStatus>(['pending', 'accepted']);

export function computeLivingGraphQualityMetrics(
  items: KnowledgeItem[],
  recommendations: Recommendation[],
  records: GraphAnalysisRecord[],
  feedbackEvents: FeedbackEvent[],
  options: { now: number; analyzerVersion?: string },
): LivingGraphQualityMetrics {
  const analyzerVersion = options.analyzerVersion ?? LIVING_GRAPH_ANALYZER_VERSION;
  const plan = planLivingGraphCycle(items, records, {
    now: options.now,
    analyzerVersion,
    batchLimit: Number.MAX_SAFE_INTEGER,
  });
  const itemIds = new Set(items.map(({ id }) => id));
  const recordsByItem = new Map(records.map((record) => [record.itemId, record]));
  const failedCount = items.reduce((total, item) => {
    const record = recordsByItem.get(item.id);
    return total + Number(
      record?.itemUpdatedAt === item.updatedAt &&
      record.analyzerVersion === analyzerVersion &&
      record.status === 'failed',
    );
  }, 0);
  const validRecommendations = recommendations.filter(
    ({ itemA_id: itemAId, itemB_id: itemBId }) => itemIds.has(itemAId) && itemIds.has(itemBId),
  );
  const statusCounts = Object.fromEntries(
    STATUSES.map((status) => [
      status,
      validRecommendations.filter((recommendation) => recommendation.status === status).length,
    ]),
  ) as Record<RecommendationStatus, number>;
  const ratioDenominator = validRecommendations.length;
  const statusRatios = Object.fromEntries(
    STATUSES.map((status) => [
      status,
      ratioDenominator === 0 ? 0 : statusCounts[status] / ratioDenominator,
    ]),
  ) as Record<RecommendationStatus, number>;
  const visibleRecommendations = validRecommendations.filter(({ status }) =>
    VISIBLE_STATUSES.has(status),
  );
  const connectedItemIds = new Set(
    visibleRecommendations.flatMap(({ itemA_id: itemAId, itemB_id: itemBId }) => [itemAId, itemBId]),
  );

  return {
    analysis: {
      targetCount: items.length,
      completedCount: plan.skippedCount,
      failedCount,
      backlogCount: plan.backlogTotal + plan.deferredTotal,
      actionableBacklogCount: plan.backlogTotal,
      deferredCount: plan.deferredTotal,
      reanalysisSkippedCount: plan.skippedCount,
    },
    connections: {
      generatedCount: validRecommendations.length,
      visibleCount: visibleRecommendations.length,
      connectedItemCount: connectedItemIds.size,
      isolatedItemCount: items.length - connectedItemIds.size,
      statusCounts,
      statusRatios,
    },
    feedbackEventCount: feedbackEvents.length,
  };
}
