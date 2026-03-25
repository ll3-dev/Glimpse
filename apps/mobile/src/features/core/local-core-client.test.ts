import { describe, expect, test } from 'bun:test';
import type { NewConversation, NewKnowledgeItem, NewMessage, NewRecommendation } from '@glimpse/shared';

// TODO: Update tests to use native CoreClient via Nitro bridge
// These tests were for the JS-based local-core-client which has been removed

describe.skip('localCoreClient', () => {
  // Tests need to be rewritten for Nitro bridge
});

  test('persists and updates knowledge items with null patch values', () => {
    const item = {
      id: 'item-1',
      type: 'note',
      title: 'Title',
      body: 'Body',
      url: null,
      summary: null,
      tags: ['a'],
      labels: null,
      provisionalLabels: null,
      labelStatus: 'pending',
      labelSource: 'rules',
      labelVersion: 'v1',
      labelScore: 0.7,
      labelRequestedAt: 10,
      labelCompletedAt: null,
      labelError: null,
      createdAt: 1,
      updatedAt: 1,
      stability: null,
      difficulty: null,
      lastReviewedAt: null,
      nextReviewAt: 3,
    } satisfies NewKnowledgeItem;

    nativeCoreClient.saveKnowledgeItem(item);
    const updated = nativeCoreClient.updateKnowledgeItem(item.id, {
      title: null,
      tags: [],
      nextReviewAt: null,
    });

    expect(updated.title).toBeNull();
    expect(updated.tags).toEqual([]);
    expect(updated.nextReviewAt).toBeNull();
  });

  test('lists due knowledge items ordered by nextReviewAt asc', () => {
    nativeCoreClient.saveKnowledgeItem({
      id: 'item-a',
      type: 'note',
      title: 'A',
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
      nextReviewAt: 20,
    });
    nativeCoreClient.saveKnowledgeItem({
      id: 'item-b',
      type: 'note',
      title: 'B',
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
      createdAt: 2,
      updatedAt: 2,
      stability: null,
      difficulty: null,
      lastReviewedAt: null,
      nextReviewAt: 10,
    });

    expect(nativeCoreClient.getDueKnowledgeItems(20, null).map((item) => item.id)).toEqual([
      'item-b',
      'item-a',
    ]);
  });

  test('marks conversation and messages deleted together', () => {
    const conversation = {
      id: 'conv-1',
      title: 'Conv',
      icon: null,
      contextItemId: null,
      createdAt: 1,
      updatedAt: 1,
      deletedAt: null,
    } satisfies NewConversation;
    const message = {
      id: 'msg-1',
      conversationId: 'conv-1',
      role: 'user',
      content: 'hello',
      createdAt: 2,
      updatedAt: null,
      deletedAt: null,
    } satisfies NewMessage;

    nativeCoreClient.createConversation(conversation);
    nativeCoreClient.addMessage(message);
    nativeCoreClient.deleteConversation(conversation.id, 99);

    expect(nativeCoreClient.listConversations()).toEqual([]);
    expect(nativeCoreClient.listConversationMessages(conversation.id)).toEqual([]);
  });

  test('respondToRecommendation updates status and logs feedback', () => {
    const recommendation = {
      id: 'rec-1',
      itemA_id: 'a',
      itemB_id: 'b',
      reason: 'same tag',
      status: 'pending',
      createdAt: 1,
      respondedAt: null,
    } satisfies NewRecommendation;

    nativeCoreClient.saveRecommendations([recommendation]);
    nativeCoreClient.respondToRecommendation('rec-1', 'accepted', {
      id: 'evt-1',
      recommendationId: 'rec-1',
      action: 'accept',
      createdAt: 5,
    });

    expect(nativeCoreClient.listRecommendations()[0]?.status).toBe('accepted');
    expect(nativeCoreClient.listRecentFeedbackEvents(10)).toHaveLength(1);
  });

  test('writes versioned store payloads', () => {
    nativeCoreClient.saveKnowledgeItem({
      id: 'item-versioned',
      type: 'note',
      title: 'Versioned',
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
      nextReviewAt: null,
    });

    expect(JSON.parse(__localCoreStoreTestUtils.readRawStore() ?? 'null')).toMatchObject({
      version: 1,
      data: {
        knowledgeItems: {
          'item-versioned': {
            id: 'item-versioned',
          },
        },
      },
    });
  });

  test('migrates legacy bare store payloads on read', () => {
    __localCoreStoreTestUtils.writeRawStore(
      JSON.stringify({
        knowledgeItems: {
          legacy: {
            id: 'legacy',
            type: 'note',
            title: 'Legacy',
            body: null,
            url: null,
            summary: null,
            tags: [],
            createdAt: 1,
            updatedAt: 1,
            stability: null,
            difficulty: null,
            lastReviewedAt: null,
            nextReviewAt: null,
          },
        },
      })
    );

    expect(readCoreStore().knowledgeItems.legacy?.title).toBe('Legacy');
    expect(JSON.parse(__localCoreStoreTestUtils.readRawStore() ?? 'null')).toMatchObject({
      version: 1,
      data: {
        knowledgeItems: {
          legacy: {
            id: 'legacy',
          },
        },
      },
    });
  });
});
