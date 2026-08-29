import type { SemanticEmbedDeps } from '@glimpse/hooks';
import { getDesktopLLMService } from '@/features/local-llm/desktop-llm-service';

/**
 * Chat-RAG embedding runner — same transport as library search rerank
 * (resolveEmbeddingTarget + one batch IPC), reshaped for a one-shot,
 * non-React call site. Any failure resolves to null: chat must never
 * break because embeddings are unavailable.
 */

export interface RagEmbedResult {
  queryVector: number[];
  itemVectors: Map<string, number[]>;
}

export async function embedForRag(
  itemTexts: string[],
  deps: SemanticEmbedDeps,
): Promise<RagEmbedResult | null> {
  try {
    const target = await deps.resolveEmbeddingTarget();
    if (!target) return null;

    // 검색 리랭크와 동일한 와이어 형식 — 마지막 요청이 질문 벡터.
    const batchRequests = [
      ...itemTexts.map((input) => ({ ...target, input })),
      { ...target, input: itemTexts.join('\n') },
    ];
    const responses = await deps.embedBatch(batchRequests);
    if (responses.length !== batchRequests.length) return null;

    const itemVectors = new Map<string, number[]>();
    itemTexts.forEach((text, index) => {
      itemVectors.set(text, responses[index].vector);
    });
    return {
      queryVector: responses[responses.length - 1].vector,
      itemVectors,
    };
  } catch {
    return null;
  }
}

/** 데스크톱 llama.cpp 배치 전송 어댑터 — 검색 리랭크와 같은 소스. */
export function createRagEmbedDeps(): SemanticEmbedDeps {
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
      return getDesktopLLMService().runEmbeddingBatch(requests);
    },
  };
}
