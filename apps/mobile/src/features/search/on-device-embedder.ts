import { initLlama, type LlamaContext } from 'llama.rn';

/**
 * On-device embedding context — llama.rn 전용 인스턴스.
 *
 * 채팅 llama-service와 별도의 컨텍스트를 로드해 검색 재정렬 배치 임베딩이
 * "Context is busy"로 채팅 생성과 충돌하지 않게 한다. 동시 호출은 내부
 * 직렬 큐로 막고(단일 네이티브 컨텍스트 가정), 백그라운드 진입 시 컨텍스트를
 * release해 메모리를 돌려준 뒤 foreground에서 lazy 재초기화한다.
 *
 * 모델 미다운로드·로드 실패·dispose 상태에서는 null을 반환해 호출부가
 * 키워드 순서 폴백(useSemanticRerank의 pass-through)으로 흐르게 한다.
 */

/** nomic v1.5(Q8_0 ~312MB)에 맞춘 소형 프로파일 — 재정렬 배치는 ≤31문자열. */
const EMBEDDING_CONTEXT_SIZE = 2048;
const EMBEDDING_GPU_LAYERS = 0;
/** initLlama 실패 후 재시도 금지 시간 — 검색 입력마다 수백 MB 로드가
 * 재시도되는 폭주를 끊는다(손상된 모델 파일 등 영구 실패 대비). */
const INIT_FAILURE_COOLDOWN_MS = 60_000;

export interface OnDeviceEmbeddingTarget {
  /** 로컬 GGUF 절대 경로 */
  modelPath: string;
  /** 다운로드한 모델 id(레지스트리) — 캐시 키 무효화용 식별자 */
  modelId: string;
}

interface EmbedBatchItem {
  input: string;
}

type InitLlamaFn = typeof initLlama;

export interface OnDeviceEmbedderDeps {
  initLlama?: InitLlamaFn;
}

function extractErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'string' && error.length > 0) return error;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

export function createOnDeviceEmbedder(
  target: OnDeviceEmbeddingTarget,
  deps: OnDeviceEmbedderDeps = {},
) {
  const initLlamaFn = deps.initLlama ?? initLlama;

  let context: LlamaContext | null = null;
  let disposed = false;
  let loading: Promise<LlamaContext> | null = null;
  let lastInitFailureAt = 0;

  // 직렬 큐: 진행 중 embed가 끝나야 다음 요청을 시작한다.
  let queueTail: Promise<unknown> = Promise.resolve();

  async function acquire(): Promise<LlamaContext> {
    if (disposed) {
      throw new Error('On-device embedder is disposed');
    }
    if (context) return context;
    if (Date.now() - lastInitFailureAt < INIT_FAILURE_COOLDOWN_MS) {
      // 쿨다운 중엔 재초기화를 시도하지 않고 즉시 실패 — 호출부(hook)가
      // 키워드 폴백으로 흐르고, 검색 입력마다 initLlama가 다시 돌지 않는다.
      throw new Error('온디바이스 임베딩 모델 로드 쿨다운 중');
    }
    if (!loading) {
      loading = initLlamaFn({
        model: target.modelPath,
        embedding: true,
        // ContextParams.pooling_type은 문자열 유니온(네이티브는 숫자)
        pooling_type: 'mean',
        n_ctx: EMBEDDING_CONTEXT_SIZE,
        n_gpu_layers: EMBEDDING_GPU_LAYERS,
        use_mlock: false,
        use_mmap: true,
      })
        .then((ctx) => {
          lastInitFailureAt = 0;
          context = ctx;
          return ctx;
        })
        .catch((error) => {
          lastInitFailureAt = Date.now();
          throw new Error(`온디바이스 임베딩 모델 로드 실패: ${extractErrorMessage(error)}`);
        })
        .finally(() => {
          loading = null;
        });
    }
    return loading;
  }

  async function releaseContext(): Promise<void> {
    if (!context) return;
    try {
      await context.release();
    } catch {
      // release 실패는 무시 — 참조만 정리
    }
    context = null;
  }

  async function embedOne(ctx: LlamaContext, item: EmbedBatchItem): Promise<number[]> {
    // llama.rn LlamaContext.embedding 응답: { embedding: number[] }
    const result = await ctx.embedding(item.input);
    const vector = (result as unknown as { embedding?: unknown }).embedding;
    if (!Array.isArray(vector) || vector.length === 0) {
      throw new Error('임베딩 결과가 비어 있습니다');
    }
    return vector;
  }

  const embedder = {
    /**
     * 여러 입력을 순차 임베딩한다(순서 보존). 이미 로드된 컨텍스트에서
     * 반복 호출하며, 첫 호출에서 lazy 초기화. 어떤 단계든 실패하면 reject —
     * 호출부(hook)가 전체 폴백을 담당한다.
     */
    async embedBatch(requests: EmbedBatchItem[]): Promise<{ vector: number[] }[]> {
      if (disposed || requests.length === 0) return [];

      // 직렬화: 현재 tail에 이어붙여 동시 호출이 겹치지 않게 한다.
      const run = queueTail.then(async () => {
        const ctx = await acquire();
        const vectors: { vector: number[] }[] = [];
        for (const item of requests) {
          vectors.push({ vector: await embedOne(ctx, item) });
        }
        return vectors;
      });

      // 큐의 마지막이 실패해도 이후 요청이 계속 흐르도록 swallow
      queueTail = run.catch(() => undefined);

      return run;
    },

    /** 백그라운드 진입 등 컨텍스트 해제 — 다음 embedBatch가 lazy 재초기화. */
    async suspend(): Promise<void> {
      await releaseContext();
    },

    /** 영구 폐기(unload/모델 삭제). 이후 모든 호출이 빈 배열 → 폴백. */
    async dispose(): Promise<void> {
      disposed = true;
      await releaseContext();
    },

    isReady(): boolean {
      return !disposed;
    },
  };

  return embedder;
}
