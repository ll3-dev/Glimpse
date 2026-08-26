import { useEffect, useRef, useState } from 'react';
import type { KnowledgeItem } from '@glimpse/shared';
import { rankBySemanticSimilarity } from '@glimpse/features/search';
import { getDesktopLLMService } from '@/features/local-llm/desktop-llm-service';

/**
 * Semantic re-ranking for library search.
 *
 * Runs only when an embedding model is loaded; otherwise returns the keyword
 * order untouched. Vectors are computed per item (title + summary + body
 * excerpt) with a small in-memory cache keyed by item id + updatedAt so
 * re-typing a query doesn't re-embed unchanged items.
 */

const MAX_EMBED_ITEMS = 100;
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

    void (async () => {
      try {
        const service = getDesktopLLMService();
        const [models, health] = await Promise.all([
          service.listManagedModels(),
          service.getRuntimeHealth(),
        ]);
        const embeddingLoaded = models.some(
          (model) =>
            model.supportsEmbedding && model.id === health.loadedModelId,
        );
        if (!embeddingLoaded) {
          if (!cancelled && runId === runIdRef.current) setRanked(null);
          return;
        }

        const candidates = items.slice(0, MAX_EMBED_ITEMS);
        const itemVectors = new Map<string, number[]>();
        for (const item of candidates) {
          const cacheKey = `${item.id}:${item.updatedAt}`;
          const cached = cacheRef.current.get(item.id);
          let vector = cached?.key === cacheKey ? cached.vector : undefined;
          if (!vector) {
            const response = await service.runEmbedding({
              text: itemEmbeddingText(item),
            });
            vector = response.embedding;
            cacheRef.current.set(item.id, { key: cacheKey, vector });
          }
          itemVectors.set(item.id, vector);
          if (cancelled) return;
        }

        const queryResponse = await service.runEmbedding({ text: trimmed });
        if (cancelled || runId !== runIdRef.current) return;

        setRanked(
          rankBySemanticSimilarity(candidates, {
            queryEmbedding: queryResponse.embedding,
            itemEmbeddings: itemVectors,
          }).map((entry) => entry.item),
        );
      } catch {
        // Embedding failure must never break keyword search.
        if (!cancelled && runId === runIdRef.current) setRanked(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [items, query]);

  return { items: ranked ?? items, active: ranked !== null };
}
