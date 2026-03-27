import { describe, expect, test } from 'bun:test';
import { Effect, Exit } from 'effect';
import { createMetadataRouter } from './router';
import type { MetadataInput, MetadataOutput, AIProviderError } from './types';
import { aiProviderError, isAIProviderError } from './types';
import { APPLE_TARGET_ID, STUB_TARGET_ID } from '../targets';
import type { AITarget } from '../targets/types';

describe('metadata router', () => {
  test('executes the resolved target once', async () => {
    const calls: string[] = [];
    const router = createMetadataRouter({
      resolveTarget: () => ({ kind: 'apple', model: 'foundation-model', id: APPLE_TARGET_ID }),
      executeTarget: (target: AITarget, input: MetadataInput) => {
        calls.push(`${target.id}:${input.content}`);
        return Effect.succeed({ summary: 'ok', tags: ['a'] });
      },
    });

    const effect = router.generate({ content: 'hello' });
    const exit = await Effect.runPromiseExit(effect);

    expect(Exit.isSuccess(exit)).toBe(true);
    expect(calls).toEqual([`${APPLE_TARGET_ID}:hello`]);
  });

  test('passes full metadata input to the target executor', async () => {
    let receivedInput: MetadataInput | null = null;

    const router = createMetadataRouter({
      resolveTarget: () => ({ kind: 'stub', id: STUB_TARGET_ID }),
      executeTarget: (_target: AITarget, input: MetadataInput) => {
        receivedInput = input;
        return Effect.succeed({ summary: 'ok', tags: [] });
      },
    });

    const effect = router.generate({
      content: 'Test content',
      title: 'Test Title',
      type: 'note',
    });
    await Effect.runPromise(effect);

    expect(receivedInput).toEqual({
      content: 'Test content',
      title: 'Test Title',
      type: 'note',
    });
  });

  test('does not fall back when executor returns failure', async () => {
    const router = createMetadataRouter({
      resolveTarget: () => ({ kind: 'stub', id: STUB_TARGET_ID }),
      executeTarget: () => Effect.fail(
        aiProviderError('AI_PROVIDER_INTERNAL_ERROR', 'stub', 'failed')
      ),
    });

    const effect = router.generate({ content: 'test' });
    const exit = await Effect.runPromiseExit(effect);

    expect(Exit.isFailure(exit)).toBe(true);
    if (Exit.isFailure(exit)) {
      const error = exit.cause._tag === 'Fail' ? exit.cause.error : null;
      if (isAIProviderError(error)) {
        expect(error.message).toBe('failed');
      }
    }
  });

  test('emits selection and failure callbacks with target id', async () => {
    const selected: string[] = [];
    const failed: string[] = [];

    const router = createMetadataRouter({
      resolveTarget: () => ({ kind: 'stub', id: STUB_TARGET_ID }),
      executeTarget: () => Effect.fail(
        aiProviderError('AI_PROVIDER_INTERNAL_ERROR', 'stub', 'broken')
      ),
      onTargetSelected(targetId: string) {
        selected.push(targetId);
      },
      onTargetFailed(targetId: string, _error: AIProviderError) {
        failed.push(targetId);
      },
    });

    await Effect.runPromise(router.generate({ content: 'test' })).catch(() => {});

    expect(selected).toEqual([STUB_TARGET_ID]);
    expect(failed).toEqual([STUB_TARGET_ID]);
  });

  test('emits success callback with target id', async () => {
    const succeeded: string[] = [];

    const router = createMetadataRouter({
      resolveTarget: () => ({ kind: 'stub', id: STUB_TARGET_ID }),
      executeTarget: () => Effect.succeed({ summary: 'ok', tags: ['stub'] }),
      onTargetSucceeded(targetId: string, _result: MetadataOutput) {
        succeeded.push(targetId);
      },
    });

    await Effect.runPromise(router.generate({ content: 'test' }));

    expect(succeeded).toEqual([STUB_TARGET_ID]);
  });
});
