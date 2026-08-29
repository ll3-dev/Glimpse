import { describe, expect, test, mock, beforeEach } from 'bun:test';
import { Effect, Exit } from 'effect';
import { createLocalLLMProvider } from './local-llm-provider';
import type { LlamaService, GenerateResult } from '../llama-service';
import type { LocalModel } from '@/src/features/core/application/state';
import { isAIProviderError } from '../metadata/types';
import {
  clearLocalLLMSettings,
  addLocalLLMModel,
  selectLocalLLMModel,
} from '@/src/features/settings';
import { setLocalLLMEnabled as setStoreEnabled } from '@/src/stores/settings/local-llm.store';

/**
 * Create a mock llama service for testing
 */
function createMockLlamaService(overrides: Partial<LlamaService> = {}): LlamaService {
  return {
    loadModel: mock(async () => {}),
    isModelLoaded: mock(() => false),
    generate: mock(
      async (): Promise<GenerateResult> => ({
        text: "Mock generated text",
        tokensGenerated: 10,
        timingMs: 100,
      }),
    ),
    // generateStream is required by LlamaService, so provide a default stub
    generateStream: mock(
      async (): Promise<GenerateResult> => ({
        text: "Mock generated text",
        tokensGenerated: 10,
        timingMs: 100,
      }),
    ),
    stopGeneration: mock(async () => {}),
    unloadModel: mock(async () => {}),
    ...overrides,
  };
}

/**
 * Create a mock model
 */
function createMockModel(overrides: Partial<LocalModel> = {}): LocalModel {
  return {
    id: 'test-model',
    name: 'Test Model',
    family: 'qwen',
    size: 1000000,
    downloaded: true,
    path: 'file:///path/to/model.gguf',
    isReady: true,
    ...overrides,
  };
}

describe('createLocalLLMProvider', () => {
    describe('isAvailable', () => {
      test('returns false when not ready', async () => {
        const provider = createLocalLLMProvider({
          isReady: () => false,
        });

        const available = await provider.isAvailable();
        expect(available).toBe(false);
      });

      test('returns true when ready', async () => {
        const provider = createLocalLLMProvider({
          isReady: () => true,
          getSelectedModel: () => createMockModel(),
        });

        const available = await provider.isAvailable();
        expect(available).toBe(true);
      });
    });

    describe('generate', () => {
      test('returns Effect that fails when not ready', async () => {
        const provider = createLocalLLMProvider({
          isReady: () => false,
        });

        const effect = provider.generate({ content: 'test' });
        const exit = await Effect.runPromiseExit(effect);

        expect(Exit.isFailure(exit)).toBe(true);
        if (Exit.isFailure(exit)) {
          const error = exit.cause._tag === 'Fail' ? exit.cause.error : null;
          expect(error).not.toBeNull();
          if (isAIProviderError(error)) {
            expect(error.code).toBe('AI_PROVIDER_UNAVAILABLE');
          }
        }
      });

      test('returns Effect that fails when no model selected', async () => {
        const provider = createLocalLLMProvider({
          isReady: () => true,
          getSelectedModel: () => null,
        });

        const effect = provider.generate({ content: 'test' });
        const exit = await Effect.runPromiseExit(effect);

        expect(Exit.isFailure(exit)).toBe(true);
        if (Exit.isFailure(exit)) {
          const error = exit.cause._tag === 'Fail' ? exit.cause.error : null;
          if (isAIProviderError(error)) {
            expect(error.message).toContain('No model selected');
          }
        }
      });

      test('returns Effect that fails when model has no path', async () => {
        const provider = createLocalLLMProvider({
          isReady: () => true,
          getSelectedModel: () => createMockModel({ path: undefined }),
        });

        const effect = provider.generate({ content: 'test' });
        const exit = await Effect.runPromiseExit(effect);

        expect(Exit.isFailure(exit)).toBe(true);
        if (Exit.isFailure(exit)) {
          const error = exit.cause._tag === 'Fail' ? exit.cause.error : null;
          if (isAIProviderError(error)) {
            expect(error.message).toContain('no path');
          }
        }
      });

      test('returns Effect that succeeds with metadata', async () => {
        const mockService = createMockLlamaService({
          generate: mock(async (prompt: string): Promise<GenerateResult> => {
            if (prompt.includes('Summarize')) {
              return { text: 'Generated summary', tokensGenerated: 10, timingMs: 100 };
            }
            return { text: 'tag1, tag2, tag3', tokensGenerated: 5, timingMs: 50 };
          }),
        });

        const provider = createLocalLLMProvider({
          isReady: () => true,
          getSelectedModel: () => createMockModel(),
          llamaService: mockService,
        });

        const effect = provider.generate({
          title: 'Test Title',
          content: 'Test content for generation.',
        });
        const exit = await Effect.runPromiseExit(effect);

        expect(Exit.isSuccess(exit)).toBe(true);
        if (Exit.isSuccess(exit)) {
          expect(exit.value.summary).toBe('Generated summary');
          expect(exit.value.tags).toEqual(['tag1', 'tag2', 'tag3']);
        }

        // Verify model was loaded
        expect(mockService.loadModel).toHaveBeenCalled();
      });

      test('returns Effect that fails on generation error', async () => {
        const mockService = createMockLlamaService({
          generate: mock(async () => {
            throw new Error('Generation failed');
          }),
        });

        const provider = createLocalLLMProvider({
          isReady: () => true,
          getSelectedModel: () => createMockModel(),
          llamaService: mockService,
        });

        const effect = provider.generate({ content: 'test' });
        const exit = await Effect.runPromiseExit(effect);

        expect(Exit.isFailure(exit)).toBe(true);
        if (Exit.isFailure(exit)) {
          const error = exit.cause._tag === 'Fail' ? exit.cause.error : null;
          if (isAIProviderError(error)) {
            expect(error.code).toBe('AI_PROVIDER_INTERNAL_ERROR');
          }
        }
      });
    });
});

/**
 * Store Integration Tests
 *
 * These tests verify that createLocalLLMProvider correctly reads from the
 * settings store when using default selectors.
 */
describe('local-llm-provider store integration', () => {
  beforeEach(() => {
    clearLocalLLMSettings();
  });

  describe('isAvailable with store', () => {
    test('returns false when enabled=false', async () => {
      addLocalLLMModel({ id: 'test', name: 'Test', family: 'qwen', size: 1000000, downloaded: true, isReady: true });
      selectLocalLLMModel('test');
      // enabled is false by default

      const provider = createLocalLLMProvider();
      const available = await provider.isAvailable();

      expect(available).toBe(false);
    });

    test('returns false when no model is selected', async () => {
      addLocalLLMModel({ id: 'test', name: 'Test', family: 'qwen', size: 1000000, downloaded: true, isReady: true });
      setStoreEnabled(true);
      // No model selected

      const provider = createLocalLLMProvider();
      const available = await provider.isAvailable();

      expect(available).toBe(false);
    });

    test('returns false when selected model is not ready', async () => {
      addLocalLLMModel({ id: 'test', name: 'Test', family: 'qwen', size: 1000000, downloaded: false, isReady: false });
      selectLocalLLMModel('test');
      setStoreEnabled(true);

      const provider = createLocalLLMProvider();
      const available = await provider.isAvailable();

      expect(available).toBe(false);
    });

    test('returns true when enabled + model selected + model ready', async () => {
      addLocalLLMModel({ id: 'test', name: 'Test', family: 'qwen', size: 1000000, downloaded: true, isReady: true });
      selectLocalLLMModel('test');
      setStoreEnabled(true);

      const provider = createLocalLLMProvider();
      const available = await provider.isAvailable();

      expect(available).toBe(true);
    });
  });
});
