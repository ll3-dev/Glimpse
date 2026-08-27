import {
  DEFAULT_OPENAI_BASE_URL,
  normalizeBaseUrl,
} from '@/src/features/settings/byok.defaults';
import type { BYOKProviderType } from '@/src/stores/settings/byok.store';

/**
 * BYOK embedding client for mobile semantic rerank.
 *
 * openai-compatible `/embeddings`의 배열 input을 그대로 사용해 재정렬 전체가
 * 한 번의 HTTP 요청으로 처리된다. Anthropic/Gemini는 embedding API를 제공하지
 * 않으므로 능력 판정 함수가 먼저 걸러낸다.
 */

/** embedding 엔드포인트를 제공하는 provider만 semantic 재정렬이 가능하다. */
export function providerSupportsEmbedding(provider: BYOKProviderType | null): boolean {
  return provider === 'openai';
}

export interface EmbeddingClientConfig {
  provider: BYOKProviderType;
  apiKey: string;
  baseUrl: string | null;
  model: string;
}

export function buildEmbeddingsUrl(baseUrl: string | null): string {
  const base = normalizeBaseUrl(baseUrl) ?? DEFAULT_OPENAI_BASE_URL;
  return `${base}/embeddings`;
}

interface OpenAIEmbeddingResponse {
  data?: { embedding?: unknown; index?: number }[];
}

export type EmbeddingBatchResult = { vector: number[] }[];

/**
 * 배치 임베딩 — `SemanticEmbedDeps.embedBatch` 계약(hooks/useSemanticRerank).
 * 빈 입력은 네트워크 호출 없이 [] 반환. 부분 실패도 reject로 취급해 상위
 * 폴백(키워드 순서)이 동작하게 한다.
 */
export async function embedBatchWithBYOK(
  config: EmbeddingClientConfig,
  requests: { input: string }[],
  fetchImpl: typeof fetch = fetch,
): Promise<EmbeddingBatchResult> {
  if (!providerSupportsEmbedding(config.provider)) {
    throw new Error(`provider "${config.provider}" does not support embeddings`);
  }
  if (requests.length === 0) {
    return [];
  }

  const response = await fetchImpl(buildEmbeddingsUrl(config.baseUrl), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      input: requests.map((request) => request.input),
    }),
  });

  if (!response.ok) {
    throw new Error(`embedding request failed: HTTP ${response.status}`);
  }

  const payload = (await response.json()) as OpenAIEmbeddingResponse;
  const data = payload.data;
  if (!Array.isArray(data) || data.length !== requests.length) {
    throw new Error('embedding response violated the OpenAI contract: expected { data: [...] }');
  }

  // index로 복원해 응답 순서가 섞여도 요청 순서를 보존한다.
  const vectors: EmbeddingBatchResult = new Array(requests.length);
  const seen = new Set<number>();
  for (const entry of data) {
    const index = typeof entry.index === 'number' ? entry.index : undefined;
    if (index === undefined || index < 0 || index >= requests.length || seen.has(index)) {
      throw new Error('embedding response has invalid or duplicate index entries');
    }
    if (!Array.isArray(entry.embedding)) {
      throw new Error('embedding response entry is missing a numeric vector');
    }
    seen.add(index);
    vectors[index] = { vector: entry.embedding as number[] };
  }
  return vectors;
}
