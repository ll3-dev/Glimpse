import type { CoreClient, KnowledgeItem } from '@glimpse/shared';
import { getProviderForFeature } from '@/features/ai/router';
import { loadSettings } from '@/lib/settings-storage';
import { parseEdges, type ProposedEdge } from './graph-edge-parser';
import { planIncrementalCycle, RECHECK_LIMIT } from './incremental-graph';
import { selectRecheckCandidates } from './recheck-candidates';
import { mergeProposedEdges } from './edge-merge';
import { selectGraphSourceWindow } from './graph-source-window';

export interface GraphGenerationResult {
  createdCount: number;
  source: 'desktop-ai' | 'tag-overlap' | 'unchanged';
  /** 배치 상한으로 이번 사이클을 못 건너뛴 남은 백로그 크기 */
  remainingBacklog: number;
}

/**
 * Incremental knowledge-graph generation, run on sync-complete or manually.
 *
 * Incremental path: only unanalyzed/stale items go to the LLM, each paired
 * with at most RECHECK_LIMIT recheck candidates from the analyzed pool.
 * Cold start (no edges yet): the legacy newest-24 window seeds the first
 * cycle as a self-contained batch so the graph has a base before
 * incremental expansion takes over.
 */
export async function generateKnowledgeGraph(
  coreClient: CoreClient,
  allItems: KnowledgeItem[],
): Promise<GraphGenerationResult> {
  const existing = await coreClient.listRecommendations();
  const { toAnalyze, analyzedPool, backlogTotal } = planIncrementalCycle(allItems, existing);
  if (toAnalyze.length === 0) {
    return { createdCount: 0, source: 'unchanged', remainingBacklog: 0 };
  }

  // Cold start seeding: with no edges nothing is analyzed yet, so the
  // target↔candidate pairing would face an empty pool. Run the legacy
  // newest-24 window as one self-contained batch instead.
  const coldStart = existing.length === 0;
  const targets = coldStart ? selectGraphSourceWindow(toAnalyze) : toAnalyze;
  const pool = coldStart ? targets : analyzedPool;

  const settings = loadSettings();
  let source: GraphGenerationResult['source'] = 'tag-overlap';
  let proposed: ProposedEdge[] = [];

  if (settings.aiProvider !== 'rules') {
    const provider = await getProviderForFeature('metadata');
    if (provider.kind === 'local-llm' || provider.kind === 'byok') {
      proposed = await proposeWithDesktopAI(provider.complete.bind(provider), targets, pool);
      source = 'desktop-ai';
    }
  }
  if (proposed.length === 0) {
    proposed = proposeByTagOverlap(targets, pool);
    source = 'tag-overlap';
  }

  const additions = mergeProposedEdges(proposed, existing, allItems);
  // 이번 배치에 못 들어간 항목 수 — 저장된 엣지 수가 아니라 처리 용량 기준
  const remainingBacklog = Math.max(0, backlogTotal - toAnalyze.length);
  if (additions.length === 0) {
    return { createdCount: 0, source: 'unchanged', remainingBacklog };
  }
  await coreClient.saveRecommendations(additions);
  return { createdCount: additions.length, source, remainingBacklog };
}

/**
 * Batch prompt: each to-analyze item paired with only its recheck
 * candidates — the full analyzed pool never enters the prompt.
 */
async function proposeWithDesktopAI(
  complete: (request: {
    prompt: string;
    systemPrompt?: string;
    maxTokens?: number;
    temperature?: number;
  }) => Promise<{ text: string }>,
  targets: KnowledgeItem[],
  pool: KnowledgeItem[],
): Promise<ProposedEdge[]> {
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
      systemPrompt:
        'You build a knowledge graph. Return JSON only. Never invent IDs or facts.',
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

/**
 * Deterministic fallback: target↔candidate pairs only (or target↔target
 * within a cold-start batch) — after seeding, analyzed items never gain
 * new edges among themselves.
 */
function proposeByTagOverlap(
  targets: KnowledgeItem[],
  pool: KnowledgeItem[],
): ProposedEdge[] {
  const candidates: Array<ProposedEdge & { overlap: number }> = [];
  const withinBatch = targets === pool;
  for (let leftIndex = 0; leftIndex < targets.length; leftIndex += 1) {
    // Within a cold-start batch, pair targets among themselves; otherwise
    // targets pair against analyzed items only.
    const partnerStart = withinBatch ? leftIndex + 1 : 0;
    for (let rightIndex = partnerStart; rightIndex < pool.length; rightIndex += 1) {
      const left = targets[leftIndex];
      const right = pool[rightIndex];
      if (left.id === right.id) continue;
      const rightTags = new Set(right.tags ?? []);
      const shared = (left.tags ?? []).filter((tag) => rightTags.has(tag));
      if (shared.length > 0) {
        candidates.push({
          itemAId: left.id,
          itemBId: right.id,
          reason: `공통 태그: ${shared.slice(0, 3).join(', ')}`,
          overlap: shared.length,
        });
      }
    }
  }
  return candidates
    .sort((left, right) => right.overlap - left.overlap)
    .slice(0, MAX_NEW_EDGES);
}

const MAX_NEW_EDGES = 16;
