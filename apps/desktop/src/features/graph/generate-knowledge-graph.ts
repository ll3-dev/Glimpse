import type { CoreClient, KnowledgeItem, Recommendation } from '@glimpse/shared';
import { getProviderForFeature } from '@/features/ai/router';
import { loadSettings } from '@/lib/settings-storage';
import { parseEdges, type ProposedEdge } from './graph-edge-parser';

const MAX_ITEMS = 24;
const MAX_NEW_EDGES = 16;

export interface GraphGenerationResult {
  createdCount: number;
  source: 'desktop-ai' | 'tag-overlap' | 'unchanged';
}

export async function generateKnowledgeGraph(
  coreClient: CoreClient,
  allItems: KnowledgeItem[],
): Promise<GraphGenerationResult> {
  const items = [...allItems]
    .sort((left, right) => right.updatedAt - left.updatedAt)
    .slice(0, MAX_ITEMS);
  if (items.length < 2) return { createdCount: 0, source: 'unchanged' };

  const existing = await coreClient.listRecommendations();
  const existingPairs = new Set(existing.map((edge) => pairKey(edge.itemA_id, edge.itemB_id)));
  const settings = loadSettings();
  let source: GraphGenerationResult['source'] = 'tag-overlap';
  let proposed: ProposedEdge[] = [];

  if (settings.aiProvider !== 'rules') {
    const provider = await getProviderForFeature('metadata');
    if (provider.kind === 'local-llm' || provider.kind === 'byok') {
      proposed = await proposeWithDesktopAI(provider.complete.bind(provider), items);
      source = 'desktop-ai';
    }
  }
  if (proposed.length === 0) {
    proposed = proposeByTagOverlap(items);
    source = 'tag-overlap';
  }

  const validIds = new Set(items.map((item) => item.id));
  const now = Date.now();
  const additions: Recommendation[] = [];
  for (const edge of proposed) {
    const key = pairKey(edge.itemAId, edge.itemBId);
    if (
      edge.itemAId === edge.itemBId ||
      !validIds.has(edge.itemAId) ||
      !validIds.has(edge.itemBId) ||
      existingPairs.has(key)
    ) {
      continue;
    }
    existingPairs.add(key);
    additions.push({
      id: crypto.randomUUID(),
      itemA_id: edge.itemAId,
      itemB_id: edge.itemBId,
      reason: edge.reason.slice(0, 300),
      status: 'pending',
      createdAt: now + additions.length,
      respondedAt: null,
    });
    if (additions.length >= MAX_NEW_EDGES) break;
  }

  if (additions.length === 0) return { createdCount: 0, source: 'unchanged' };
  await coreClient.saveRecommendations(additions);
  return { createdCount: additions.length, source };
}

async function proposeWithDesktopAI(
  complete: (request: {
    prompt: string;
    systemPrompt?: string;
    maxTokens?: number;
    temperature?: number;
  }) => Promise<{ text: string }>,
  items: KnowledgeItem[],
): Promise<ProposedEdge[]> {
  const compactItems = items.map((item) => ({
    id: item.id,
    title: item.title,
    summary: item.summary,
    tags: item.tags,
    excerpt: item.body?.slice(0, 240) ?? null,
  }));
  try {
    const response = await complete({
      systemPrompt:
        'You build a knowledge graph. Return JSON only. Never invent IDs or facts.',
      prompt:
        `Find meaningful relationships between these knowledge items. ` +
        `Return at most ${MAX_NEW_EDGES} edges as ` +
        '[{"itemAId":"...","itemBId":"...","reason":"short explanation"}].\n' +
        JSON.stringify(compactItems),
      maxTokens: 1_200,
      temperature: 0.2,
    });
    return parseEdges(response.text);
  } catch {
    return [];
  }
}

function proposeByTagOverlap(items: KnowledgeItem[]): ProposedEdge[] {
  const candidates: Array<ProposedEdge & { overlap: number }> = [];
  for (let leftIndex = 0; leftIndex < items.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < items.length; rightIndex += 1) {
      const left = items[leftIndex];
      const right = items[rightIndex];
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

function pairKey(left: string, right: string): string {
  return left < right ? `${left}\u0000${right}` : `${right}\u0000${left}`;
}
