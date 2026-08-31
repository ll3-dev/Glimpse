import { describe, expect, test, mock, beforeEach, afterEach } from 'bun:test';
import { Effect, Exit } from 'effect';
import {
  executeMetadataTargetEffect,
  executeLabelingTargetEffect,
  executeChatTargetEffect,
  executeChatTarget,
  setBYOKChatTimeoutForTests,
  resetBYOKChatTimeoutForTests,
} from './executors';
import type { KnowledgeItem } from '@glimpse/shared';
import type { LocalLLMRuntime } from '@/src/features/ai/local-llm';
import type { LocalModel } from '@/src/stores/settings/local-llm.store';
import {
  addLocalLLMModel,
  resetLocalLLMStoreConfig,
  selectLocalLLMModel,
} from '@/src/stores/settings/local-llm.store';
import { updateBYOKStoreConfig } from '@/src/stores/settings/byok.store';

/**
 * byok 라벨 버전 매핑만 검증하기 위한 프로바이더 스텁.
 * 실제 byokProvider는 스토어 설정+네트워크가 필요해 여기서는 도달할 수 없다.
 * (mock.module은 테스트 파일 단위로 격리된다.)
 */
mock.module('../providers/byok-provider', () => ({
  byokProvider: {
    name: 'byok',
    isAvailable: async () => true,
    generate: () => Effect.succeed({ summary: 'stub summary', tags: ['personal'] }),
  },
}));

/**
 * 모델 핀 검증용 런타임 스텁 — generate에 전달된 모델을 기록한다.
 */
const generateCalls: { modelId: string; prompt: unknown }[] = [];
const runtimeMock = {
  buildChatPrompt: (model: LocalModel) => `prompt:${model.id}`,
  generate: async (model: LocalModel, prompt: unknown) => {
    generateCalls.push({ modelId: model.id, prompt });
    return { text: `reply-for:${model.id}`, tokensGenerated: 1, timingMs: 1 };
  },
} as unknown as LocalLLMRuntime;

mock.module('@/src/hooks/chat/chatRuntime', () => ({
  getLocalLLMRuntime: () => runtimeMock,
}));

const originalFetch = globalThis.fetch;
const byokRequests: { endpoint: string; init?: RequestInit }[] = [];

beforeEach(() => {
  generateCalls.length = 0;
  byokRequests.length = 0;
  resetLocalLLMStoreConfig();
  updateBYOKStoreConfig((config) => ({
    ...config,
    enabled: true,
    provider: 'openai',
    apiKey: 'test-key',
    baseUrl: null,
    model: 'store-model',
  }));
  globalThis.fetch = (async (endpoint: string, init?: RequestInit) => {
    byokRequests.push({ endpoint, init });
    return {
      ok: true,
      json: async () => ({ choices: [{ message: { content: 'byok reply' } }] }),
    };
  }) as typeof fetch;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

function makeDownloadedModel(id: string, withPath = true): Parameters<typeof addLocalLLMModel>[0] {
  return {
    id,
    name: `Model ${id}`,
    family: 'qwen-chatml',
    size: 1_000,
    downloaded: true,
    path: withPath ? `file:///models/${id}.gguf` : null,
    isReady: true,
  };
}

describe('Effect-based Executors', () => {
  describe('executeMetadataTargetEffect', () => {
    test('returns Effect that succeeds with local fallback metadata', async () => {
      const effect = executeMetadataTargetEffect(
        { kind: 'stub', id: 'stub.default' },
        { content: 'Test content for metadata generation.' }
      );
      const exit = await Effect.runPromiseExit(effect);

      expect(Exit.isSuccess(exit)).toBe(true);
      if (Exit.isSuccess(exit)) {
        expect(exit.value.summary).toBeDefined();
        expect(Array.isArray(exit.value.tags)).toBe(true);
      }
    });

    test('returns Effect that fails with rules target', async () => {
      const effect = executeMetadataTargetEffect(
        { kind: 'rules', id: 'rules.default' },
        { content: 'Test content' }
      );
      const exit = await Effect.runPromiseExit(effect);

      expect(Exit.isFailure(exit)).toBe(true);
    });
  });

  describe('executeLabelingTargetEffect', () => {
    const mockItem: KnowledgeItem = {
      id: 'test-id',
      type: 'note',
      title: 'Test Note',
      body: 'This is a test note for labeling.',
      url: null,
      summary: null,
      tags: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      stability: null,
      difficulty: null,
      lastReviewedAt: null,
      nextReviewAt: null,
    };

    test('returns Effect that succeeds with rules target', async () => {
      const effect = executeLabelingTargetEffect(
        { kind: 'rules', id: 'rules.default' },
        mockItem
      );
      const exit = await Effect.runPromiseExit(effect);

      expect(Exit.isSuccess(exit)).toBe(true);
      if (Exit.isSuccess(exit)) {
        expect(exit.value.labels).toBeDefined();
        expect(exit.value.source).toBe('rules');
      }
    });

    test('returns Effect that succeeds with stub target', async () => {
      const effect = executeLabelingTargetEffect(
        { kind: 'stub', id: 'stub.default' },
        mockItem
      );
      const exit = await Effect.runPromiseExit(effect);

      expect(Exit.isSuccess(exit)).toBe(true);
      if (Exit.isSuccess(exit)) {
        expect(exit.value.labels).toBeDefined();
        expect(exit.value.source).toBe('stub');
      }
    });

    test('returns Effect that succeeds with byok target and byok label version', async () => {
      const effect = executeLabelingTargetEffect(
        { kind: 'byok', provider: 'openai', model: 'gpt-4.1-mini', id: 'byok.openai:gpt-4.1-mini' },
        mockItem
      );
      const exit = await Effect.runPromiseExit(effect);

      expect(Exit.isSuccess(exit)).toBe(true);
      if (Exit.isSuccess(exit)) {
        expect(exit.value.source).toBe('byok');
        expect(exit.value.version).toBe('byok-label-v1');
      }
    });
  });

  describe('executeChatTargetEffect', () => {
    test('fails honestly when no chat model is configured', async () => {
      const effect = executeChatTargetEffect(
        { kind: 'stub', id: 'stub.default' },
        { userText: 'Hello, this is a test message.' }
      );
      const exit = await Effect.runPromiseExit(effect);

      expect(Exit.isFailure(exit)).toBe(true);
    });

    test('returns Effect that fails with apple target', async () => {
      const effect = executeChatTargetEffect(
        { kind: 'apple', model: 'foundation-model', id: 'apple.foundation-model' },
        { userText: 'Hello' }
      );
      const exit = await Effect.runPromiseExit(effect);

      expect(Exit.isFailure(exit)).toBe(true);
    });

    test('returns Effect that fails with rules target', async () => {
      const effect = executeChatTargetEffect(
        { kind: 'rules', id: 'rules.default' },
        { userText: 'Hello' }
      );
      const exit = await Effect.runPromiseExit(effect);

      expect(Exit.isFailure(exit)).toBe(true);
    });

    test('local target with pinned modelId uses the pinned model, not the selected one', async () => {
      addLocalLLMModel(makeDownloadedModel('pinned-model'));
      addLocalLLMModel(makeDownloadedModel('other-model'));
      selectLocalLLMModel('other-model');

      const effect = executeChatTargetEffect(
        { kind: 'local', modelId: 'pinned-model', id: 'local.pinned-model' },
        { userText: '안녕하세요, 핀 검증용 메시지입니다.' }
      );
      const exit = await Effect.runPromiseExit(effect);

      expect(Exit.isSuccess(exit)).toBe(true);
      if (Exit.isSuccess(exit)) {
        expect(exit.value).toBe('reply-for:pinned-model');
      }
      expect(generateCalls[0]?.modelId).toBe('pinned-model');
    });

    test('local target without a pin keeps using the selected model', async () => {
      addLocalLLMModel(makeDownloadedModel('pinned-model'));
      addLocalLLMModel(makeDownloadedModel('selected-model'));
      selectLocalLLMModel('selected-model');

      const effect = executeChatTargetEffect(
        { kind: 'local', modelId: '', id: 'local.' },
        { userText: '안녕하세요, 핀 없는 메시지입니다.' }
      );
      const exit = await Effect.runPromiseExit(effect);

      expect(Exit.isSuccess(exit)).toBe(true);
      if (Exit.isSuccess(exit)) {
        expect(exit.value).toBe('reply-for:selected-model');
      }
      expect(generateCalls[0]?.modelId).toBe('selected-model');
    });

    test('local target with a pin to a missing model degrades to the selected model', async () => {
      addLocalLLMModel(makeDownloadedModel('selected-model'));
      selectLocalLLMModel('selected-model');

      const effect = executeChatTargetEffect(
        { kind: 'local', modelId: 'removed-model', id: 'local.removed-model' },
        { userText: '안녕하세요, 핀 폴백 메시지입니다.' }
      );
      const exit = await Effect.runPromiseExit(effect);

      expect(Exit.isSuccess(exit)).toBe(true);
      if (Exit.isSuccess(exit)) {
        expect(exit.value).toBe('reply-for:selected-model');
      }
      expect(generateCalls[0]?.modelId).toBe('selected-model');
    });

    test('local target whose pin cannot be resolved fails with a pin-specific error', async () => {
      // 핀이 있지만 그 모델이 목록에 없고, 폴백 선택 모델도 경로가 없으면
      // "선택된 모델이 없다"가 아니라 핀 관점의 에러여야 한다.
      addLocalLLMModel(makeDownloadedModel('selected-model', false));
      selectLocalLLMModel('selected-model');

      const effect = executeChatTargetEffect(
        { kind: 'local', modelId: 'removed-model', id: 'local.removed-model' },
        { userText: '안녕하세요, 핀 에러 메시지 검증입니다.' }
      );
      const exit = await Effect.runPromiseExit(effect);

      expect(Exit.isFailure(exit)).toBe(true);
      if (Exit.isFailure(exit)) {
        const error = exit.cause._tag === 'Fail' ? exit.cause.error : null;
        expect(error?.message).toBe('고정된 로컬 채팅 모델을 사용할 수 없습니다.');
      }
    });

    test('byok target model pin overrides the store model', async () => {
      const effect = executeChatTargetEffect(
        { kind: 'byok', provider: 'openai', model: 'pinned-gpt', id: 'byok.openai:pinned-gpt' },
        { userText: '안녕하세요, BYOK 핀 메시지입니다.' }
      );
      const exit = await Effect.runPromiseExit(effect);

      expect(Exit.isSuccess(exit)).toBe(true);
      if (Exit.isSuccess(exit)) {
        expect(exit.value).toBe('byok reply');
      }

      const body = JSON.parse(String(byokRequests[0]?.init?.body ?? '{}')) as { model?: string };
      expect(body.model).toBe('pinned-gpt');
    });

    test('byok chat fetch that outlives the timeout fails with a timeout message', async () => {
      // 회귀 방지: BYOK 채팅 fetch는 타임아웃이 없어 hang 시 영원히 대기했다.
      // signal-aware hanging fetch로 실제 타임아웃 경로를 태운다.
      setBYOKChatTimeoutForTests(20);
      const originalFetch = globalThis.fetch;
      globalThis.fetch = ((url: string, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            reject(new DOMException('The operation was aborted.', 'AbortError'));
          });
        })) as unknown as typeof fetch;

      try {
        const effect = executeChatTargetEffect(
          { kind: 'byok', provider: 'openai', model: 'store-model', id: 'byok.openai:store-model' },
          { userText: '안녕하세요, 타임아웃 검증 메시지입니다.' }
        );
        const exit = await Effect.runPromiseExit(effect);

        expect(Exit.isFailure(exit)).toBe(true);
        if (Exit.isFailure(exit)) {
          const error = exit.cause._tag === 'Fail' ? exit.cause.error : null;
          expect(error?.message).toContain('응답하지 않았습니다');
        }
      } finally {
        globalThis.fetch = originalFetch;
        resetBYOKChatTimeoutForTests();
      }
    });
  });

  describe('executeChatTarget (async) BYOK timeout', () => {
    test('byok chat fetch that outlives the timeout returns a timeout failure', async () => {
      setBYOKChatTimeoutForTests(20);
      const originalFetch = globalThis.fetch;
      globalThis.fetch = ((url: string, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            reject(new DOMException('The operation was aborted.', 'AbortError'));
          });
        })) as unknown as typeof fetch;

      try {
        const result = await executeChatTarget(
          { kind: 'byok', provider: 'openai', model: 'store-model', id: 'byok.openai:store-model' },
          { userText: '안녕하세요, 비동기 경로 타임아웃 검증입니다.' }
        );

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.message).toContain('응답하지 않았습니다');
        }
      } finally {
        globalThis.fetch = originalFetch;
        resetBYOKChatTimeoutForTests();
      }
    });
  });
});
