import type { CoreClient, KnowledgeItem } from '@glimpse/shared';
import {
  buildCompletedGraphAnalysisRecords,
  LIVING_GRAPH_ANALYZER_VERSION,
  materializeGraphRecommendations,
  planLivingGraphCycle,
  proposeGraphEdgesByTagOverlap,
  type GraphCycleMetricSample,
  type ProposedGraphEdge,
} from '@glimpse/features';
import { getProviderForFeature } from '@/features/ai/router';
import { loadSettings } from '@/lib/settings-storage';
import { parseEdges } from './graph-edge-parser';
import { recordDesktopGraphCycle } from './graph-metrics.store';
import { selectRecheckCandidates } from './recheck-candidates';

const RECHECK_LIMIT = 20;
const MAX_NEW_EDGES = 16;

export interface GraphGenerationResult {
  createdCount: number;
  processedCount: number;
  skippedCount: number;
  deferredCount: number;
  source: 'desktop-ai' | 'tag-overlap' | 'unchanged';
  remainingBacklog: number;
}

export interface GraphGenerationTelemetry {
  wallNow: () => number;
  measureNow: () => number;
  recordCycle: (sample: GraphCycleMetricSample) => void;
}

const defaultTelemetry: GraphGenerationTelemetry = {
  wallNow: Date.now,
  measureNow: () => performance.now(),
  recordCycle: recordDesktopGraphCycle,
};

/**
 * Runs one Living Graph analysis batch. Analysis progress is persisted in the
 * core independently of edge creation, so a valid zero-edge result is clean
 * on the next run instead of circulating forever.
 */
export async function generateKnowledgeGraph(
  coreClient: CoreClient,
  allItems: KnowledgeItem[],
  telemetry: GraphGenerationTelemetry = defaultTelemetry,
): Promise<GraphGenerationResult> {
  const startedAt = telemetry.measureNow();
  const now = telemetry.wallNow();
  let result: GraphGenerationResult;
  try {
    result = await runKnowledgeGraphCycle(coreClient, allItems, now);
  } catch (error) {
    try {
      telemetry.recordCycle({
        succeeded: false,
        durationMs: telemetry.measureNow() - startedAt,
        processedCount: 0,
        skippedCount: 0,
        recordedAt: now,
      });
    } catch {
      // Diagnostics must not hide the graph generation error.
    }
    throw error;
  }
  try {
    telemetry.recordCycle({
      succeeded: true,
      durationMs: telemetry.measureNow() - startedAt,
      processedCount: result.processedCount,
      skippedCount: result.skippedCount,
      recordedAt: now,
    });
  } catch {
    // Diagnostics must not turn a successful graph generation into a failure.
  }
  return result;
}

async function runKnowledgeGraphCycle(
  coreClient: CoreClient,
  allItems: KnowledgeItem[],
  now: number,
): Promise<GraphGenerationResult> {
  const [existing, analysisRecords] = await Promise.all([
    coreClient.listRecommendations(),
    coreClient.listGraphAnalysisRecords(),
  ]);
  const plan = planLivingGraphCycle(allItems, analysisRecords, { now });
  if (plan.toAnalyze.length === 0) {
    return {
      createdCount: 0,
      processedCount: 0,
      skippedCount: plan.skippedCount,
      deferredCount: plan.deferredTotal,
      source: 'unchanged',
      remainingBacklog: plan.remainingBacklog,
    };
  }

  let source: GraphGenerationResult['source'] = 'tag-overlap';
  let proposed: ProposedGraphEdge[] = [];
  const settings = loadSettings();
  if (settings.aiProvider !== 'rules') {
    try {
      const provider = await getProviderForFeature('metadata');
      if (provider.kind === 'local-llm' || provider.kind === 'byok') {
        proposed = await proposeWithDesktopAI(
          provider.complete.bind(provider),
          plan.toAnalyze,
          plan.analyzedPool,
        );
        if (proposed.length > 0) source = 'desktop-ai';
      }
    } catch (error) {
      console.warn('[graph] desktop provider unavailable; using tag fallback:', error);
    }
  }
  if (proposed.length === 0) {
    proposed = proposeGraphEdgesByTagOverlap(
      plan.toAnalyze,
      plan.analyzedPool,
      existing,
      MAX_NEW_EDGES,
    );
    source = 'tag-overlap';
  }

  const additions = materializeGraphRecommendations(proposed, existing, allItems, {
    now,
    createId: () => crypto.randomUUID(),
    limit: MAX_NEW_EDGES,
  });
  const records = buildCompletedGraphAnalysisRecords(
    plan.toAnalyze,
    [...existing, ...additions],
    now,
    LIVING_GRAPH_ANALYZER_VERSION,
  );
  const committed = await coreClient.commitGraphAnalysis({
    records,
    recommendations: additions,
  });
  return {
    createdCount: committed.savedRecommendations,
    processedCount: committed.savedAnalysisRecords,
    skippedCount: plan.skippedCount,
    deferredCount: plan.deferredTotal,
    source,
    remainingBacklog: plan.remainingBacklog,
  };
}

async function proposeWithDesktopAI(
  complete: (request: {
    prompt: string;
    systemPrompt?: string;
    maxTokens?: number;
    temperature?: number;
  }) => Promise<{ text: string }>,
  targets: KnowledgeItem[],
  pool: KnowledgeItem[],
): Promise<ProposedGraphEdge[]> {
  const compactTargets = targets.map((item) => ({
    id: item.id,
    title: item.title,
    summary: item.summary,
    tags: item.tags,
    excerpt: item.body?.slice(0, 240) ?? null,
    candidates: selectRecheckCandidates(item, pool, RECHECK_LIMIT).map((candidate) => ({
      id: candidate.id,
      title: candidate.title,
      summary: candidate.summary,
      tags: candidate.tags,
    })),
  }));
  try {
    const response = await complete({
      systemPrompt: 'You build a knowledge graph. Return JSON only. Never invent IDs or facts.',
      prompt:
        `Find meaningful relationships between each target and its candidate items. ` +
        `Return at most ${MAX_NEW_EDGES} edges as ` +
        '[{"itemAId":"...","itemBId":"...","reason":"short explanation"}].\n' +
        JSON.stringify(compactTargets),
      maxTokens: 1_200,
      temperature: 0.2,
    });
    return parseEdges(response.text, {
      logger: { warn: (message, context) => console.warn(message, context ?? '') },
    });
  } catch (error) {
    console.warn('[graph] AI edge proposal failed:', error);
    return [];
  }
}
