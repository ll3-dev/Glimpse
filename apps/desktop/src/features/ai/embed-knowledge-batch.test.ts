import { describe, expect, test, mock } from 'bun:test';

/**
 * Chat-RAG 임베딩 배치 어댑터 테스트.
 *
 * desktop-llm-service는 실제 로드 시 @tauri-apps/api 모듈 그래프(EJS 번들)를
 * 끌어들이므로, 선례(desktop-llm-service.test.ts)처럼 mock.module로 대체하고
 * 동적 import로 테스트 대상을 받는다.
 */

const embedBatchMock = mock(async () => [{ vector: [1, 0] }]);
const resolveMock = mock(async () => ({ runtimeId: 'managed-local', modelId: 'emb-1' }));

// getDesktopLLMService()가 호출마다 새 객체를 만들면 테스트에서의 교체가
// 어댑터 내부 호출에 반영되지 않으므로, 안정된 공유 객체를 돌려준다.
const desktopServiceMock = {
  listManagedModels: async () => [{ id: 'emb-1', supportsEmbedding: true }],
  getRuntimeHealth: async () => ({ loadedModelId: 'emb-1' }),
  runEmbeddingBatch: embedBatchMock,
};

mock.module('@/features/local-llm/desktop-llm-service', () => ({
  getDesktopLLMService: () => desktopServiceMock,
}));

async function loadModule() {
  return await import('./embed-knowledge-batch');
}

describe('embedForRag', () => {
  test('대상 해석 실패(null)면 null 반환 — 폴백 신호', async () => {
    const { embedForRag } = await loadModule();
    resolveMock.mockImplementationOnce(async () => null);
    const result = await embedForRag('질문', ['항목'], {
      resolveEmbeddingTarget: resolveMock,
      embedBatch: async () => [],
    });
    expect(result).toBeNull();
  });

  test('대상 해석 reject도 null — resolve가 try 밖으로 나가면 이 테스트가 잡는다', async () => {
    const { embedForRag } = await loadModule();
    const result = await embedForRag('질문', ['항목'], {
      resolveEmbeddingTarget: async () => {
        throw new Error('resolve boom');
      },
      embedBatch: async () => [],
    });
    expect(result).toBeNull();
  });

  test('질문+항목을 한 배치로 보내고 벡터를 순서 보존해 돌려준다', async () => {
    const { embedForRag } = await loadModule();
    const calls: string[][] = [];
    const result = await embedForRag('사용자 질문', ['첫 번째', '두 번째'], {
      resolveEmbeddingTarget: resolveMock,
      embedBatch: async (requests) => {
        calls.push(requests.map((r) => r.input));
        return requests.map((r) => ({ vector: [1, r.input.length] }));
      },
    });
    // 항목 순서대로, 마지막 요청이 사용자 질문인 단일 배치 — 항목 텍스트를
    // 이어 붙인 자기유사 오표적이 아니라 실제 질문으로 순위를 매긴다.
    expect(calls[0]).toEqual(['첫 번째', '두 번째', '사용자 질문']);
    // 항목 벡터는 각 항목 입력의 응답, 질문 벡터는 마지막 응답.
    expect(result?.itemVectors.get('첫 번째')).toEqual([1, '첫 번째'.length]);
    expect(result?.itemVectors.get('두 번째')).toEqual([1, '두 번째'.length]);
    expect(result?.queryVector).toEqual([1, '사용자 질문'.length]);
  });

  test('응답 길이가 요청과 다르면 null — 부분 벡터로 잘못 정렬 금지', async () => {
    const { embedForRag } = await loadModule();
    const result = await embedForRag('q', ['a', 'b'], {
      resolveEmbeddingTarget: resolveMock,
      embedBatch: async () => [{ vector: [1] }],
    });
    expect(result).toBeNull();
  });

  test('embedBatch 실패 시 null — 채팅은 조용히 폴백', async () => {
    const { embedForRag } = await loadModule();
    const result = await embedForRag('q', [], {
      resolveEmbeddingTarget: resolveMock,
      embedBatch: async () => {
        throw new Error('boom');
      },
    });
    expect(result).toBeNull();
  });
});

describe('createRagEmbedDeps', () => {
  test('로드된 임베딩 모델을 대상으로 해석하고 서비스 배치로 연결한다', async () => {
    const { createRagEmbedDeps } = await loadModule();
    const deps = createRagEmbedDeps();
    await expect(deps.resolveEmbeddingTarget()).resolves.toEqual({
      runtimeId: 'managed-local',
      modelId: 'emb-1',
    });
    embedBatchMock.mockClear();
    const responses = await deps.embedBatch([
      { runtimeId: 'managed-local', modelId: 'emb-1', input: 'hello' },
    ]);
    expect(embedBatchMock).toHaveBeenCalledTimes(1);
    expect(responses).toEqual([{ vector: [1, 0] }]);
  });

  test('로드된 모델이 임베딩 불가면 null — 어댑터 자체 폴백', async () => {
    const { createRagEmbedDeps } = await loadModule();
    const original = desktopServiceMock.listManagedModels;
    desktopServiceMock.listManagedModels = async () => [
      { id: 'chat-only', supportsEmbedding: false },
    ];
    try {
      await expect(createRagEmbedDeps().resolveEmbeddingTarget()).resolves.toBeNull();
    } finally {
      desktopServiceMock.listManagedModels = original;
    }
  });
});
