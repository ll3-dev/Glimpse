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
  });
});
