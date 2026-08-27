import { useEffect, useRef, useState } from 'react';
import type { KnowledgeItem } from '@glimpse/shared';
import { rankBySemanticSimilarity } from '@glimpse/features';

/**
 * Semantic re-ranking for library search — platform-neutral.
 *
 * The embed function is injected by the caller (desktop: local llama.cpp
 * batch IPC, mobile: BYOK openai-compatible /embeddings), so both platforms
 * share the ranking/caching/debounce/fallback behavior. Runs only when the
 * embed deps resolve to a usable model; otherwise returns the keyword order
 * untouched. Vectors are computed for item text (title + summary + body
 * excerpt) with a small in-memory cache keyed by model id + item id +
 * updatedAt so re-typing a query doesn't re-embed unchanged items — and a
 * different model swap invalidates stale vectors.
 */

/** 임베딩 배치 상한 — 과대 키워드 매치에 대한 IPC/디코드 폭주 차단. */
export const MAX_EMBED_ITEMS = 30;
/** Per-keystroke embed storm을 막는 query debounce. */
export const SEMANTIC_RERANK_DEBOUNCE_MS = 250;
const EXCERPT_LENGTH = 500;

/** 주입형 임베딩 계약 — 요청 배열 한 번에 벡터 배열(순서 보존)로 응답. */
export interface SemanticEmbedRequest {
  runtimeId: string;
  modelId: string;
  input: string;
}

export interface SemanticEmbedDeps {
  /** 배치 임베딩. 하나라도 실패하면 reject(전체 폴백). */
  embedBatch(requests: SemanticEmbedRequest[]): Promise<{ vector: number[] }[]>;
  /** 캐시 키·경고 dedup에 쓰는 현재 임베딩 모델 식별자. null이면 비활성. */
  resolveEmbeddingTarget(): Promise<{ runtimeId: string; modelId: string } | null>;
}

export function itemEmbeddingText(item: KnowledgeItem): string {
  return [item.title ?? '', item.summary ?? '', item.body?.slice(0, EXCERPT_LENGTH) ?? '']
    .filter(Boolean)
    .join('\n');
}

interface EmbeddingCacheEntry {
  key: string;
  vector: number[];
}

export function embeddingCacheKey(
  modelId: string,
  item: Pick<KnowledgeItem, 'id' | 'updatedAt'>,
): string {
  return `${modelId}:${item.id}:${item.updatedAt}`;
}

/** 모델 id당 계약/실패 경고 1회만 — 재입력마다 콘솔 스팸 방지. */
const warnedModels = new Set<string>();
function warnOncePerModel(modelId: string, error: unknown): void {
  if (warnedModels.has(modelId)) return;
  warnedModels.add(modelId);
  console.warn(
    `[useSemanticRerank] semantic rerank failed for model "${modelId}"; disabling until reload.`,
    error,
  );
}

export function useSemanticRerank(
  items: KnowledgeItem[],
  query: string,
  deps: SemanticEmbedDeps,
): { items: KnowledgeItem[]; active: boolean } {
  const [ranked, setRanked] = useState<KnowledgeItem[] | null>(null);
  const cacheRef = useRef(new Map<string, EmbeddingCacheEntry>());
  const runIdRef = useRef(0);

  useEffect(() => {
    const trimmed = query.trim();
    // Semantic ranking only refines an actual keyword search; without a
    // query the list order stays as-is. The reset rides a timeout so setState
    // never happens synchronously inside the effect body.
    if (!trimmed) {
      const reset = window.setTimeout(() => setRanked(null), 0);
      return () => window.clearTimeout(reset);
    }

    let cancelled = false;
    const runId = ++runIdRef.current;

    // Debounce per-keystroke queries: every change tears down the previous
    // timer via cleanup, so only the settled value reaches the embed path.
    const debounce = window.setTimeout(() => {
      void (async () => {
        let modelId = 'unknown';
        try {
          const target = await deps.resolveEmbeddingTarget();
          if (!target) {
            if (!cancelled && runId === runIdRef.current) setRanked(null);
            return;
          }
          modelId = target.modelId;

          const candidates = items.slice(0, MAX_EMBED_ITEMS);
          const itemVectors = new Map<string, number[]>();
          const misses: SemanticEmbedRequest[] = [];
          const missItems: KnowledgeItem[] = [];
          for (const item of candidates) {
            const cacheKey = embeddingCacheKey(target.modelId, item);
            const cached = cacheRef.current.get(item.id);
            const vector = cached?.key === cacheKey ? cached.vector : undefined;
            if (vector) {
              itemVectors.set(item.id, vector);
            } else {
              misses.push({
                runtimeId: target.runtimeId,
                modelId: target.modelId,
                input: itemEmbeddingText(item),
              });
              missItems.push(item);
            }
          }

          // 전체 후보가 캐시 히트여도 query 임베딩은 필요 — 미스와 함께
          // 단일 배치 호출로 보내어 N항목 재정렬이 정확히 1회 IPC가 되게 한다.
          const batchRequests: SemanticEmbedRequest[] = [
            ...misses,
            { runtimeId: target.runtimeId, modelId: target.modelId, input: trimmed },
          ];
          const responses = await deps.embedBatch(batchRequests);
          if (responses.length !== batchRequests.length) {
            throw new Error(
              `embedBatch returned ${responses.length} vectors for ${batchRequests.length} requests`,
            );
          }
          if (cancelled || runId !== runIdRef.current) return;

          missItems.forEach((item, index) => {
            cacheRef.current.set(item.id, {
              key: embeddingCacheKey(target.modelId, item),
              vector: responses[index].vector,
            });
            itemVectors.set(item.id, responses[index].vector);
          });

          const queryVector = responses[batchRequests.length - 1].vector;

          setRanked(
            rankBySemanticSimilarity(candidates, {
              queryEmbedding: queryVector,
              itemEmbeddings: itemVectors,
            }).map((entry) => entry.item),
          );
        } catch (error) {
          // Embedding failure must never break keyword search, but silence
          // hid the TS↔Rust contract break for months — warn once per model.
          warnOncePerModel(modelId, error);
          if (!cancelled && runId === runIdRef.current) setRanked(null);
        }
      })();
    }, SEMANTIC_RERANK_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(debounce);
    };
  }, [items, query, deps]);

  return { items: ranked ?? items, active: ranked !== null };
}
