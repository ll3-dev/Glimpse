import type {
  CalculateNextReviewInput,
  CalculateNextReviewOutput,
  CalculateTagOverlapInput,
  Conversation,
  ConversationPatch,
  FeedbackEvent,
  InitializeReviewScheduleInput,
  InitializeReviewScheduleOutput,
  KnowledgeItem,
  KnowledgeItemPatch,
  Message,
  MessagePatch,
  NewConversation,
  NewFeedbackEvent,
  NewKnowledgeItem,
  NewMessage,
  NewRecommendation,
  Recommendation,
  RecommendationStatus,
  ReviewFeedbackType,
} from '@glimpse/shared';
import type { KeyValueStorage } from '../../ports/key-value-storage';
import { createLocalCoreStore } from './local-core-store';

const DEFAULT_INITIAL_REVIEW_INTERVAL_MS = 24 * 60 * 60 * 1000;
const MIN_REVIEW_INTERVAL_MS = 24 * 60 * 60 * 1000;
const MAX_REVIEW_INTERVAL_MS = 30 * 24 * 60 * 60 * 1000;

const FEEDBACK_MULTIPLIERS: Record<ReviewFeedbackType, number> = {
  remembered: 2,
  postponed: 1,
};

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function applyPatch<T extends object>(target: T, patch: Partial<T>): T {
  const next = { ...target };

  for (const [key, value] of Object.entries(patch) as [keyof T, T[keyof T]][]) {
    if (value !== undefined) {
      next[key] = value;
    }
  }

  return next;
}

function requireRecord<T>(value: T | undefined, label: string, id: string): T {
  if (value === undefined) {
    throw new Error(`${label} not found: ${id}`);
  }

  return value;
}

function sortByCreatedAtDesc<T extends { createdAt: number }>(items: T[]): T[] {
  return items.sort((left, right) => right.createdAt - left.createdAt);
}

function sortByUpdatedAtDesc<T extends { updatedAt: number }>(items: T[]): T[] {
  return items.sort((left, right) => right.updatedAt - left.updatedAt);
}

function sortByCreatedAtAsc<T extends { createdAt: number }>(items: T[]): T[] {
  return items.sort((left, right) => left.createdAt - right.createdAt);
}

function sortByOptionalNumberAsc<T>(items: T[], getValue: (item: T) => number | null | undefined): T[] {
  return items.sort((left, right) => {
    const leftValue = getValue(left) ?? Number.MAX_SAFE_INTEGER;
    const rightValue = getValue(right) ?? Number.MAX_SAFE_INTEGER;
    return leftValue - rightValue;
  });
}

function calculateCurrentInterval(
  lastReviewedAt: number | null,
  nextReviewAt: number | null
): number {
  if (lastReviewedAt != null && nextReviewAt != null) {
    return nextReviewAt - lastReviewedAt;
  }

  return DEFAULT_INITIAL_REVIEW_INTERVAL_MS;
}

function clampInterval(intervalMs: number): number {
  return Math.max(MIN_REVIEW_INTERVAL_MS, Math.min(MAX_REVIEW_INTERVAL_MS, intervalMs));
}

function calculateAdjustedInterval(
  currentIntervalMs: number,
  feedbackType: ReviewFeedbackType
): number {
  return clampInterval(currentIntervalMs * FEEDBACK_MULTIPLIERS[feedbackType]);
}

export function createLocalCoreClient(storage: KeyValueStorage) {
  const { readCoreStore, resetCoreStoreForTests, updateCoreStore } = createLocalCoreStore(storage);

  const nativeCoreClient = {
    isAvailable(): boolean {
      return true;
    },
    calculateTagOverlap(input: CalculateTagOverlapInput): number {
      const leftTags = new Set(input.left.tags ?? []);
      const rightTags = new Set(input.right.tags ?? []);

      let overlap = 0;
      for (const tag of leftTags) {
        if (rightTags.has(tag)) {
          overlap += 1;
        }
      }

      return overlap;
    },

    calculateNextReview(input: CalculateNextReviewInput): CalculateNextReviewOutput {
      const intervalMs = calculateAdjustedInterval(
        calculateCurrentInterval(input.lastReviewedAt, input.nextReviewAt),
        input.feedbackType
      );

      return {
        intervalMs,
        nextReviewAt: input.now + intervalMs,
      };
    },

    initializeReviewSchedule(
      input: InitializeReviewScheduleInput
    ): InitializeReviewScheduleOutput {
      const intervalMs = input.intervalMs ?? DEFAULT_INITIAL_REVIEW_INTERVAL_MS;

      return {
        nextReviewAt: input.createdAt + intervalMs,
        stability: null,
        difficulty: null,
        lastReviewedAt: null,
      };
    },

    saveKnowledgeItem(item: NewKnowledgeItem): KnowledgeItem {
      return updateCoreStore((data) => {
        data.knowledgeItems[item.id] = clone(item);
        return clone(data.knowledgeItems[item.id]);
      });
    },

    listKnowledgeItems(): KnowledgeItem[] {
      const data = readCoreStore();
      return sortByCreatedAtDesc(Object.values(data.knowledgeItems)).map(clone);
    },

    listKnowledgeItemsByIds(itemIds: string[]): KnowledgeItem[] {
      const data = readCoreStore();
      return itemIds
        .map((itemId) => data.knowledgeItems[itemId])
        .filter((item): item is KnowledgeItem => item !== undefined)
        .map(clone);
    },

    listWeeklyKnowledgeItems(since: number): KnowledgeItem[] {
      const data = readCoreStore();
      return sortByCreatedAtDesc(
        Object.values(data.knowledgeItems).filter((item) => item.createdAt >= since)
      ).map(clone);
    },

    listPendingKnowledgeItemsForLabeling(limit: number): KnowledgeItem[] {
      const data = readCoreStore();
      return sortByOptionalNumberAsc(
        Object.values(data.knowledgeItems).filter((item) => item.labelStatus === 'pending'),
        (item) => item.labelRequestedAt
      )
        .slice(0, Math.max(limit, 0))
        .map(clone);
    },

    getKnowledgeItemById(itemId: string): KnowledgeItem | null {
      const item = readCoreStore().knowledgeItems[itemId];
      return item ? clone(item) : null;
    },

    getDueKnowledgeItems(now: number, limit: number | null): KnowledgeItem[] {
      const dueItems = sortByOptionalNumberAsc(
        Object.values(readCoreStore().knowledgeItems).filter(
          (item) => item.nextReviewAt != null && item.nextReviewAt <= now
        ),
        (item) => item.nextReviewAt
      );

      const cappedItems = limit != null && limit > 0 ? dueItems.slice(0, limit) : dueItems;
      return cappedItems.map(clone);
    },

    updateKnowledgeItem(itemId: string, patch: KnowledgeItemPatch): KnowledgeItem {
      return updateCoreStore((data) => {
        const current = requireRecord(data.knowledgeItems[itemId], 'knowledge item', itemId);
        const next = applyPatch<KnowledgeItem>(current, patch as Partial<KnowledgeItem>);
        data.knowledgeItems[itemId] = next;
        return clone(next);
      });
    },

    createConversation(conversation: NewConversation): Conversation {
      return updateCoreStore((data) => {
        data.conversations[conversation.id] = clone(conversation);
        return clone(data.conversations[conversation.id]);
      });
    },

    listConversations(): Conversation[] {
      const data = readCoreStore();
      return sortByUpdatedAtDesc(
        Object.values(data.conversations).filter((conversation) => conversation.deletedAt == null)
      ).map(clone);
    },

    updateConversation(
      conversationId: string,
      patch: ConversationPatch
    ): Conversation {
      return updateCoreStore((data) => {
        const current = requireRecord(data.conversations[conversationId], 'conversation', conversationId);
        const next = applyPatch<Conversation>(current, patch as Partial<Conversation>);
        data.conversations[conversationId] = next;
        return clone(next);
      });
    },

    deleteConversation(conversationId: string, deletedAt: number): void {
      updateCoreStore((data) => {
        const conversation = requireRecord(
          data.conversations[conversationId],
          'conversation',
          conversationId
        );

        data.conversations[conversationId] = {
          ...conversation,
          deletedAt,
          updatedAt: deletedAt,
        };

        for (const message of Object.values(data.messages)) {
          if (message.conversationId === conversationId) {
            data.messages[message.id] = {
              ...message,
              deletedAt,
            };
          }
        }
      });
    },

    listConversationMessages(conversationId: string): Message[] {
      const data = readCoreStore();
      return sortByCreatedAtAsc(
        Object.values(data.messages).filter(
          (message) =>
            message.conversationId === conversationId && message.deletedAt == null
        )
      ).map(clone);
    },

    addMessage(message: NewMessage): Message {
      return updateCoreStore((data) => {
        requireRecord(data.conversations[message.conversationId], 'conversation', message.conversationId);
        data.messages[message.id] = clone(message);

        const conversation = data.conversations[message.conversationId];
        data.conversations[message.conversationId] = {
          ...conversation,
          updatedAt: message.createdAt,
        };

        return clone(data.messages[message.id]);
      });
    },

    updateMessage(messageId: string, patch: MessagePatch): Message {
      return updateCoreStore((data) => {
        const current = requireRecord(data.messages[messageId], 'message', messageId);
        const next = applyPatch<Message>(current, patch as Partial<Message>);
        data.messages[messageId] = next;
        return clone(next);
      });
    },

    deleteMessage(messageId: string, deletedAt: number): void {
      updateCoreStore((data) => {
        const current = requireRecord(data.messages[messageId], 'message', messageId);
        data.messages[messageId] = {
          ...current,
          deletedAt,
        };
      });
    },

    saveRecommendations(recommendations: NewRecommendation[]): void {
      updateCoreStore((data) => {
        for (const recommendation of recommendations) {
          data.recommendations[recommendation.id] = clone(recommendation);
        }
      });
    },

    listRecommendations(): Recommendation[] {
      return Object.values(readCoreStore().recommendations).map(clone);
    },

    listPendingRecommendations(): Recommendation[] {
      return Object.values(readCoreStore().recommendations)
        .filter((recommendation) => recommendation.status === 'pending')
        .map(clone);
    },

    listRecentFeedbackEvents(limit: number): FeedbackEvent[] {
      return Object.values(readCoreStore().feedbackEvents)
        .sort((left, right) => right.createdAt - left.createdAt)
        .slice(0, Math.max(limit, 0))
        .map(clone);
    },

    logRecommendationFeedback(event: NewFeedbackEvent): FeedbackEvent {
      return updateCoreStore((data) => {
        data.feedbackEvents[event.id] = clone(event);
        return clone(data.feedbackEvents[event.id]);
      });
    },

    respondToRecommendation(
      recommendationId: string,
      status: RecommendationStatus,
      event: NewFeedbackEvent
    ): void {
      updateCoreStore((data) => {
        const recommendation = requireRecord(
          data.recommendations[recommendationId],
          'recommendation',
          recommendationId
        );

        data.recommendations[recommendationId] = {
          ...recommendation,
          status,
          respondedAt: event.createdAt,
        };
        data.feedbackEvents[event.id] = clone(event);
      });
    },
  };

  return {
    nativeCoreClient,
    __localCoreClientTestUtils: {
      resetStore: resetCoreStoreForTests,
    },
  };
}
