import { useEffect, useRef, useState } from 'react';
import type { KnowledgeItem } from '@glimpse/shared';
import { rankBySemanticSimilarity } from '@glimpse/features/search';
import { getDesktopLLMService } from '@/features/local-llm/desktop-llm-service';

/**
 * Semantic re-ranking for library search.
 *
 * Runs only when an embedding model is loaded; otherwise returns the keyword
 * order untouched. Vectors are computed per item (title + summary + body
 * excerpt) with a small in-memory cache keyed by model id + item id +
 * updatedAt so re-typing a query doesn't re-embed unchanged items — and a
 * different model swap invalidates stale vectors.
 */

/** 임베딩 IPC/디코드 폭주 상한(llama.cpp 컨텍스트 재사용 전까지 증상 완화). */
export const MAX_EMBED_ITEMS = 30;
/** Per-keystroke IPC storm을 막는 query debounce. */
export const SEMANTIC_RERANK_DEBOUNCE_MS = 250;
const EXCERPT_LENGTH = 500;

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
          const service = getDesktopLLMService();
          const [models, health] = await Promise.all([
            service.listManagedModels(),
            service.getRuntimeHealth(),
          ]);
          // 로드된 모델 id를 확정해 캐시 키와 경고 dedup에 사용한다.
          const loadedModel = models.find(
            (model) =>
              model.supportsEmbedding && model.id === health.loadedModelId,
          );
          if (!loadedModel) {
            if (!cancelled && runId === runIdRef.current) setRanked(null);
            return;
          }
          modelId = loadedModel.id;

          const candidates = items.slice(0, MAX_EMBED_ITEMS);
          const itemVectors = new Map<string, number[]>();
          for (const item of candidates) {
            const cacheKey = embeddingCacheKey(modelId, item);
            const cached = cacheRef.current.get(item.id);
            let vector = cached?.key === cacheKey ? cached.vector : undefined;
            if (!vector) {
              const response = await service.runEmbedding({
                text: itemEmbeddingText(item),
                modelId,
                runtimeId: 'managed-local',
              });
              vector = response.vector;
              cacheRef.current.set(item.id, { key: cacheKey, vector });
            }
            itemVectors.set(item.id, vector);
            if (cancelled) return;
          }

          const queryResponse = await service.runEmbedding({
            text: trimmed,
            modelId,
            runtimeId: 'managed-local',
          });
          if (cancelled || runId !== runIdRef.current) return;

          setRanked(
            rankBySemanticSimilarity(candidates, {
              queryEmbedding: queryResponse.vector,
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
  }, [items, query]);

  return { items: ranked ?? items, active: ranked !== null };
}
