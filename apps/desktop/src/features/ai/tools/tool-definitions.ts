/**
 * Chat tool 실행기(executor) — 스키마 선언은 tool-schemas.ts.
 * 실행기는 의존성 주입으로 순수하게 유지한다(테스트 참조).
 *
 * - list_recent_knowledge: 최근 항목 조회 (임베딩 불필요)
 * - search_knowledge: 임베딩 유사도 검색 (실패 시 토큰 중복 점수로 저하)
 * - save_note: 새 노트 저장 — 캡처 파이프라인과 동일한 계약(labelStatus
 *   'pending', 24h 후 재검토)으로 저장해 라벨링/그래프 자동화가 픽업한다.
 */

import type { KnowledgeItem } from '@glimpse/shared';
import { itemEmbeddingText } from '@glimpse/hooks';


export const TOOL_LIST_LIMIT_DEFAULT = 5;
export const TOOL_LIST_LIMIT_MAX = 20;
const SNIPPET_MAX_LENGTH = 200;

/** save_note가 캡처 모달과 동일하게 적용하는 첫 재검토 지연. */
export const NOTE_NEXT_REVIEW_MS = 24 * 60 * 60 * 1000;

export interface KnowledgeToolDeps {
  loadLibrary: () => Promise<KnowledgeItem[]>;
  saveKnowledgeItem: (item: KnowledgeItem) => Promise<KnowledgeItem>;
  embed: (
    question: string,
    itemTexts: string[],
  ) => Promise<{
    queryVector: number[];
    itemVectors: Map<string, number[]>;
  } | null>;
  generateId: () => string;
  now?: () => number;
}

export interface ToolItemView {
  id: string;
  type: string;
  title: string | null;
  snippet: string;
  score?: number;
}

function snippetOf(item: KnowledgeItem): string {
  const source = item.summary ?? item.body ?? item.url ?? item.title ?? '';
  const text = source.trim();
  if (text.length <= SNIPPET_MAX_LENGTH) return text;
  return `${text.slice(0, SNIPPET_MAX_LENGTH - 1)}…`;
}

function clampLimit(raw: unknown): number {
  const value = typeof raw === 'number' ? raw : TOOL_LIST_LIMIT_DEFAULT;
  return Math.min(Math.max(Math.floor(value) || TOOL_LIST_LIMIT_DEFAULT, 1), TOOL_LIST_LIMIT_MAX);
}

function cosineSimilarity(a: readonly number[], b: readonly number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length && i < b.length; i += 1) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/** 임베딩을 못 쓸 때의 저하 점수 — 공백 토큰 중복 개수. */
export function lexicalScore(query: string, text: string): number {
  const tokens = query
    .toLowerCase()
    .split(/\s+/)
    .filter((token) => token.length >= 2);
  if (tokens.length === 0) return 0;
  const haystack = text.toLowerCase();
  return tokens.reduce(
    (score, token) => (haystack.includes(token) ? score + 1 : score),
    0,
  );
}

async function runListRecent(
  deps: KnowledgeToolDeps,
  args: { limit?: unknown },
): Promise<{ items: ToolItemView[] }> {
  const limit = clampLimit(args.limit);
  const items = [...(await deps.loadLibrary())]
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, limit)
    .map((item) => ({
      id: item.id,
      type: item.type,
      title: item.title,
      snippet: snippetOf(item),
    }));
  return { items };
}

async function runSearch(
  deps: KnowledgeToolDeps,
  args: { query?: unknown; limit?: unknown },
): Promise<{ items: ToolItemView[] }> {
  const query = typeof args.query === 'string' ? args.query.trim() : '';
  if (!query) return { items: [] };
  const limit = clampLimit(args.limit);

  const library = await deps.loadLibrary();
  const itemsByText = new Map<string, KnowledgeItem[]>();
  for (const item of library) {
    const text = itemEmbeddingText(item);
    if (!text) continue;
    const bucket = itemsByText.get(text);
    if (bucket) bucket.push(item);
    else itemsByText.set(text, [item]);
  }
  const uniqueTexts = [...itemsByText.keys()];
  if (uniqueTexts.length === 0) return { items: [] };

  const embedded = await deps.embed(query, uniqueTexts);
  const scored: { item: KnowledgeItem; score: number }[] = [];
  if (embedded) {
    for (const [text, vector] of embedded.itemVectors) {
      const score = cosineSimilarity(embedded.queryVector, vector);
      for (const item of itemsByText.get(text) ?? []) {
        scored.push({ item, score });
      }
    }
  } else {
    for (const [text, bucket] of itemsByText) {
      const score = lexicalScore(query, text);
      for (const item of bucket) scored.push({ item, score });
    }
  }

  scored.sort((a, b) => b.score - a.score);
  return {
    items: scored.slice(0, limit).map(({ item, score }) => ({
      id: item.id,
      type: item.type,
      title: item.title,
      snippet: snippetOf(item),
      score: Number(score.toFixed(4)),
    })),
  };
}

async function runSaveNote(
  deps: KnowledgeToolDeps,
  args: { title?: unknown; body?: unknown },
): Promise<{ id: string; saved: true }> {
  const body = typeof args.body === 'string' ? args.body.trim() : '';
  if (!body) {
    throw new Error('save_note requires a non-empty body');
  }
  const title = typeof args.title === 'string' && args.title.trim() ? args.title.trim() : null;
  const now = deps.now?.() ?? Date.now();

  const saved = await deps.saveKnowledgeItem({
    id: deps.generateId(),
    type: 'note',
    title,
    body,
    url: null,
    summary: null,
    tags: null,
    labels: null,
    provisionalLabels: null,
    labelStatus: 'pending',
    labelSource: null,
    labelVersion: null,
    labelScore: null,
    labelRequestedAt: now,
    labelCompletedAt: null,
    labelError: null,
    createdAt: now,
    updatedAt: now,
    stability: null,
    difficulty: null,
    lastReviewedAt: null,
    nextReviewAt: now + NOTE_NEXT_REVIEW_MS,
  });
  return { id: saved.id, saved: true };
}

/**
 * 도구 실행기 — (도구 이름, JSON 인자 문자열)을 받아 JSON 직렬화 가능한
 * 결과를 돌려준다. 모르는 도구는 {error} 객체로 응답해 모델이 회복하게
 * 한다(throw는 파서/검증 실패에만).
 */
export function createToolExecutor(deps: KnowledgeToolDeps) {
  return async function executeTool(name: string, argsJson: string): Promise<unknown> {
    let args: Record<string, unknown> = {};
    try {
      args = argsJson.trim() ? (JSON.parse(argsJson) as Record<string, unknown>) : {};
    } catch {
      return { error: `invalid JSON arguments for ${name}` };
    }

    switch (name) {
      case 'list_recent_knowledge':
        return runListRecent(deps, args);
      case 'search_knowledge':
        return runSearch(deps, args);
      case 'save_note':
        return runSaveNote(deps, args);
      default:
        return { error: `unknown tool: ${name}` };
    }
  };
}
