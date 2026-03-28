import { beforeEach, describe, expect, mock, spyOn, test } from 'bun:test';
import type { FeedbackEvent, KnowledgeItem, Recommendation } from '@glimpse/shared';
import {
  calculateTagOverlap,
  createGenerateRecommendations,
  createGetPendingRecommendations,
  createGetRecentFeedbackEvents,
  createGetWeeklyItems,
  createLogRecommendationFeedback,
  createRespondToRecommendation,
  createSaveRecommendations,
} from './index';

function createItem(id: string, tags: string[] | null): KnowledgeItem {
  return {
    id,
    type: 'note',
    title: id,
    body: null,
    url: null,
    summary: null,
    tags,
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
  };
}

describe('recommendation application layer', () => {
  beforeEach(() => {
    spyOn(Date, 'now').mockRestore();
  });

  test('calculateTagOverlap delegates transformed tag input to core', () => {
    const calculateTagOverlapCore = mock(() => 2);
    const left = createItem('left', ['a']);
    const right = createItem('right', ['a', 'b']);

    const overlap = calculateTagOverlap(
      { calculateTagOverlap: calculateTagOverlapCore },
      left,
      right
    );

    expect(overlap).toBe(2);
    expect(calculateTagOverlapCore).toHaveBeenCalledWith({
      left: { tags: ['a'] },
      right: { tags: ['a', 'b'] },
    });
  });

  test('generateRecommendations respects limit zero and propagates dependency failures', async () => {
    const items = [
      createItem('a', ['x']),
      createItem('b', ['x']),
      createItem('c', ['x']),
    ];

    const generate = createGenerateRecommendations({
      coreClient: { listWeeklyKnowledgeItems: mock(async () => items) },
      getWeeklyItems: mock(async () => ({ success: true as const, items })),
    });

    await expect(generate({ since: 0, limit: 0 })).resolves.toEqual({
      success: true,
      recommendations: [
        { itemAId: 'a', itemBId: 'b', reason: 'Shared 1 tag(s)' },
        { itemAId: 'a', itemBId: 'c', reason: 'Shared 1 tag(s)' },
        { itemAId: 'b', itemBId: 'c', reason: 'Shared 1 tag(s)' },
      ],
    });

    const failed = createGenerateRecommendations({
      coreClient: { listWeeklyKnowledgeItems: mock(async () => items) },
      getWeeklyItems: mock(async () => ({
        success: false as const,
        error: { code: 'DATABASE_ERROR', message: 'boom' },
      })),
    });

    await expect(failed()).resolves.toEqual({
      success: false,
      error: { code: 'DATABASE_ERROR', message: 'boom' },
    });
  });

  test('saveRecommendations stamps generated ids and surfaces id collisions', async () => {
    const dateNow = spyOn(Date, 'now');
    dateNow.mockReturnValue(123);
    const saveRecommendationsCore = mock(async (_recommendations: Recommendation[]) => {});

    const save = createSaveRecommendations({
      coreClient: { saveRecommendations: saveRecommendationsCore },
      nanoid: mock(() => 'rec-1').mockReturnValueOnce('rec-1'),
      isIdCollisionError: () => false,
      maxIdCollisionRetries: 1,
    });

    await expect(
      save([{ itemAId: 'a', itemBId: 'b', reason: 'Shared 1 tag(s)' }])
    ).resolves.toEqual({ success: true });
    expect(saveRecommendationsCore).toHaveBeenCalledWith([
      {
        id: 'rec-1',
        itemA_id: 'a',
        itemB_id: 'b',
        reason: 'Shared 1 tag(s)',
        status: 'pending',
        createdAt: 123,
        respondedAt: null,
      },
    ]);

    const collision = createSaveRecommendations({
      coreClient: {
        saveRecommendations: mock(async () => {
          throw new Error('duplicate');
        }),
      },
      nanoid: () => 'rec-dup',
      isIdCollisionError: () => true,
      maxIdCollisionRetries: 1,
    });

    await expect(collision([])).resolves.toEqual({
      success: false,
      error: { code: 'ID_COLLISION', message: 'ID collision' },
    });
    dateNow.mockRestore();
  });

  test('getWeeklyItems passes since through and wraps thrown errors', async () => {
    const success = createGetWeeklyItems({
      coreClient: { listWeeklyKnowledgeItems: mock(async () => [createItem('a', null)]) },
    });
    await expect(success(999)).resolves.toEqual({
      success: true,
      items: [createItem('a', null)],
    });

    const failure = createGetWeeklyItems({
      coreClient: {
        listWeeklyKnowledgeItems: mock(async () => {
          throw new Error('weekly failed');
        }),
      },
    });
    await expect(failure(999)).resolves.toEqual({
      success: false,
      error: { code: 'RECOMMENDATION_ERROR', message: 'weekly failed' },
    });
  });

  test('getPendingRecommendations joins only fully loaded item pairs', async () => {
    const recommendations: Recommendation[] = [
      {
        id: 'rec-1',
        itemA_id: 'a',
        itemB_id: 'b',
        reason: null,
        status: 'pending',
        createdAt: 1,
        respondedAt: null,
      },
      {
        id: 'rec-2',
        itemA_id: 'a',
        itemB_id: 'missing',
        reason: null,
        status: 'pending',
        createdAt: 2,
        respondedAt: null,
      },
    ];

    const getPending = createGetPendingRecommendations({
      coreClient: {
        listPendingRecommendations: mock(async () => recommendations),
        listKnowledgeItemsByIds: mock(async () => [createItem('a', null), createItem('b', null)]),
      },
    });

    await expect(getPending()).resolves.toEqual({
      success: true,
      recommendations: [
        {
          recommendation: recommendations[0],
          itemA: createItem('a', null),
          itemB: createItem('b', null),
        },
      ],
    });
  });

  test('respondToRecommendation and log/get feedback events preserve ids and error mapping', async () => {
    const dateNow = spyOn(Date, 'now');
    dateNow.mockReturnValue(500);

    const respond = createRespondToRecommendation({
      coreClient: {
        respondToRecommendation: mock(async () => {}),
      },
      nanoid: () => 'event-1',
      isIdCollisionError: () => false,
      maxIdCollisionRetries: 1,
    });

    await expect(respond('rec-1', 'accepted', 'accept')).resolves.toEqual({
      success: true,
      recommendationId: 'rec-1',
    });

    const loggedEvent: FeedbackEvent = {
      id: 'event-2',
      recommendationId: 'rec-1',
      action: 'dismiss',
      createdAt: 500,
    };
    const logFeedback = createLogRecommendationFeedback({
      coreClient: {
        logRecommendationFeedback: mock(async () => loggedEvent),
        listRecentFeedbackEvents: mock(async () => [loggedEvent]),
      },
      nanoid: () => 'event-2',
      isIdCollisionError: () => false,
      maxIdCollisionRetries: 1,
    });

    await expect(
      logFeedback({ recommendationId: 'rec-1', action: 'dismiss' })
    ).resolves.toEqual({
      success: true,
      event: loggedEvent,
      eventId: 'event-2',
    });

    const recent = createGetRecentFeedbackEvents({
      coreClient: {
        logRecommendationFeedback: mock(async () => loggedEvent),
        listRecentFeedbackEvents: mock(async () => [loggedEvent]),
      },
      nanoid: () => 'unused',
      isIdCollisionError: () => false,
      maxIdCollisionRetries: 1,
    });

    await expect(recent(1)).resolves.toEqual({
      success: true,
      events: [loggedEvent],
    });
    dateNow.mockRestore();
  });
});
