import type { SemanticEmbedDeps } from '@glimpse/hooks';
import { getDesktopLLMService } from '@/features/local-llm/desktop-llm-service';

/**
 * Chat-RAG embedding runner — same transport as library search rerank
 * (resolveEmbeddingTarget + one batch IPC), reshaped for a one-shot,
 * non-React call site. 질문+항목을 단일 배치로 보내는 패턴은 검색 리랭크와
 * 동일(useSemanticRerank.ts:130-133). Any failure resolves to null: chat
 * must never break because embeddings are unavailable.
 */

export interface RagEmbedResult {
  queryVector: number[];
  /**
   * 항목 텍스트 → 벡터. 키가 텍스트 자체이므로 중복 텍스트는 마지막 벡터로
   * 수렴 — 호출부에서 중복 제거 책임.
   */
  itemVectors: Map<string, number[]>;
}

/** 모델 id당 실패 경고 1회만 — 조용한 catch가 계약 파기를 숨긴 과거 반면교사. */
const warnedModels = new Set<string>();
function warnOncePerModel(modelId: string, error: unknown): void {
  if (warnedModels.has(modelId)) return;
  warnedModels.add(modelId);
  console.warn(
    `[embedForRag] chat RAG embedding failed for model "${modelId}"; falling back to keyword context.`,
    error,
  );
}

/**
 * 질문과 항목 텍스트를 한 배치로 임베딩한다.
 *
 * `itemTexts`는 고유해야 한다 — 결과가 텍스트를 키로 하므로 중복 텍스트는
 * 마지막 벡터로 수렴한다(호출부에서 중복 제거 책임). 실패는 null로 폴백하지
 * 한 번씩은 경고를 남긴다.
 */
export async function embedForRag(
  question: string,
  itemTexts: string[],
  deps: SemanticEmbedDeps,
): Promise<RagEmbedResult | null> {
  let modelId = 'unknown';
  try {
    const target = await deps.resolveEmbeddingTarget();
    if (!target) return null;
    modelId = target.modelId;

    // 검색 리랭크와 동일한 와이어 형식 — 항목 순서대로, 마지막 요청이 질문.
    const batchRequests = [
      ...itemTexts.map((input) => ({ ...target, input })),
      { ...target, input: question },
    ];
    const responses = await deps.embedBatch(batchRequests);
    if (responses.length !== batchRequests.length) {
      throw new Error(
        `embedBatch returned ${responses.length} vectors for ${batchRequests.length} requests`,
      );
    }

    const itemVectors = new Map<string, number[]>();
    itemTexts.forEach((text, index) => {
      itemVectors.set(text, responses[index].vector);
    });
    return {
      queryVector: responses[responses.length - 1].vector,
      itemVectors,
    };
  } catch (error) {
    warnOncePerModel(modelId, error);
    return null;
  }
}

/**
 * 데스크톱 llama.cpp 배치 전송 어댑터 — 검색 리랭크와 같은 소스.
 * 공용 모듈로 추출하지 않고 복제하는 이유: useSemanticRerank.ts를 건드리지
 * 않아 병행 트랙(검색 개선)과의 충돌을 회피하기 위함.
 */
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
      const service = getDesktopLLMService();
      // requests는 이미 와이어 형식과 동일한 {runtimeId, modelId, input}
      return service.runEmbeddingBatch(requests);
    },
  };
}
