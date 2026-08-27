import { useMemo } from 'react';
import {
  useSemanticRerank,
  type SemanticEmbedDeps,
} from '@glimpse/hooks';
import { getDesktopLLMService } from '@/features/local-llm/desktop-llm-service';
import type { KnowledgeItem } from '@glimpse/shared';

/**
 * Desktop wiring for the platform-neutral semantic rerank hook.
 *
 * Embeds via the local llama.cpp batch command (one IPC for the whole
 * rerank) and resolves the loaded embedding-capable model from the runtime
 * health. The ranking/caching/debounce/fallback policy lives in
 * @glimpse/hooks; this adapter only supplies the Tauri transport.
 */

function createDesktopEmbedDeps(): SemanticEmbedDeps {
  return {
    async resolveEmbeddingTarget() {
      const service = getDesktopLLMService();
      const [models, health] = await Promise.all([
        service.listManagedModels(),
        service.getRuntimeHealth(),
      ]);
      const loadedModel = models.find(
        (model) => model.supportsEmbedding && model.id === health.loadedModelId,
      );
      if (!loadedModel) return null;
      return { runtimeId: 'managed-local', modelId: loadedModel.id };
    },
    async embedBatch(requests) {
      const service = getDesktopLLMService();
      // requests는 이미 와이어 형식과 동일한 {runtimeId, modelId, input}
      return service.runEmbeddingBatch(requests);
    },
  };
}

export function useDesktopSemanticRerank(items: KnowledgeItem[], query: string) {
  // deps 객체 재생성으로 effect가 매 렌더 재실행되지 않게 캐시한다.
  const deps = useMemo(() => createDesktopEmbedDeps(), []);
  return useSemanticRerank(items, query, deps);
}
