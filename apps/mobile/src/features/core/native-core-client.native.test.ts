import { beforeEach, describe, expect, mock, test } from 'bun:test';

const createHybridObject = mock(() => {
  throw new Error('nitro unavailable');
});

mock.module('react-native-nitro-modules', () => ({
  NitroModules: {
    createHybridObject,
  },
}));

const {
  nativeCoreClient,
  nativeCoreBridgeHelpers,
} = await import('./native-core-client.native');

describe('nativeCoreClient local review calculations', () => {
  beforeEach(() => {
    createHybridObject.mockReset();
    createHybridObject.mockImplementation(() => {
      throw new Error('nitro unavailable');
    });
  });

  test('calculates tag overlap locally', () => {
    expect(
      nativeCoreClient.calculateTagOverlap({
        left: { tags: ['a', 'b'] },
        right: { tags: ['b', 'c'] },
      })
    ).toBeCloseTo(1 / 3);
  });

  test('initializes review schedule locally', () => {
    expect(
      nativeCoreClient.initializeReviewSchedule({
        createdAt: 10,
      })
    ).toEqual({
      nextReviewAt: 10 + 24 * 60 * 60 * 1000,
      stability: null,
      difficulty: null,
      lastReviewedAt: null,
    });
  });

  test('calculates next review from provided now value', () => {
    expect(
      nativeCoreClient.calculateNextReview({
        lastReviewedAt: 0,
        nextReviewAt: 24 * 60 * 60 * 1000,
        feedbackType: 'remembered',
        now: 100,
      })
    ).toEqual({
      intervalMs: 24 * 60 * 60 * 1000,
      nextReviewAt: 100 + 24 * 60 * 60 * 1000,
    });
  });

  test('builds typed patch payloads with explicit presence', () => {
    const updatedConversation = nativeCoreBridgeHelpers.toConversationPatch({
      contextItemId: 'item-1',
      updatedAt: 2,
    });

    expect(updatedConversation).toEqual({
      title: { hasValue: false, isNull: false, value: '' },
      icon: { hasValue: false, isNull: false, value: '' },
      contextItemId: { hasValue: true, isNull: false, value: 'item-1' },
      updatedAt: { hasValue: true, value: 2 },
      deletedAt: { hasValue: false, isNull: false, value: 0 },
    });

    const updatedMessage = nativeCoreBridgeHelpers.toMessagePatch({
      content: 'hello',
      deletedAt: null,
    });

    expect(updatedMessage).toEqual({
      content: { hasValue: true, value: 'hello' },
      updatedAt: { hasValue: false, isNull: false, value: 0 },
      deletedAt: { hasValue: true, isNull: true, value: 0 },
    });

    const updatedItem = nativeCoreBridgeHelpers.toKnowledgeItemPatch({
      type: 'note',
      title: null,
      tags: ['a', 'b'],
    });

    expect(updatedItem.type).toEqual({ hasValue: true, value: 'note' });
    expect(updatedItem.title).toEqual({ hasValue: true, isNull: true, value: '' });
    expect(updatedItem.tags).toEqual({ hasValue: true, isNull: false, value: ['a', 'b'] });
  });
});
