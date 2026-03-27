import { describe, expect, test, mock } from 'bun:test';
import { Effect, Exit } from 'effect';
import { createAppleProvider } from './apple-provider';
import type { AppleIntelligenceBridge, AppleIntelligenceAvailability, AppleGenerateResult } from '../apple-intelligence-bridge';
import { isAIProviderError } from '../metadata/types';

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
            isAvailable: mock(async (): Promise<AppleIntelligenceAvailability> => ({
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
      test('returns Effect that fails when toggle is disabled', async () => {
        const provider = createAppleProvider({
          bridge: createMockBridge(),
          isToggleEnabled: () => false,
        });

        const effect = provider.generate({ content: 'test' });
        const exit = await Effect.runPromiseExit(effect);

        expect(Exit.isFailure(exit)).toBe(true);
        if (Exit.isFailure(exit)) {
          const error = exit.cause._tag === 'Fail' ? exit.cause.error : null;
          expect(error).not.toBeNull();
          expect(isAIProviderError(error)).toBe(true);
          if (isAIProviderError(error)) {
            expect(error.code).toBe('AI_PROVIDER_UNAVAILABLE');
            expect(error.message).toContain('disabled');
          }
        }
      });

      test('returns Effect that fails when bridge reports unavailable', async () => {
        const provider = createAppleProvider({
          bridge: createMockBridge({
            isAvailable: mock(async (): Promise<AppleIntelligenceAvailability> => ({
              available: false,
              reason: 'unsupported_os',
            })),
          }),
          isToggleEnabled: () => true,
        });

        const effect = provider.generate({ content: 'test' });
        const exit = await Effect.runPromiseExit(effect);

        expect(Exit.isFailure(exit)).toBe(true);
        if (Exit.isFailure(exit)) {
          const error = exit.cause._tag === 'Fail' ? exit.cause.error : null;
          expect(error).not.toBeNull();
          if (isAIProviderError(error)) {
            expect(error.message).toContain('unsupported_os');
          }
        }
      });

      test('returns Effect that succeeds with metadata', async () => {
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

        const effect = provider.generate({
          title: 'Test Title',
          content: 'Test content for generation.',
        });
        const exit = await Effect.runPromiseExit(effect);

        expect(Exit.isSuccess(exit)).toBe(true);
        if (Exit.isSuccess(exit)) {
          expect(exit.value.summary).toBe('This is the generated summary.');
          expect(exit.value.tags).toEqual(['apple', 'banana', 'cherry']);
        }

        // Verify generate was called twice (summary + tags)
        expect(mockBridge.generate).toHaveBeenCalledTimes(2);
      });

      test('returns Effect that fails on generation error', async () => {
        const provider = createAppleProvider({
          bridge: createMockBridge({
            isAvailable: mock(async () => ({ available: true })),
            generate: mock(async () => {
              throw new Error('Apple Intelligence error');
            }),
          }),
          isToggleEnabled: () => true,
        });

        const effect = provider.generate({ content: 'test' });
        const exit = await Effect.runPromiseExit(effect);

        expect(Exit.isFailure(exit)).toBe(true);
        if (Exit.isFailure(exit)) {
          const error = exit.cause._tag === 'Fail' ? exit.cause.error : null;
          expect(error).not.toBeNull();
          if (isAIProviderError(error)) {
            expect(error.code).toBe('AI_PROVIDER_INTERNAL_ERROR');
          }
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

        const effect = provider.generate({ content: 'test' });
        const exit = await Effect.runPromiseExit(effect);

        expect(Exit.isSuccess(exit)).toBe(true);
        if (Exit.isSuccess(exit)) {
          expect(exit.value.summary).toBe('Summary with whitespace');
        }
      });
    });
});
