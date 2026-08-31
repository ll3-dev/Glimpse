import type {
  GraphAnalysisCommitInput,
  GraphAnalysisCommitResult,
  GraphAnalysisRecord,
  KnowledgeItem,
  Recommendation,
} from '@glimpse/shared';
import {
  buildCompletedGraphAnalysisRecords,
  LIVING_GRAPH_ANALYZER_VERSION,
  materializeGraphRecommendations,
  planLivingGraphCycle,
  proposeGraphEdgesByTagOverlap,
  type GraphCycleMetricSample,
  type ProposedGraphEdge,
} from '@glimpse/features';
import { mobileCoreClient } from '@/src/features/core';
import { recordMobileGraphCycle } from '@/src/features/graph/graph-metrics.store';
import { logger } from '@/src/utils/logger';
import { proposeEdgesWithAI } from './proposeEdgesWithAI';

const MOBILE_GRAPH_BATCH_LIMIT = 4;
const MAX_NEW_EDGES = 8;

export interface RecommendationRefreshDeps {
  now: () => number;
  createId: () => string;
  batchLimit: number;
  listItems: () => Promise<KnowledgeItem[]>;
  listAnalysisRecords: () => Promise<GraphAnalysisRecord[]>;
  listRecommendations: () => Promise<Recommendation[]>;
  proposeEdges: (items: KnowledgeItem[]) => Promise<ProposedGraphEdge[]>;
  commitAnalysis: (input: GraphAnalysisCommitInput) => Promise<GraphAnalysisCommitResult>;
  measureNow?: () => number;
  recordCycle?: (sample: GraphCycleMetricSample) => void;
}

export type RecommendationRefreshResult =
  | {
      success: true;
      skipped: true;
      reason: 'no_dirty';
      createdCount: 0;
      processedCount: 0;
      remainingBacklog: 0;
    }
  | {
      success: true;
      skipped: false;
      createdCount: number;
      processedCount: number;
      generatedCount: number;
      remainingBacklog: number;
      source: 'mobile-ai' | 'tag-overlap';
    }
  | { success: false; error: { code: string; message: string } };

function getDefaultDeps(): RecommendationRefreshDeps {
  return {
    now: Date.now,
    createId: () => crypto.randomUUID(),
    batchLimit: MOBILE_GRAPH_BATCH_LIMIT,
    listItems: () => mobileCoreClient.listKnowledgeItems(),
    listAnalysisRecords: () => mobileCoreClient.listGraphAnalysisRecords(),
    listRecommendations: () => mobileCoreClient.listRecommendations(),
    proposeEdges: (items) => proposeEdgesWithAI(items),
    commitAnalysis: (input) => mobileCoreClient.commitGraphAnalysis(input),
    measureNow: () => performance.now(),
    recordCycle: recordMobileGraphCycle,
  };
}

export function createRefreshRecommendations(deps: RecommendationRefreshDeps) {
  return async (options: { force?: boolean } = {}): Promise<RecommendationRefreshResult> => {
    const startedAt = deps.measureNow?.();
    let recordedAt = 0;
    const finish = <T extends RecommendationRefreshResult>(
      result: T,
      skippedCount: number,
    ): T => {
      try {
        if (startedAt !== undefined && deps.measureNow && deps.recordCycle) {
          deps.recordCycle({
            succeeded: result.success,
            durationMs: deps.measureNow() - startedAt,
            processedCount: result.success ? result.processedCount : 0,
            skippedCount,
            recordedAt,
          });
        }
      } catch {
        // Diagnostics must not turn a recoverable refresh into a failure.
      }
      return result;
    };
    try {
      const now = deps.now();
      recordedAt = now;
      const [items, storedRecords, existing] = await Promise.all([
        deps.listItems(),
        deps.listAnalysisRecords(),
        deps.listRecommendations(),
      ]);
      const plan = planLivingGraphCycle(
        items,
        options.force ? [] : storedRecords,
        { now, batchLimit: deps.batchLimit },
      );
      if (plan.toAnalyze.length === 0) {
        return finish({
          success: true,
          skipped: true,
          reason: 'no_dirty',
          createdCount: 0,
          processedCount: 0,
          remainingBacklog: 0,
        }, plan.skippedCount);
      }

      const aiInput = [...plan.toAnalyze, ...plan.analyzedPool];
      let source: 'mobile-ai' | 'tag-overlap' = 'mobile-ai';
      let proposed = await deps.proposeEdges(aiInput);
      let additions = materializeGraphRecommendations(proposed, existing, items, {
        now,
        createId: deps.createId,
        limit: MAX_NEW_EDGES,
      });
      if (additions.length === 0) {
        source = 'tag-overlap';
        proposed = proposeGraphEdgesByTagOverlap(
          plan.toAnalyze,
          plan.analyzedPool,
          existing,
          MAX_NEW_EDGES,
        );
        additions = materializeGraphRecommendations(proposed, existing, items, {
          now,
          createId: deps.createId,
          limit: MAX_NEW_EDGES,
        });
      }

      const records = buildCompletedGraphAnalysisRecords(
        plan.toAnalyze,
        [...existing, ...additions],
        now,
        LIVING_GRAPH_ANALYZER_VERSION,
      );
      const committed = await deps.commitAnalysis({ records, recommendations: additions });
      return finish({
        success: true,
        skipped: false,
        createdCount: committed.savedRecommendations,
        processedCount: committed.savedAnalysisRecords,
        generatedCount: proposed.length,
        remainingBacklog: plan.remainingBacklog,
        source,
      }, plan.skippedCount);
    } catch (error) {
      return finish({
        success: false,
        error: {
          code: 'RECOMMENDATION_ERROR',
          message: error instanceof Error ? error.message : String(error),
        },
      }, 0);
    }
  };
}

let refreshPromise: Promise<RecommendationRefreshResult> | null = null;

export function refreshRecommendations(
  options: { force?: boolean } = {},
): Promise<RecommendationRefreshResult> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = createRefreshRecommendations(getDefaultDeps())(options)
    .then((result) => {
      if (result.success === false) {
        logger.warn('Living Graph refresh failed', result.error);
      } else if (result.skipped === false) {
        logger.info('Living Graph refresh complete', {
          createdCount: result.createdCount,
          processedCount: result.processedCount,
          remainingBacklog: result.remainingBacklog,
          source: result.source,
        });
      }
      return result;
    })
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
}
