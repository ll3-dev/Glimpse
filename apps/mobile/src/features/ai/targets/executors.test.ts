import { describe, expect, test } from 'bun:test';
import { Effect, Exit } from 'effect';
import {
  executeMetadataTargetEffect,
  executeLabelingTargetEffect,
  executeChatTargetEffect,
} from './executors';
import type { KnowledgeItem } from '@glimpse/shared';

describe('Effect-based Executors', () => {
  describe('executeMetadataTargetEffect', () => {
    test('returns Effect that succeeds with stub target', async () => {
      const effect = executeMetadataTargetEffect(
        { kind: 'stub' },
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
        { kind: 'rules' },
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
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    test('returns Effect that succeeds with rules target', async () => {
      const effect = executeLabelingTargetEffect(
        { kind: 'rules' },
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
        { kind: 'stub' },
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
    test('returns Effect that succeeds with stub target', async () => {
      const effect = executeChatTargetEffect(
        { kind: 'stub' },
        { userText: 'Hello, this is a test message.' }
      );
      const exit = await Effect.runPromiseExit(effect);

      expect(Exit.isSuccess(exit)).toBe(true);
      if (Exit.isSuccess(exit)) {
        expect(typeof exit.value).toBe('string');
        expect(exit.value.length).toBeGreaterThan(0);
      }
    });

    test('returns Effect that fails with apple target', async () => {
      const effect = executeChatTargetEffect(
        { kind: 'apple' },
        { userText: 'Hello' }
      );
      const exit = await Effect.runPromiseExit(effect);

      expect(Exit.isFailure(exit)).toBe(true);
    });

    test('returns Effect that fails with rules target', async () => {
      const effect = executeChatTargetEffect(
        { kind: 'rules' },
        { userText: 'Hello' }
      );
      const exit = await Effect.runPromiseExit(effect);

      expect(Exit.isFailure(exit)).toBe(true);
    });
  });
});
