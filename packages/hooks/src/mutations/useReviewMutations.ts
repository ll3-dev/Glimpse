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
}

/**
 * 복습 액션이 라이브러리에서 바꾸는 것은 이 아이템의 review 필드뿐이다.
 * knowledgeItems.all 전체 무효화 대신 캐시된 리스트에서 해당 아이템만
 * 교체해 라이브러리 목록 전체 refetch를 막는다. 아이템이 캐시에 없으면
 * 아무것도 하지 않는다(마운트된 리스트가 없다는 뜻).
 */
function patchKnowledgeItemInList(
  qc: ReturnType<typeof useQueryClient>,
  item: KnowledgeItem,
  patch: Partial<KnowledgeItem>,
) {
  qc.setQueryData<KnowledgeItem[]>(queryKeys.knowledgeItems.all, (current) => {
    if (!current) return current;
    const index = current.findIndex((entry) => entry.id === item.id);
    if (index === -1) return current;
    const next = current.slice();
    next[index] = { ...next[index], ...patch };
    return next;
  });
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
    onSuccess: (_, { item }) => {
      invalidateReviewQueries(qc);
      patchKnowledgeItemInList(qc, item, decisionFromItem(item, 'remembered'));
    },
  });
}

function decisionFromItem(item: KnowledgeItem, feedback: 'remembered' | 'forgotten') {
  const decision = scheduleNextReview(item, feedback);
  const now = decision.nextReviewAt - decision.intervalMs;
  return {
    lastReviewedAt: now,
    nextReviewAt: decision.nextReviewAt,
    stability: decision.stability,
    difficulty: decision.difficulty,
    updatedAt: now,
  };
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
    onSuccess: (_, { item }) => {
      invalidateReviewQueries(qc);
      patchKnowledgeItemInList(qc, item, decisionFromItem(item, 'forgotten'));
    },
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
    onSuccess: (_, { item }) => {
      qc.invalidateQueries({ queryKey: queryKeys.review.dueItems });
      const decision = scheduleNextReview(item, 'postponed');
      patchKnowledgeItemInList(qc, item, {
        nextReviewAt: decision.nextReviewAt,
      });
    },
  });
}
