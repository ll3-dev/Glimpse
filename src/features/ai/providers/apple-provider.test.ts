import { describe, expect, test, mock } from 'bun:test';
import { createAppleProvider, buildSummaryPrompt, buildTagsPrompt, parseTagsResponse } from './apple-provider';
import type { AppleIntelligenceBridge, AppleIntelligenceAvailability, AppleGenerateResult } from '../apple-intelligence-bridge';

/**
 * Create a mock Apple Intelligence bridge for testing
 */
function createMockBridge(overrides: Partial<AppleIntelligenceBridge> = {}): AppleIntelligenceBridge {
  return {
    isAvailable: mock(async (): Promise<AppleIntelligenceAvailability> => ({
      available: true,
    })),
    generate: mock(async (): Promise<AppleGenerateResult> => ({
      text: 'Mock generated text',
    })),
    ...overrides,
  };
}

describe('apple-provider', () => {
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
    test('builds prompt for tag extraction', () => {
      const prompt = buildTagsPrompt({ content: 'Test content' });
      expect(prompt).toContain('tags');
      expect(prompt).toContain('comma-separated');
    });
  });

  describe('parseTagsResponse', () => {
    test('parses comma-separated tags', () => {
      const tags = parseTagsResponse('apple, banana, cherry');
      expect(tags).toEqual(['apple', 'banana', 'cherry']);
    });

    test('limits to 5 tags', () => {
      const tags = parseTagsResponse('a, b, c, d, e, f, g');
      expect(tags.length).toBe(5);
    });
  });

  describe('createAppleProvider', () => {
    describe('isAvailable', () => {
      test('returns false when toggle is disabled', async () => {
        const provider = createAppleProvider({
          bridge: createMockBridge(),
          isToggleEnabled: () => false,
        });

        const available = await provider.isAvailable();
        expect(available).toBe(false);
      });

      test('returns false when bridge reports unavailable', async () => {
        const provider = createAppleProvider({
          bridge: createMockBridge({
            isAvailable: mock(async () => ({
              available: false,
              reason: 'unsupported_os',
            })),
          }),
          isToggleEnabled: () => true,
        });

        const available = await provider.isAvailable();
        expect(available).toBe(false);
      });

      test('returns true when toggle enabled and bridge available', async () => {
        const provider = createAppleProvider({
          bridge: createMockBridge({
            isAvailable: mock(async () => ({ available: true })),
          }),
          isToggleEnabled: () => true,
        });

        const available = await provider.isAvailable();
        expect(available).toBe(true);
      });
    });

    describe('generate', () => {
      test('returns error when toggle is disabled', async () => {
        const provider = createAppleProvider({
          bridge: createMockBridge(),
          isToggleEnabled: () => false,
        });

        const result = await provider.generate({ content: 'test' });

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.code).toBe('AI_PROVIDER_UNAVAILABLE');
          expect(result.error.message).toContain('disabled');
        }
      });

      test('returns error when bridge reports unavailable', async () => {
        const provider = createAppleProvider({
          bridge: createMockBridge({
            isAvailable: mock(async () => ({
              available: false,
              reason: 'unsupported_os',
            })),
          }),
          isToggleEnabled: () => true,
        });

        const result = await provider.generate({ content: 'test' });

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.message).toContain('unsupported_os');
        }
      });

      test('generates summary and tags successfully', async () => {
        const mockBridge = createMockBridge({
          generate: mock(async (prompt: string): Promise<AppleGenerateResult> => {
            if (prompt.includes('Summarize')) {
              return { text: 'This is the generated summary.' };
            }
            return { text: 'apple, banana, cherry' };
          }),
        });

        const provider = createAppleProvider({
          bridge: mockBridge,
          isToggleEnabled: () => true,
        });

        const result = await provider.generate({
          title: 'Test Title',
          content: 'Test content for generation.',
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.summary).toBe('This is the generated summary.');
          expect(result.data.tags).toEqual(['apple', 'banana', 'cherry']);
        }

        // Verify generate was called twice (summary + tags)
        expect(mockBridge.generate).toHaveBeenCalledTimes(2);
      });

      test('handles generation errors', async () => {
        const provider = createAppleProvider({
          bridge: createMockBridge({
            isAvailable: mock(async () => ({ available: true })),
            generate: mock(async () => {
              throw new Error('Apple Intelligence error');
            }),
          }),
          isToggleEnabled: () => true,
        });

        const result = await provider.generate({ content: 'test' });

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.code).toBe('AI_PROVIDER_INTERNAL_ERROR');
          expect(result.error.message).toContain('Apple Intelligence error');
        }
      });

      test('trims whitespace from summary', async () => {
        const provider = createAppleProvider({
          bridge: createMockBridge({
            generate: mock(async (prompt: string): Promise<AppleGenerateResult> => {
              if (prompt.includes('Summarize')) {
                return { text: '  Summary with whitespace  ' };
              }
              return { text: 'tag1' };
            }),
          }),
          isToggleEnabled: () => true,
        });

        const result = await provider.generate({ content: 'test' });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.summary).toBe('Summary with whitespace');
        }
      });
    });
  });
});
