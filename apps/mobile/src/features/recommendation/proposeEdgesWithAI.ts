/**
 * LLM-proposed recommendation edges for mobile.
 *
 * Closes the intelligence gap with the desktop knowledge graph: instead of
 * only matching shared tags, the configured chat target (local LLM or BYOK)
 * reads the week's items and proposes meaningful connections. Tag overlap
 * remains the fallback when no model is available or generation fails.
 */

import type { KnowledgeItem } from '@glimpse/shared';
import { parseEdges, sanitizeEdges, type ProposedEdge } from '@glimpse/features';
import { resolveEffectiveTarget, executeChatTarget } from '@/src/features/ai/targets';
import { logger } from '@/src/utils/logger';

const MAX_INPUT_ITEMS = 20;
const MAX_EDGES = 8;

export interface ProposeEdgesDeps {
  resolveTarget: () => { kind: string } | null;
  executeChat: (target: unknown, input: { userText: string }) => Promise<{ success: boolean; data?: string; error?: unknown }>;
  now?: () => number;
}

const DEFAULT_PROPOSE_DEPS: ProposeEdgesDeps = {
  resolveTarget: () => {
    try {
      return resolveEffectiveTarget('chat');
    } catch {
      return null;
    }
  },
  executeChat: (target, input) => executeChatTarget(target as never, { userText: input.userText }),
};

function buildPrompt(items: KnowledgeItem[]): string {
  const compact = items.slice(0, MAX_INPUT_ITEMS).map((item) => ({
    id: item.id,
    title: item.title,
    summary: item.summary,
    tags: item.tags,
    excerpt: item.body?.slice(0, 200) ?? null,
  }));
  return (
    `최근 저장한 지식 항목들입니다. 의미 있는 연결을 찾아 추천해 주세요.\n` +
    `최대 ${MAX_EDGES}개의 엣지를 JSON 배열로만 반환하세요. 형식: ` +
    `[{"itemAId":"...","itemBId":"...","reason":"짧은 이유"}]\n` +
    `같은 항목끼리 연결하지 말고, 반드시 존재하는 id만 사용하세요.\n` +
    JSON.stringify(compact)
  );
}

/**
 * Returns LLM-proposed edges, or an empty list when no capable target is
 * available (stub/rules) or generation fails — callers fall back to tags.
 */
export async function proposeEdgesWithAI(
  items: KnowledgeItem[],
  deps: ProposeEdgesDeps = DEFAULT_PROPOSE_DEPS,
): Promise<ProposedEdge[]> {
  if (items.length < 2) return [];

  const target = deps.resolveTarget();
  if (!target || (target.kind !== 'local' && target.kind !== 'byok')) {
    return [];
  }

  try {
    const result = await deps.executeChat(target, { userText: buildPrompt(items) });
    if (!result.success || typeof result.data !== 'string') {
      return [];
    }
    const validIds = new Set(items.map((item) => item.id));
    return sanitizeEdges(parseEdges(result.data), validIds, MAX_EDGES);
  } catch (error) {
    logger.warn('AI edge proposal failed', { error: String(error) });
    return [];
  }
}

export const EDGE_PROPOSAL_LIMITS = {
  MAX_INPUT_ITEMS,
  MAX_EDGES,
} as const;
