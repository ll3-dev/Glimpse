import { describe, expect, test, mock, beforeEach } from 'bun:test';
import { createLocalLLMProvider, buildSummaryPrompt, buildTagsPrompt, parseTagsResponse } from './local-llm-provider';
import type { LlamaService, GenerateResult } from '../llama-service';
import type { LocalModel } from '@/src/stores/settings/local-llm.store';
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
    path: 'file:///path/to/model.gguf',
    size: 1000000,
    isReady: true,
    ...overrides,
  };
}

describe('local-llm-provider', () => {
  describe('buildSummaryPrompt', () => {
    test('builds prompt with content only', () => {
      const prompt = buildSummaryPrompt({ content: 'Test content' });
      expect(prompt).toContain('Test content');
      expect(prompt).toContain('Summarize');
    });

    test('builds prompt with title and content', () => {
      const prompt = buildSummaryPrompt({
        title: 'Test Title',
        content: 'Test content',
      });
      expect(prompt).toContain('Title: Test Title');
      expect(prompt).toContain('Test content');
    });
  });

  describe('buildTagsPrompt', () => {
    test('builds prompt with content only', () => {
      const prompt = buildTagsPrompt({ content: 'Test content' });
      expect(prompt).toContain('Test content');
      expect(prompt).toContain('tags');
    });

    test('builds prompt with title and content', () => {
      const prompt = buildTagsPrompt({
        title: 'Test Title',
        content: 'Test content',
      });
      expect(prompt).toContain('Title: Test Title');
    });
  });

  describe('parseTagsResponse', () => {
    test('parses comma-separated tags', () => {
      const tags = parseTagsResponse('apple, banana, cherry');
      expect(tags).toEqual(['apple', 'banana', 'cherry']);
    });

    test('parses newline-separated tags', () => {
      const tags = parseTagsResponse('apple\nbanana\ncherry');
      expect(tags).toEqual(['apple', 'banana', 'cherry']);
    });

    test('removes quotes and hash symbols', () => {
      const tags = parseTagsResponse('"apple", #banana, \'cherry\'');
      expect(tags).toEqual(['apple', 'banana', 'cherry']);
    });

    test('limits to 5 tags', () => {
      const tags = parseTagsResponse('a, b, c, d, e, f, g');
      expect(tags.length).toBe(5);
    });

    test('returns unique tags', () => {
      const tags = parseTagsResponse('apple, banana, apple, cherry');
      expect(tags).toEqual(['apple', 'banana', 'cherry']);
    });

    test('filters empty tags', () => {
      const tags = parseTagsResponse('apple, , banana, , cherry');
      expect(tags).toEqual(['apple', 'banana', 'cherry']);
    });
  });

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
      test('returns error when not ready', async () => {
        const provider = createLocalLLMProvider({
          isReady: () => false,
        });

        const result = await provider.generate({ content: 'test' });

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.code).toBe('AI_PROVIDER_UNAVAILABLE');
        }
      });

      test('returns error when no model selected', async () => {
        const provider = createLocalLLMProvider({
          isReady: () => true,
          getSelectedModel: () => null,
        });

        const result = await provider.generate({ content: 'test' });

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.message).toContain('No model selected');
        }
      });

      test('returns error when model has no path', async () => {
        const provider = createLocalLLMProvider({
          isReady: () => true,
          getSelectedModel: () => createMockModel({ path: undefined }),
        });

        const result = await provider.generate({ content: 'test' });

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.message).toContain('no path');
        }
      });

      test('loads model and generates summary/tags', async () => {
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

        const result = await provider.generate({
          title: 'Test Title',
          content: 'Test content for generation.',
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.summary).toBe('Generated summary');
          expect(result.data.tags).toEqual(['tag1', 'tag2', 'tag3']);
        }

        // Verify model was loaded
        expect(mockService.loadModel).toHaveBeenCalled();
      });

      test('handles generation errors', async () => {
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

        const result = await provider.generate({ content: 'test' });

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.code).toBe('AI_PROVIDER_INTERNAL_ERROR');
          expect(result.error.message).toContain('Generation failed');
        }
      });

      test('reuses loaded model for subsequent calls', async () => {
        const mockService = createMockLlamaService({
          isModelLoaded: mock(() => true),
          generate: mock(async (): Promise<GenerateResult> => ({
            text: 'Generated text',
            tokensGenerated: 10,
            timingMs: 100,
          })),
        });

        const provider = createLocalLLMProvider({
          isReady: () => true,
          getSelectedModel: () => createMockModel({ id: 'same-model' }),
          llamaService: mockService,
        });

        // First call
        await provider.generate({ content: 'test1' });
        const firstLoadCalls = (mockService.loadModel as ReturnType<typeof mock>).mock.calls.length;

        // Second call with same model
        await provider.generate({ content: 'test2' });
        const secondLoadCalls = (mockService.loadModel as ReturnType<typeof mock>).mock.calls.length;

        // Should not load model again
        expect(secondLoadCalls).toBe(firstLoadCalls);
      });
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
      addLocalLLMModel({ id: 'test', name: 'Test', isReady: true });
      selectLocalLLMModel('test');
      // enabled is false by default

      const provider = createLocalLLMProvider();
      const available = await provider.isAvailable();

      expect(available).toBe(false);
    });

    test('returns false when no model is selected', async () => {
      addLocalLLMModel({ id: 'test', name: 'Test', isReady: true });
      setStoreEnabled(true);
      // No model selected

      const provider = createLocalLLMProvider();
      const available = await provider.isAvailable();

      expect(available).toBe(false);
    });

    test('returns false when selected model is not ready', async () => {
      addLocalLLMModel({ id: 'test', name: 'Test', isReady: false });
      selectLocalLLMModel('test');
      setStoreEnabled(true);

      const provider = createLocalLLMProvider();
      const available = await provider.isAvailable();

      expect(available).toBe(false);
    });

    test('returns true when enabled + model selected + model ready', async () => {
      addLocalLLMModel({ id: 'test', name: 'Test', isReady: true });
      selectLocalLLMModel('test');
      setStoreEnabled(true);

      const provider = createLocalLLMProvider();
      const available = await provider.isAvailable();

      expect(available).toBe(true);
    });
  });
});
