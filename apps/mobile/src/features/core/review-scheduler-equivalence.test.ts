/**
 * Cross-boundary scheduler equivalence — the plan's success criterion.
 *
 * Identical feedback-history inputs must produce identical outputs from every
 * entry point into the review scheduler:
 *   1. mobile review actions (packages/features createMarkAsReviewed etc.)
 *   2. the in-memory fallback CoreClient (native-core-fallback-client)
 *   3. the desktop mutation entry (packages/hooks scheduleNextReview)
 */
import { describe, expect, test } from 'bun:test';
import type { KnowledgeItem } from '@glimpse/shared';
import { calculateNextReviewState, createMarkAsReviewed, createMarkAsForgotten, createPostponeReview } from '@glimpse/features';
import { scheduleNextReview } from '@glimpse/hooks';
import { createFallbackCoreClient } from './native-core-fallback-client';

const DAY_MS = 24 * 60 * 60 * 1000;
const NOW = 30 * DAY_MS;

const ITEM: KnowledgeItem = {
  id: 'equiv-item',
  type: 'note',
  title: 'Equivalence',
  body: 'body',
  url: null,
  summary: null,
  tags: null,
  labels: null,
  provisionalLabels: null,
  labelStatus: null,
  labelSource: null,
  labelVersion: null,
  labelScore: null,
  labelRequestedAt: null,
  labelCompletedAt: null,
  labelError: null,
  createdAt: 0,
  updatedAt: 0,
  stability: 2.5,
  difficulty: 6.5,
  lastReviewedAt: 26 * DAY_MS,
  nextReviewAt: 29 * DAY_MS,
};

function storageWith(item: KnowledgeItem) {
  let stored = item;
  return {
    storedRef: () => stored,
    getKnowledgeItemById: async () => stored,
    updateKnowledgeItem: async (_id: string, patch: Partial<KnowledgeItem>) => {
      stored = { ...stored, ...patch };
      return stored;
    },
  };
}

describe('cross-boundary scheduler equivalence', () => {
  for (const feedbackType of ['remembered', 'forgotten', 'postponed'] as const) {
    test(`${feedbackType}: mobile action == fallback client == desktop entry`, async () => {
      // (1) Mobile action path.
      const actionStorage = storageWith({ ...ITEM });
      const createAction =
        feedbackType === 'remembered'
          ? createMarkAsReviewed
          : feedbackType === 'forgotten'
            ? createMarkAsForgotten
            : createPostponeReview;
      const actionResult = await createAction({
        coreClient: actionStorage,
        calculateNextReviewFromFeedback:
          calculateNextReviewState as Parameters<typeof createMarkAsReviewed>[0]['calculateNextReviewFromFeedback'],
      })(ITEM.id, NOW);
      if (!actionResult.success) throw new Error(actionResult.error.message);

      // (2) Fallback CoreClient path.
      const fallback = createFallbackCoreClient();
      await fallback.saveKnowledgeItem({ ...ITEM });
      const fallbackDecision = await fallback.calculateNextReview({
        lastReviewedAt: ITEM.lastReviewedAt,
        nextReviewAt: ITEM.nextReviewAt,
        feedbackType,
        now: NOW,
        stability: ITEM.stability,
        difficulty: ITEM.difficulty,
      });

      // (3) Desktop mutation entry (pure part of useReviewMutations).
      const desktopDecision = scheduleNextReview(ITEM, feedbackType, NOW);

      // Persisted patch on the mobile action must carry exactly the decision
      // both other entry points compute.
      expect(actionResult.item.nextReviewAt).toBe(fallbackDecision.nextReviewAt);
      expect(actionResult.item.nextReviewAt).toBe(desktopDecision.nextReviewAt);
      if (feedbackType !== 'postponed') {
        expect(actionResult.item.stability).toBe(fallbackDecision.stability);
        expect(actionResult.item.difficulty).toBeCloseTo(fallbackDecision.difficulty, 12);
        expect(actionResult.item.stability).toBe(desktopDecision.stability);
        expect(actionResult.item.difficulty).toBe(desktopDecision.difficulty);
      }
      expect(desktopDecision.intervalMs).toBe(fallbackDecision.intervalMs);
      expect(desktopDecision.nextReviewAt).toBe(NOW + desktopDecision.intervalMs);

      // Fallback and desktop also agree on all decision fields verbatim.
      expect(fallbackDecision).toEqual({
        intervalMs: desktopDecision.intervalMs,
        nextReviewAt: desktopDecision.nextReviewAt,
        stability: desktopDecision.stability,
        difficulty: desktopDecision.difficulty,
      });
    });
  }

  test('golden numbers: one shared fixture input -> identical outputs', () => {
    const decision = scheduleNextReview(ITEM, 'remembered', NOW);
    // elapsed = min(now - last=4d, stability*2=5d) = 4d; base = max(4, 2.5, .5)=4
    // penalty = 1 + (6.5-5)/20 = 1.075; stability = max(4*1.9*1.075, 2.5)=8.17
    expect(decision.stability).toBeCloseTo(8.17, 10);
    expect(decision.difficulty).toBe(6);
    expect(decision.intervalMs).toBe(Math.round(8.17 * DAY_MS));
    expect(decision.nextReviewAt).toBe(NOW + Math.round(8.17 * DAY_MS));
  });
});
