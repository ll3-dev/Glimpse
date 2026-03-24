import { beforeEach, describe, expect, mock, test } from 'bun:test';
import type { Conversation, KnowledgeItem, NewConversation, NewKnowledgeItem } from '@glimpse/shared';

const bridge = {
  calculateTagOverlap: mock((_input: unknown) => 0),
  calculateNextReview: mock((_input: unknown) => ({ intervalMs: 0, nextReviewAt: 0 })),
  initializeReviewSchedule: mock((_input: unknown) => ({
    nextReviewAt: 0,
    stability: null,
    difficulty: null,
    lastReviewedAt: null,
  })),
  saveKnowledgeItemJson: mock((_payloadJson: string) => ''),
  listKnowledgeItemsJson: mock(() => '[]'),
  listKnowledgeItemsByIdsJson: mock((_itemIdsJson: string) => '[]'),
  listWeeklyKnowledgeItemsJson: mock((_since: number) => '[]'),
  listPendingKnowledgeItemsForLabelingJson: mock((_limit: number) => '[]'),
  getKnowledgeItemByIdJson: mock((_itemId: string) => 'null'),
  getDueKnowledgeItemsJson: mock((_now: number, _limit: number | null) => '[]'),
  updateKnowledgeItemJson: mock((_itemId: string, _patchJson: string) => ''),
  createConversationJson: mock((_payloadJson: string) => ''),
  listConversationsJson: mock(() => '[]'),
  updateConversationJson: mock((_conversationId: string, _patchJson: string) => ''),
  deleteConversation: mock((_conversationId: string, _deletedAt: number) => undefined),
  listConversationMessagesJson: mock((_conversationId: string) => '[]'),
  addMessageJson: mock((_payloadJson: string) => ''),
  updateMessageJson: mock((_messageId: string, _patchJson: string) => ''),
  deleteMessage: mock((_messageId: string, _deletedAt: number) => undefined),
  saveRecommendationsJson: mock((_payloadJson: string) => undefined),
  listRecommendationsJson: mock(() => '[]'),
  listPendingRecommendationsJson: mock(() => '[]'),
  listRecentFeedbackEventsJson: mock((_limit: number) => '[]'),
  logRecommendationFeedbackJson: mock((_payloadJson: string) => ''),
  respondToRecommendationJson: mock(
    (_recommendationId: string, _status: string, _eventJson: string) => undefined
  ),
};

mock.module('./native-core-client', () => ({
  nativeCoreClient: bridge,
}));

const { mobileCoreClient } = await import('./mobile-core-client');

describe('mobileCoreClient JSON bridge contract', () => {
  beforeEach(() => {
    Object.values(bridge).forEach((fn) => {
      if ('mockReset' in fn && typeof fn.mockReset === 'function') {
        fn.mockReset();
      }
    });
  });

  test('serializes input and parses output for saveKnowledgeItem', async () => {
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

    bridge.saveKnowledgeItemJson.mockReturnValueOnce(JSON.stringify(item));

    const result = await mobileCoreClient.saveKnowledgeItem(item);

    expect(bridge.saveKnowledgeItemJson).toHaveBeenCalledWith(JSON.stringify(item));
    expect(result).toEqual(item satisfies KnowledgeItem);
  });

  test('serializes input and parses output for createConversation', async () => {
    const conversation = {
      id: 'conv-1',
      title: 'Test',
      icon: null,
      contextItemId: null,
      createdAt: 1,
      updatedAt: 1,
      deletedAt: null,
    } satisfies NewConversation;

    bridge.createConversationJson.mockReturnValueOnce(JSON.stringify(conversation));

    const result = await mobileCoreClient.createConversation(conversation);

    expect(bridge.createConversationJson).toHaveBeenCalledWith(JSON.stringify(conversation));
    expect(result).toEqual(conversation satisfies Conversation);
  });

  test('passes scalar inputs separately and parses JSON output for getDueKnowledgeItems', async () => {
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

    bridge.getDueKnowledgeItemsJson.mockReturnValueOnce(JSON.stringify(items));

    const result = await mobileCoreClient.getDueKnowledgeItems({ now: 10, limit: 3 });

    expect(bridge.getDueKnowledgeItemsJson).toHaveBeenCalledWith(10, 3);
    expect(result).toEqual(items);
  });
});
