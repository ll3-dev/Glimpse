import { describe, expect, test, mock, beforeEach } from 'bun:test';
import { Effect, Exit } from 'effect';
import {
  executeMetadataTargetEffect,
  executeLabelingTargetEffect,
  executeChatTargetEffect,
} from './executors';
import type { KnowledgeItem } from '@glimpse/shared';
import type { LocalLLMRuntime } from '@/src/features/ai/local-llm';
import type { LocalModel } from '@/src/stores/settings/local-llm.store';
import {
  addLocalLLMModel,
  resetLocalLLMStoreConfig,
  selectLocalLLMModel,
} from '@/src/stores/settings/local-llm.store';

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

beforeEach(() => {
  generateCalls.length = 0;
  resetLocalLLMStoreConfig();
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
  });
});
