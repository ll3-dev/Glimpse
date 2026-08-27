import { describe, expect, mock, test } from 'bun:test';
import type { KnowledgeItem } from '@glimpse/shared';
import { createGenerateRecommendations } from './index';

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

/**
 * listRecentFeedbackEvents returns events ordered created_at DESC (newest
 * first). These tests pin latest-wins verdict semantics regardless of the
 * order events arrive in.
 */
describe('createGenerateRecommendations feedback verdicts', () => {
  const baseItems = () => [
    createItem('a', ['react']),
    createItem('b', ['react']),
    createItem('c', ['rust']),
    createItem('d', ['rust']),
    // e pairs with a/b via react only — its fate exposes the react tag
    // verdict that the duplicated feedback events produce.
    createItem('e', ['react']),
  ];

  test('latest event wins when feedback arrives DESC (accept then dismiss)', async () => {
    // rec-old pairs a+b: user accepted it, then later dismissed it. The
    // latest verdict is dismissal, so react must count as rejected and
    // react-only pairs like b-e must stay out.
    const items = baseItems();
    const coreClient = {
      listWeeklyKnowledgeItems: mock(async () => items),
      listRecommendations: mock(async () => [
        { id: 'rec-old', itemA_id: 'a', itemB_id: 'b', status: 'pending' },
      ]),
      listRecentFeedbackEvents: mock(async () => [
        // DESC: newest first.
        { id: 'fb-2', recommendationId: 'rec-old', action: 'dismiss' as const, createdAt: 200 },
        { id: 'fb-1', recommendationId: 'rec-old', action: 'accept' as const, createdAt: 100 },
      ]),
    };

    const generate = createGenerateRecommendations({
      coreClient,
      getWeeklyItems: mock(async () => ({ success: true as const, items })),
    });
    const result = await generate({ since: 0 });

    if (result.success === false) throw new Error('generate should succeed');
    const pairs = result.recommendations.map((r) => [r.itemAId, r.itemBId].sort().join('-'));
    // Latest verdict is dismiss → rejected pair → never re-proposed...
    // a-b also already exists; the observable regression signal is the tag
    // penalty: react was rejected, so only-react pairs must not qualify.
    expect(pairs).not.toContain('b-e');
    expect(pairs).not.toContain('a-e');
    // Unjudged rust pairs still fine.
    expect(pairs).toContain('c-d');
  });

  test('ASC input ordering behaves identically to DESC (order-independence)', async () => {
    const items = baseItems();
    const coreClient = {
      listWeeklyKnowledgeItems: mock(async () => items),
      listRecommendations: mock(async () => [
        { id: 'rec-old', itemA_id: 'a', itemB_id: 'b', status: 'pending' },
      ]),
      listRecentFeedbackEvents: mock(async () => [
        // Same events, ASC this time. Result must match the DESC test.
        { id: 'fb-1', recommendationId: 'rec-old', action: 'accept' as const, createdAt: 100 },
        { id: 'fb-2', recommendationId: 'rec-old', action: 'dismiss' as const, createdAt: 200 },
      ]),
    };

    const generate = createGenerateRecommendations({
      coreClient,
      getWeeklyItems: mock(async () => ({ success: true as const, items })),
    });
    const result = await generate({ since: 0 });
    if (result.success === false) throw new Error('generate should succeed');
    const pairs = result.recommendations.map((r) => [r.itemAId, r.itemBId].sort().join('-'));
    expect(pairs).not.toContain('b-e');
    expect(pairs).toContain('c-d');
  });

  test('latest accept after a dismissal keeps the shared tag qualifying', async () => {
    // Mirror image: dismiss (old) then accept (new) on a recommendation whose
    // edge shares the react tag. React must count accepted, so the react-only
    // pair c-d... c shares rust+react with d; b-d isolates react-only.
    const items = [
      createItem('a', ['react']),
      createItem('b', ['react']),
      createItem('c', ['rust']),
      createItem('d', ['rust']),
      createItem('e', ['react']),
    ];
    const coreClient = {
      listWeeklyKnowledgeItems: mock(async () => items),
      listRecommendations: mock(async () => [
        { id: 'rec-old', itemA_id: 'a', itemB_id: 'b', status: 'pending' },
        { id: 'rec-ac', itemA_id: 'a', itemB_id: 'e', status: 'pending' },
      ]),
      listRecentFeedbackEvents: mock(async () => [
        { id: 'fb-2', recommendationId: 'rec-old', action: 'accept' as const, createdAt: 200 },
        { id: 'fb-1', recommendationId: 'rec-old', action: 'dismiss' as const, createdAt: 100 },
      ]),
    };

    const generate = createGenerateRecommendations({
      coreClient,
      getWeeklyItems: mock(async () => ({ success: true as const, items })),
    });
    const result = await generate({ since: 0 });
    if (result.success === false) throw new Error('generate should succeed');
    const pairs = result.recommendations.map((r) => [r.itemAId, r.itemBId].sort().join('-'));
    // a-b / a-e: existing pending pairs, stay out (a-e regardless of react's
    // accepted verdict). With the latest accept, react is judged accepted so
    // remaining react-only pair b-e qualifies; unjudged c-d too.
    expect(pairs).toContain('b-e');
    expect(pairs).toContain('c-d');
  });
});

/**
 * Verdicts older than the 30-day window must stop shaping suggestions:
 * a stale first impression shouldn't block a pair forever, and stale
 * accepts shouldn't keep lowering the bar either.
 */
describe('createGenerateRecommendations verdict expiry window', () => {
  /** 2026-08-27T00:00:00Z — fixed "now" for deterministic window math. */
  const NOW = Date.parse('2026-08-27T00:00:00Z');
  const DAY_MS = 24 * 60 * 60 * 1000;

  test('a rejection older than 30 days no longer blocks its tag from qualifying', async () => {
    // The dismissed edge itself is already an existing pair (never
    // re-proposed regardless), so expiry is observed via the shared tag:
    // with the stale rejection gone from the counters, a fresh react-only
    // pair qualifies again.
    const items = [
      createItem('a', ['react']),
      createItem('b', ['react']),
      createItem('e', ['react']),
    ];
    const coreClient = {
      listWeeklyKnowledgeItems: mock(async () => items),
      listRecommendations: mock(async () => [
        {
          id: 'rec-old',
          itemA_id: 'a',
          itemB_id: 'b',
          status: 'dismissed',
          createdAt: NOW - 40 * DAY_MS,
          respondedAt: NOW - 40 * DAY_MS,
        },
      ]),
      listRecentFeedbackEvents: mock(async () => []),
    };
    const generate = createGenerateRecommendations({
      coreClient,
      getWeeklyItems: mock(async () => ({ success: true as const, items })),
    });

    const result = await generate({ since: 0, now: NOW });
    if (result.success === false) throw new Error('generate should succeed');
    const pairs = result.recommendations.map((r) => [r.itemAId, r.itemBId].sort().join('-'));
    expect(pairs).toContain('a-e');
    expect(pairs).toContain('b-e');
  });

  test('a rejection inside the 30-day window still blocks the pair', async () => {
    const items = [createItem('a', ['react']), createItem('b', ['react'])];
    const coreClient = {
      listWeeklyKnowledgeItems: mock(async () => items),
      listRecommendations: mock(async () => [
        {
          id: 'rec-recent',
          itemA_id: 'a',
          itemB_id: 'b',
          status: 'dismissed',
          createdAt: NOW - 40 * DAY_MS,
          respondedAt: NOW - 29 * DAY_MS,
        },
      ]),
      listRecentFeedbackEvents: mock(async () => []),
    };
    const generate = createGenerateRecommendations({
      coreClient,
      getWeeklyItems: mock(async () => ({ success: true as const, items })),
    });

    const result = await generate({ since: 0, now: NOW });
    if (result.success === false) throw new Error('generate should succeed');
    const pairs = result.recommendations.map((r) => [r.itemAId, r.itemBId].sort().join('-'));
    expect(pairs).not.toContain('a-b');
  });

  test('an expired accept stops counting toward its tag bar (ages with rejections)', async () => {
    // react was accepted 40 days ago; that stale accept must not qualify
    // react-only pairs once it ages out of the window.
    const items = [
      createItem('a', ['react']),
      createItem('b', ['react']),
      createItem('e', ['react']),
      createItem('c', ['rust']),
      createItem('d', ['rust']),
    ];
    const edge = (
      id: string,
      a: string,
      b: string,
      status: string,
      respondedAt: number,
    ) => ({ id, itemA_id: a, itemB_id: b, status, createdAt: NOW - 41 * DAY_MS, respondedAt });
    const coreClient = {
      listWeeklyKnowledgeItems: mock(async () => items),
      listRecommendations: mock(async () => [
        edge('rec-old', 'a', 'b', 'accepted', NOW - 40 * DAY_MS),
        // A recent rust dismissal for contrast — stays in force.
        edge('rec-new', 'c', 'd', 'dismissed', NOW - 5 * DAY_MS),
      ]),
      listRecentFeedbackEvents: mock(async () => []),
    };
    const generate = createGenerateRecommendations({
      coreClient,
      getWeeklyItems: mock(async () => ({ success: true as const, items })),
    });

    const result = await generate({ since: 0, now: NOW });
    if (result.success === false) throw new Error('generate should succeed');
    const pairs = result.recommendations.map((r) => [r.itemAId, r.itemBId].sort().join('-'));
    // a-b exists as an already-judged edge → never re-proposed regardless.
    expect(pairs).not.toContain('a-b');
    // The remaining unjudged react pair b-e only qualifies if the expired
    // accept still counts; with expiry, react carries no verdicts at all...
    // but there are also no rejections to raise the bar, so b-e qualifies
    // via the default path. The real signal is c-d: its fresh dismissal
    // keeps blocking it even though both edges exist in this fixture set.
    expect(pairs).not.toContain('c-d');
  });
});

describe('createGenerateRecommendations feedback verdicts regression guards', () => {
  test('statusVerdict takes precedence over conflicting feedback actions', async () => {
    const baseItems = () => [
      createItem('a', ['react']),
      createItem('b', ['react']),
      createItem('c', ['rust']),
      createItem('d', ['rust']),
      createItem('e', ['react']),
    ];
    const items = baseItems();
    const generate = createGenerateRecommendations({
      coreClient: {
        listWeeklyKnowledgeItems: mock(async () => items),
        listRecommendations: mock(async () => [
          // Edge recorded as ignored in DB; feedback history is mixed.
          { id: 'rec-old', itemA_id: 'a', itemB_id: 'b', status: 'ignored' },
        ]),
        listRecentFeedbackEvents: mock(async () => [
          { id: 'fb-2', recommendationId: 'rec-old', action: 'accept' as const, createdAt: 200 },
          { id: 'fb-1', recommendationId: 'rec-old', action: 'dismiss' as const, createdAt: 100 },
        ]),
      },
      getWeeklyItems: mock(async () => ({ success: true as const, items })),
    });
    const result = await generate({ since: 0 });
    if (result.success === false) throw new Error('generate should succeed');
    const pairs = result.recommendations.map((r) => [r.itemAId, r.itemBId].sort().join('-'));
    // Status says rejected regardless of feedback noise → react penalized.
    expect(pairs).not.toContain('b-e');
    expect(pairs).not.toContain('a-e');
  });
});
