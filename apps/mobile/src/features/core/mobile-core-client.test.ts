import { beforeEach, describe, expect, mock, test } from 'bun:test';
import type { Conversation, KnowledgeItem, NewConversation, NewKnowledgeItem } from '@glimpse/shared';

const bridge = {
  calculateTagOverlap: mock((_input: unknown) => Promise.resolve(0)),
  calculateNextReview: mock((_input: unknown) => Promise.resolve({ intervalMs: 0, nextReviewAt: 0 })),
  initializeReviewSchedule: mock((_input: unknown) => Promise.resolve({
    nextReviewAt: 0,
    stability: null,
    difficulty: null,
    lastReviewedAt: null,
  })),
  saveKnowledgeItem: mock((_item: unknown) => ({})),
  listKnowledgeItems: mock(() => []),
  getKnowledgeItemById: mock((_itemId: string) => null),
  updateKnowledgeItem: mock((_itemId: string, _patch: unknown) => ({})),
  createConversation: mock((_conversation: unknown) => ({})),
  listConversations: mock(() => []),
  updateConversation: mock((_conversationId: string, _patch: unknown) => ({})),
  deleteConversation: mock((_conversationId: string, _deletedAt: number) => undefined),
  listConversationMessages: mock((_conversationId: string) => []),
  addMessage: mock((_message: unknown) => ({})),
  updateMessage: mock((_messageId: string, _patch: unknown) => ({})),
  deleteMessage: mock((_messageId: string, _deletedAt: number) => undefined),
  saveRecommendations: mock((_recommendations: unknown[]) => undefined),
  listRecommendations: mock(() => []),
  listPendingRecommendations: mock(() => []),
  listRecentFeedbackEvents: mock((_limit: number) => []),
  logRecommendationFeedback: mock((_event: unknown) => ({})),
  respondToRecommendation: mock(
    (_recommendationId: string, _status: string, _event: unknown) => undefined
  ),
  exportData: mock(() => '{}'),
  exportDelta: mock((_sinceClockMs: number) => '{}'),
  syncDataRevision: mock(() => 0),
  importData: mock((_dataJson: string) => ({
    knowledgeItems: 0,
    conversations: 0,
    messages: 0,
    recommendations: 0,
    feedbackEvents: 0,
  })),
  mergeData: mock((_dataJson: string) => ({
    knowledgeItems: 0,
    conversations: 0,
    messages: 0,
    recommendations: 0,
    feedbackEvents: 0,
  })),
  deleteAllData: mock(() => undefined),
};

mock.module('./native-core-client', () => ({
  nativeCoreClient: bridge,
}));

const { mobileCoreClient } = await import('./mobile-core-client');

describe('mobileCoreClient typed bridge contract', () => {
  beforeEach(() => {
    Object.values(bridge).forEach((fn) => {
      if ('mockReset' in fn && typeof fn.mockReset === 'function') {
        fn.mockReset();
      }
    });
  });

  test('passes typed values through for saveKnowledgeItem', async () => {
    const item = {
      id: 'item-1',
      type: 'note',
      title: 'Title',
      body: 'Body',
      url: null,
      summary: null,
      tags: ['tag'],
      labels: null,
      provisionalLabels: null,
      labelStatus: null,
      labelSource: null,
      labelVersion: null,
      labelScore: null,
      labelRequestedAt: null,
      labelCompletedAt: null,
      labelError: null,
      createdAt: 1,
      updatedAt: 1,
      stability: null,
      difficulty: null,
      lastReviewedAt: null,
      nextReviewAt: null,
    } satisfies NewKnowledgeItem;

    bridge.saveKnowledgeItem.mockReturnValueOnce(item);

    const result = await mobileCoreClient.saveKnowledgeItem(item);

    expect(bridge.saveKnowledgeItem).toHaveBeenCalledWith(item);
    expect(result).toEqual(item satisfies KnowledgeItem);
  });

  test('builds application-layer knowledge queries on top of listKnowledgeItems', async () => {
    const items = [
      {
        id: 'due-item',
        type: 'note',
        title: 'Due',
        body: null,
        url: null,
        summary: null,
        tags: [],
        labels: null,
        provisionalLabels: null,
        labelStatus: 'pending',
        labelSource: null,
        labelVersion: null,
        labelScore: null,
        labelRequestedAt: null,
        labelCompletedAt: null,
        labelError: null,
        createdAt: 10,
        updatedAt: 10,
        stability: null,
        difficulty: null,
        lastReviewedAt: null,
        nextReviewAt: 20,
      },
      {
        id: 'fresh-item',
        type: 'note',
        title: 'Fresh',
        body: null,
        url: null,
        summary: null,
        tags: [],
        labels: null,
        provisionalLabels: null,
        labelStatus: 'final',
        labelSource: null,
        labelVersion: null,
        labelScore: null,
        labelRequestedAt: null,
        labelCompletedAt: null,
        labelError: null,
        createdAt: 40,
        updatedAt: 40,
        stability: null,
        difficulty: null,
        lastReviewedAt: null,
        nextReviewAt: 80,
      },
    ] satisfies KnowledgeItem[];

    bridge.listKnowledgeItems.mockReturnValue(items);

    await expect(mobileCoreClient.listKnowledgeItemsByIds(['fresh-item'])).resolves.toEqual([items[1]]);
    await expect(mobileCoreClient.listWeeklyKnowledgeItems(20)).resolves.toEqual([items[1]]);
    await expect(mobileCoreClient.listPendingKnowledgeItemsForLabeling(1)).resolves.toEqual([
      items[0],
    ]);

    expect(bridge.listKnowledgeItems).toHaveBeenCalledTimes(3);
  });

  test('passes typed values through for createConversation', async () => {
    const conversation = {
      id: 'conv-1',
      title: 'Test',
      icon: null,
      contextItemId: null,
      createdAt: 1,
      updatedAt: 1,
      deletedAt: null,
    } satisfies NewConversation;

    bridge.createConversation.mockReturnValueOnce(conversation);

    const result = await mobileCoreClient.createConversation(conversation);

    expect(bridge.createConversation).toHaveBeenCalledWith(conversation);
    expect(result).toEqual(conversation satisfies Conversation);
  });

  test('passes object input through for getDueKnowledgeItems', async () => {
    const items = [
      {
        id: 'item-1',
        type: 'note',
        title: 'Due',
        body: null,
        url: null,
        summary: null,
        tags: [],
        labels: null,
        provisionalLabels: null,
        labelStatus: null,
        labelSource: null,
        labelVersion: null,
        labelScore: null,
        labelRequestedAt: null,
        labelCompletedAt: null,
        labelError: null,
        createdAt: 1,
        updatedAt: 1,
        stability: null,
        difficulty: null,
        lastReviewedAt: null,
        nextReviewAt: 5,
      },
    ] satisfies KnowledgeItem[];

    bridge.listKnowledgeItems.mockReturnValueOnce(items);

    const result = await mobileCoreClient.getDueKnowledgeItems({ now: 10, limit: 3 });

    expect(bridge.listKnowledgeItems).toHaveBeenCalled();
    expect(result).toEqual(items);
  });

  test('forwards exportDelta and syncDataRevision to the native client', async () => {
    // The upstream delta path and useAutoSync's change detection hang on
    // these two optional methods being delegated — a missing forwarder here
    // silently disables them in the real app while mocks keep tests green.
    bridge.exportDelta.mockReturnValueOnce(Promise.resolve('{"delta":true}'));
    bridge.syncDataRevision.mockReturnValueOnce(Promise.resolve(41));

    await expect(mobileCoreClient.exportDelta?.(123)).resolves.toBe('{"delta":true}');
    await expect(mobileCoreClient.syncDataRevision?.()).resolves.toBe(41);
    expect(bridge.exportDelta).toHaveBeenCalledWith(123);
  });

  test('returns an empty list when getDueKnowledgeItems is called with limit zero', async () => {
    const items = [
      {
        id: 'item-1',
        type: 'note',
        title: 'Due',
        body: null,
        url: null,
        summary: null,
        tags: [],
        labels: null,
        provisionalLabels: null,
        labelStatus: null,
        labelSource: null,
        labelVersion: null,
        labelScore: null,
        labelRequestedAt: null,
        labelCompletedAt: null,
        labelError: null,
        createdAt: 1,
        updatedAt: 1,
        stability: null,
        difficulty: null,
        lastReviewedAt: null,
        nextReviewAt: 5,
      },
    ] satisfies KnowledgeItem[];

    bridge.listKnowledgeItems.mockReturnValueOnce(items);

    await expect(mobileCoreClient.getDueKnowledgeItems({ now: 10, limit: 0 })).resolves.toEqual([]);
  });
});
