import { describe, expect, test } from 'bun:test';
import { isFailure } from '@/src/lib/effect-result';
import { createMetadataRouter } from './router';
import type { MetadataInput } from './types';
import { APPLE_TARGET_ID, STUB_TARGET_ID } from '../targets';

describe('metadata router', () => {
  test('executes the resolved target once', async () => {
    const calls: string[] = [];
    const router = createMetadataRouter({
      resolveTarget: () => ({ kind: 'apple', model: 'foundation-model', id: APPLE_TARGET_ID }),
      executeTarget: async (target, input) => {
        calls.push(`${target.id}:${input.content}`);
        return {
          success: true,
          data: { summary: 'ok', tags: ['a'] },
        };
      },
    });

    const result = await router.generate({ content: 'hello' });

    expect(result.success).toBe(true);
    expect(calls).toEqual([`${APPLE_TARGET_ID}:hello`]);
  });

  test('passes full metadata input to the target executor', async () => {
    let receivedInput: MetadataInput | null = null;

    const router = createMetadataRouter({
      resolveTarget: () => ({ kind: 'stub', id: STUB_TARGET_ID }),
      executeTarget: async (_target, input) => {
        receivedInput = input;
        return {
          success: true,
          data: { summary: 'ok', tags: [] },
        };
      },
    });

    await router.generate({
      content: 'Test content',
      title: 'Test Title',
      type: 'note',
    });

    expect(receivedInput).toEqual({
      content: 'Test content',
      title: 'Test Title',
      type: 'note',
    });
  });

  test('does not fall back when executor returns failure', async () => {
    const router = createMetadataRouter({
      resolveTarget: () => ({ kind: 'stub', id: STUB_TARGET_ID }),
      executeTarget: async () => ({
        success: false,
        error: {
          _tag: 'APP_ERROR',
          code: 'GENERATION_ERROR',
          message: 'failed',
        },
      }),
    });

    const result = await router.generate({ content: 'test' });

    expect(result.success).toBe(false);
    if (isFailure(result)) {
      expect(result.error.message).toBe('failed');
    }
  });

  test('emits selection and failure callbacks with target id', async () => {
    const selected: string[] = [];
    const failed: string[] = [];

    const router = createMetadataRouter({
      resolveTarget: () => ({ kind: 'stub', id: STUB_TARGET_ID }),
      executeTarget: async () => ({
        success: false,
        error: {
          _tag: 'APP_ERROR',
          code: 'GENERATION_ERROR',
          message: 'broken',
        },
      }),
      onTargetSelected(targetId) {
        selected.push(targetId);
      },
      onTargetFailed(targetId) {
        failed.push(targetId);
      },
    });

    await router.generate({ content: 'test' });

    expect(selected).toEqual([STUB_TARGET_ID]);
    expect(failed).toEqual([STUB_TARGET_ID]);
  });

  test('emits success callback with target id', async () => {
    const succeeded: string[] = [];

    const router = createMetadataRouter({
      resolveTarget: () => ({ kind: 'stub', id: STUB_TARGET_ID }),
      executeTarget: async () => ({
        success: true,
        data: { summary: 'ok', tags: ['stub'] },
      }),
      onTargetSucceeded(targetId) {
        succeeded.push(targetId);
      },
    });

    await router.generate({ content: 'test' });

    expect(succeeded).toEqual([STUB_TARGET_ID]);
  });
});
