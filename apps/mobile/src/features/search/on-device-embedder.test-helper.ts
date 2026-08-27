import type { LlamaContext } from 'llama.rn';

/**
 * 온디바이스 임베더 테스트용 initLlama 대역 — 두 테스트
 * (on-device-embedder.test.ts, useMobileSemanticRerank.branch.test.ts)이 공유.
 */

interface FakeContext {
  embeddingCalls: string[];
  released: boolean;
  embedding: (text: string) => Promise<{ embedding: number[] }>;
  release: () => Promise<void>;
}

export function makeInitLlama(overrides?: {
  failLoad?: boolean;
  vector?: number[];
}) {
  const contexts: FakeContext[] = [];
  let active = 0;
  let maxActive = 0;
  const initLlama = (async () => {
    if (overrides?.failLoad) {
      throw new Error('model load boom');
    }
    // 컨텍스트가 로드되는 동안 지연을 둬 직렬화 검증이 의미 있게 한다
    await new Promise((resolve) => setTimeout(resolve, 5));
    const ctx: FakeContext = {
      embeddingCalls: [],
      released: false,
      async embedding(text: string) {
        ctx.embeddingCalls.push(text);
        active += 1;
        maxActive = Math.max(maxActive, active);
        try {
          await new Promise((resolve) => setTimeout(resolve, 5));
          return { embedding: overrides?.vector ?? [1, 2, 3] };
        } finally {
          active -= 1;
        }
      },
      async release() {
        ctx.released = true;
      },
    };
    contexts.push(ctx);
    return ctx as unknown as LlamaContext & FakeContext;
  }) as unknown as typeof import('llama.rn').initLlama;

  return { initLlama, contexts, get maxConcurrentEmbed() { return maxActive; } };
}
