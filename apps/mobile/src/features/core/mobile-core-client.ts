import type {
  Conversation,
  ConversationPatch,
  FeedbackEvent,
  GetDueKnowledgeItemsInput,
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
} from '@glimpse/shared';
import { nativeCoreClient } from './native-core-client';
import type { MobileCoreClient } from './types';

function parseJson<T>(value: string): T {
  return JSON.parse(value) as T;
}

function stringifyJson(value: unknown): string {
  return JSON.stringify(value);
}

export const mobileCoreClient: MobileCoreClient = {
  calculateTagOverlap: (input) => nativeCoreClient.calculateTagOverlap(input),
  calculateNextReview: (input) => nativeCoreClient.calculateNextReview(input),
  initializeReviewSchedule: (input) => nativeCoreClient.initializeReviewSchedule(input),
  async saveKnowledgeItem(item: NewKnowledgeItem): Promise<KnowledgeItem> {
    return parseJson(nativeCoreClient.saveKnowledgeItemJson(stringifyJson(item)));
  },
  async listKnowledgeItems(): Promise<KnowledgeItem[]> {
    return parseJson(nativeCoreClient.listKnowledgeItemsJson());
  },
  async listKnowledgeItemsByIds(itemIds: string[]): Promise<KnowledgeItem[]> {
    return parseJson(nativeCoreClient.listKnowledgeItemsByIdsJson(stringifyJson(itemIds)));
  },
  async listWeeklyKnowledgeItems(since: number): Promise<KnowledgeItem[]> {
    return parseJson(nativeCoreClient.listWeeklyKnowledgeItemsJson(since));
  },
  async listPendingKnowledgeItemsForLabeling(limit: number): Promise<KnowledgeItem[]> {
    return parseJson(nativeCoreClient.listPendingKnowledgeItemsForLabelingJson(limit));
  },
  async getKnowledgeItemById(itemId: string): Promise<KnowledgeItem | null> {
    return parseJson(nativeCoreClient.getKnowledgeItemByIdJson(itemId));
  },
  async getDueKnowledgeItems(input: GetDueKnowledgeItemsInput): Promise<KnowledgeItem[]> {
    return parseJson(
      nativeCoreClient.getDueKnowledgeItemsJson(input.now, input.limit ?? null)
    );
  },
  async updateKnowledgeItem(
    itemId: string,
    patch: KnowledgeItemPatch
  ): Promise<KnowledgeItem> {
    return parseJson(
      nativeCoreClient.updateKnowledgeItemJson(itemId, stringifyJson(patch))
    );
  },
  async createConversation(conversation: NewConversation): Promise<Conversation> {
    return parseJson(
      nativeCoreClient.createConversationJson(stringifyJson(conversation))
    );
  },
  async listConversations(): Promise<Conversation[]> {
    return parseJson(nativeCoreClient.listConversationsJson());
  },
  async updateConversation(
    conversationId: string,
    patch: ConversationPatch
  ): Promise<Conversation> {
    return parseJson(
      nativeCoreClient.updateConversationJson(conversationId, stringifyJson(patch))
    );
  },
  async deleteConversation(conversationId: string, deletedAt: number): Promise<void> {
    nativeCoreClient.deleteConversation(conversationId, deletedAt);
  },
  async listConversationMessages(conversationId: string): Promise<Message[]> {
    return parseJson(nativeCoreClient.listConversationMessagesJson(conversationId));
  },
  async addMessage(message: NewMessage): Promise<Message> {
    return parseJson(nativeCoreClient.addMessageJson(stringifyJson(message)));
  },
  async updateMessage(messageId: string, patch: MessagePatch): Promise<Message> {
    return parseJson(
      nativeCoreClient.updateMessageJson(messageId, stringifyJson(patch))
    );
  },
  async deleteMessage(messageId: string, deletedAt: number): Promise<void> {
    nativeCoreClient.deleteMessage(messageId, deletedAt);
  },
  async saveRecommendations(recommendations: NewRecommendation[]): Promise<void> {
    nativeCoreClient.saveRecommendationsJson(stringifyJson(recommendations));
  },
  async listRecommendations(): Promise<Recommendation[]> {
    return parseJson(nativeCoreClient.listRecommendationsJson());
  },
  async listPendingRecommendations(): Promise<Recommendation[]> {
    return parseJson(nativeCoreClient.listPendingRecommendationsJson());
  },
  async listRecentFeedbackEvents(limit: number): Promise<FeedbackEvent[]> {
    return parseJson(nativeCoreClient.listRecentFeedbackEventsJson(limit));
  },
  async logRecommendationFeedback(event: NewFeedbackEvent): Promise<FeedbackEvent> {
    return parseJson(
      nativeCoreClient.logRecommendationFeedbackJson(stringifyJson(event))
    );
  },
  async respondToRecommendation(
    recommendationId: string,
    status: RecommendationStatus,
    event: NewFeedbackEvent
  ): Promise<void> {
    nativeCoreClient.respondToRecommendationJson(
      recommendationId,
      status,
      stringifyJson(event)
    );
  },
};
