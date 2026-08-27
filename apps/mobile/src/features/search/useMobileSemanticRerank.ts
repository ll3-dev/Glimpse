import { useMemo } from 'react';
import {
  useBYOKConfig,
  useBYOKCredentialsConfigured,
} from '@/src/features/settings/byok.selectors';
import { useSemanticRerankEnabled } from '@/src/features/search/semantic-settings';
import {
  embedBatchWithBYOK,
  providerSupportsEmbedding,
} from '@/src/features/search/byok-embedding-client';
import {
  useSemanticRerank,
  type SemanticEmbedDeps,
} from '@glimpse/hooks';
import type { BYOKProviderType } from '@/src/stores/settings/byok.store';
import type { KnowledgeItem } from '@glimpse/shared';

/**
 * Mobile wiring for the platform-neutral semantic rerank hook.
 *
 * BYOK 옵트인(semantic_rerank_enabled) + openai-compatible provider 자격이
 * 갖춰졌을 때만 활성화된다. 임베딩은 `/embeddings` 배열 배치 1회 호출. 그 외
 * 조건에서는 키워드 순서 pass-through.
 */

const DEFAULT_MODEL_FALLBACK = 'text-embedding-3-small';

interface RerankConfigSnapshot {
  provider: BYOKProviderType | null;
  apiKey: string | null;
  baseUrl: string | null;
  model: string | null;
}

function createEmbedDeps(active: boolean, config: RerankConfigSnapshot): SemanticEmbedDeps {
  return {
    async resolveEmbeddingTarget() {
      if (!active || !config.provider || !config.apiKey) return null;
      if (!providerSupportsEmbedding(config.provider)) return null;
      return {
        runtimeId: 'byok-openai',
        modelId: config.model || DEFAULT_MODEL_FALLBACK,
      };
    },
    async embedBatch(requests) {
      if (!config.provider || !config.apiKey) {
        throw new Error('BYOK credentials missing');
      }
      return embedBatchWithBYOK(
        {
          provider: config.provider,
          apiKey: config.apiKey,
          baseUrl: config.baseUrl,
          model: config.model || DEFAULT_MODEL_FALLBACK,
        },
        requests,
      );
    },
  };
}

export function useMobileSemanticRerank(items: KnowledgeItem[], query: string) {
  const [enabled] = useSemanticRerankEnabled();
  const provider = useBYOKConfig((config) => config.provider);
  const apiKey = useBYOKConfig((config) => config.apiKey);
  const baseUrl = useBYOKConfig((config) => config.baseUrl);
  const model = useBYOKConfig((config) => config.model);
  const credentialsConfigured = useBYOKCredentialsConfigured();

  const active = enabled && credentialsConfigured && providerSupportsEmbedding(provider);
  // apiKey 스냅샷만 deps에 반영(hydrate 타이밍) — 객체 재생성으로 effect가
  // 매 렌더 재실행되지 않게 원시값을 의존 배열에 둔다.
  const config = useMemo<RerankConfigSnapshot>(
    () => ({ provider, apiKey, baseUrl, model }),
    [provider, apiKey, baseUrl, model],
  );
  const deps = useMemo(() => createEmbedDeps(active, config), [active, config]);

  return useSemanticRerank(items, query, deps);
}
