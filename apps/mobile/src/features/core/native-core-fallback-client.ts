import type {
  Conversation,
  FeedbackEvent,
  KnowledgeItem,
  Message,
  Recommendation,
} from '@glimpse/shared';

import type { BridgeCoreClient } from './types';
import { InMemoryStorage } from './native-core-in-memory-storage';

const DAY_MS = 24 * 60 * 60 * 1000;
const FORGOTTEN_REVIEW_INTERVAL_MS = 4 * 60 * 60 * 1000;

function createNotFoundError(entityName: string, id: string): Error {
  return new Error(`${entityName} not found: ${id}`);
}

function unwrapOrThrow<T>(entityName: string, id: string, value: T | undefined): T {
  if (value === undefined) {
    throw createNotFoundError(entityName, id);
  }
  return value;
}

function calculateTagOverlap(
  input: Parameters<BridgeCoreClient['calculateTagOverlap']>[0],
): number {
  const leftTags = new Set(input.left.tags ?? []);
  const rightTags = new Set(input.right.tags ?? []);
  if (leftTags.size === 0 && rightTags.size === 0) {
    return 0;
  }

  let intersection = 0;
  for (const tag of leftTags) {
    if (rightTags.has(tag)) {
      intersection += 1;
    }
  }

  const union = leftTags.size + rightTags.size - intersection;
  return union > 0 ? intersection / union : 0;
}

function calculateNextReview(
  input: Parameters<BridgeCoreClient['calculateNextReview']>[0],
): ReturnType<BridgeCoreClient['calculateNextReview']> {
  const intervalMs =
    input.feedbackType === 'remembered' ? DAY_MS : FORGOTTEN_REVIEW_INTERVAL_MS;

  return {
    intervalMs,
    nextReviewAt: input.now + intervalMs,
  };
}

function initializeReviewSchedule(
  input: Parameters<BridgeCoreClient['initializeReviewSchedule']>[0],
): ReturnType<BridgeCoreClient['initializeReviewSchedule']> {
  return {
    nextReviewAt: input.createdAt + (input.intervalMs ?? DAY_MS),
    stability: null,
    difficulty: null,
    lastReviewedAt: null,
  };
}

export function createFallbackCoreClient(
  storage: InMemoryStorage = new InMemoryStorage(),
): BridgeCoreClient {
  return {
    async initialize(): Promise<void> {},

    calculateTagOverlap,
    calculateNextReview,
    initializeReviewSchedule,

    async saveKnowledgeItem(item: KnowledgeItem): Promise<KnowledgeItem> {
      storage.addKnowledgeItem(item);
      return item;
    },

    async listKnowledgeItems(): Promise<KnowledgeItem[]> {
      return storage.getAllKnowledgeItems();
    },

    async getKnowledgeItemById(itemId: string): Promise<KnowledgeItem | null> {
      return storage.getKnowledgeItem(itemId) ?? null;
    },

    async updateKnowledgeItem(
      itemId: string,
      patch: Partial<KnowledgeItem>,
    ): Promise<KnowledgeItem> {
      return unwrapOrThrow(
        'Knowledge item',
        itemId,
        storage.updateKnowledgeItem(itemId, patch),
      );
    },

    async createConversation(conversation: Conversation): Promise<Conversation> {
      storage.addConversation(conversation);
      return conversation;
    },

    async listConversations(): Promise<Conversation[]> {
      return storage.getAllConversations();
    },

    async updateConversation(
      conversationId: string,
      patch: Partial<Conversation>,
    ): Promise<Conversation> {
      return unwrapOrThrow(
        'Conversation',
        conversationId,
        storage.updateConversation(conversationId, patch),
      );
    },

    async deleteConversation(conversationId: string): Promise<void> {
      storage.deleteConversation(conversationId);
    },

    async listConversationMessages(conversationId: string): Promise<Message[]> {
      return storage.getMessages(conversationId);
    },

    async addMessage(message: Message): Promise<Message> {
      storage.addMessage(message.conversationId, message);
      return message;
    },

    async updateMessage(
      messageId: string,
      patch: Partial<Message>,
    ): Promise<Message> {
      return unwrapOrThrow('Message', messageId, storage.updateMessage(messageId, patch));
    },

    async deleteMessage(messageId: string): Promise<void> {
      storage.deleteMessage(messageId);
    },

    async saveRecommendations(recommendations: Recommendation[]): Promise<void> {
      for (const recommendation of recommendations) {
        storage.addRecommendation(recommendation);
      }
    },

    async listRecommendations(): Promise<Recommendation[]> {
      return storage.getAllRecommendations();
    },

    async listPendingRecommendations(): Promise<Recommendation[]> {
      return storage
        .getAllRecommendations()
        .filter((recommendation) => recommendation.status === 'pending');
    },

    async respondToRecommendation(
      recommendationId: string,
      status: 'accepted' | 'ignored' | 'dismissed',
    ): Promise<void> {
      storage.updateRecommendation(recommendationId, {
        status,
        respondedAt: Date.now(),
      });
    },

    async listRecentFeedbackEvents(limit: number): Promise<FeedbackEvent[]> {
      return storage.getRecentFeedbackEvents(limit);
    },

    async logRecommendationFeedback(event: FeedbackEvent): Promise<FeedbackEvent> {
      storage.addFeedbackEvent(event);
      return event;
    },
  };
}
