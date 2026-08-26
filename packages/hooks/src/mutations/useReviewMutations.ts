import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { KnowledgeItem } from '@glimpse/shared';
import { calculateNextReviewState } from '@glimpse/features';
import type { ReviewFeedbackType } from '@glimpse/features';
import { useCoreClient } from '../core-client-context';
import { queryKeys } from '../query-keys';

/**
 * Shared scheduler entry for the desktop review screen.
 *
 * The caller passes the due item; the scheduler derives the FSRS-lite
 * decision (next interval + stability/difficulty memory state) from the
 * item's own review history — identical to the mobile review actions and the
 * in-memory fallback client. `now` defaults to the current time and is
 * injectable for tests.
 */
export function scheduleNextReview(
  item: KnowledgeItem,
  feedbackType: ReviewFeedbackType,
  now = Date.now(),
) {
  return calculateNextReviewState(
    item.lastReviewedAt,
    item.nextReviewAt,
    feedbackType,
    now,
    { stabilityDays: item.stability ?? 0.5, difficulty: item.difficulty ?? 5.0 },
  );
}

function invalidateReviewQueries(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: queryKeys.review.dueItems });
  qc.invalidateQueries({ queryKey: queryKeys.knowledgeItems.all });
}

export function useMarkAsReviewedMutation() {
  const coreClient = useCoreClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ item }: { item: KnowledgeItem }) => {
      // The scheduler always produces a decision here, so stability/difficulty
      // are plain values (not NullableValue tristate patches).
      const decision = scheduleNextReview(item, 'remembered');
      const now = decision.nextReviewAt - decision.intervalMs;
      return coreClient.updateKnowledgeItem(item.id, {
        lastReviewedAt: now,
        nextReviewAt: decision.nextReviewAt,
        stability: decision.stability,
        difficulty: decision.difficulty,
        updatedAt: now,
      } as Partial<KnowledgeItem>);
    },
    onSuccess: () => invalidateReviewQueries(qc),
  });
}

export function useMarkAsForgottenMutation() {
  const coreClient = useCoreClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ item }: { item: KnowledgeItem }) => {
      const decision = scheduleNextReview(item, 'forgotten');
      const now = decision.nextReviewAt - decision.intervalMs;
      return coreClient.updateKnowledgeItem(item.id, {
        lastReviewedAt: now,
        nextReviewAt: decision.nextReviewAt,
        stability: decision.stability,
        difficulty: decision.difficulty,
        updatedAt: now,
      } as Partial<KnowledgeItem>);
    },
    onSuccess: () => invalidateReviewQueries(qc),
  });
}

export function usePostponeReviewMutation() {
  const coreClient = useCoreClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ item }: { item: KnowledgeItem }) => {
      // Postponing only moves nextReviewAt — same "pushed forward" branch the
      // shared scheduler uses; memory state stays untouched.
      const decision = scheduleNextReview(item, 'postponed');
      return coreClient.updateKnowledgeItem(item.id, {
        nextReviewAt: decision.nextReviewAt,
        updatedAt: Date.now(),
      } as Partial<KnowledgeItem>);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.review.dueItems }),
  });
}
