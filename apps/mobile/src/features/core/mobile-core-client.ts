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
import { crabyCoreClient } from './craby-client';
import type { MobileCoreClient } from './types';

function parseJson<T>(value: string): T {
  return JSON.parse(value) as T;
}

function stringifyJson(value: unknown): string {
  return JSON.stringify(value);
}

export const mobileCoreClient: MobileCoreClient = {
  calculateTagOverlap: (input) => crabyCoreClient.calculateTagOverlap(input),
  calculateNextReview: (input) => crabyCoreClient.calculateNextReview(input),
  initializeReviewSchedule: (input) => crabyCoreClient.initializeReviewSchedule(input),
  async saveKnowledgeItem(item: NewKnowledgeItem): Promise<KnowledgeItem> {
    return parseJson(crabyCoreClient.saveKnowledgeItemJson(stringifyJson(item)));
  },
  async listKnowledgeItems(): Promise<KnowledgeItem[]> {
    return parseJson(crabyCoreClient.listKnowledgeItemsJson());
  },
  async listKnowledgeItemsByIds(itemIds: string[]): Promise<KnowledgeItem[]> {
    return parseJson(crabyCoreClient.listKnowledgeItemsByIdsJson(stringifyJson(itemIds)));
  },
  async listWeeklyKnowledgeItems(since: number): Promise<KnowledgeItem[]> {
    return parseJson(crabyCoreClient.listWeeklyKnowledgeItemsJson(since));
  },
  async listPendingKnowledgeItemsForLabeling(limit: number): Promise<KnowledgeItem[]> {
    return parseJson(crabyCoreClient.listPendingKnowledgeItemsForLabelingJson(limit));
  },
  async getKnowledgeItemById(itemId: string): Promise<KnowledgeItem | null> {
    return parseJson(crabyCoreClient.getKnowledgeItemByIdJson(itemId));
  },
  async getDueKnowledgeItems(input: GetDueKnowledgeItemsInput): Promise<KnowledgeItem[]> {
    return parseJson(
      crabyCoreClient.getDueKnowledgeItemsJson(input.now, input.limit ?? null)
    );
  },
  async updateKnowledgeItem(
    itemId: string,
    patch: KnowledgeItemPatch
  ): Promise<KnowledgeItem> {
    return parseJson(
      crabyCoreClient.updateKnowledgeItemJson(itemId, stringifyJson(patch))
    );
  },
  async createConversation(conversation: NewConversation): Promise<Conversation> {
    return parseJson(
      crabyCoreClient.createConversationJson(stringifyJson(conversation))
    );
  },
  async listConversations(): Promise<Conversation[]> {
    return parseJson(crabyCoreClient.listConversationsJson());
  },
  async updateConversation(
    conversationId: string,
    patch: ConversationPatch
  ): Promise<Conversation> {
    return parseJson(
      crabyCoreClient.updateConversationJson(conversationId, stringifyJson(patch))
    );
  },
  async deleteConversation(conversationId: string, deletedAt: number): Promise<void> {
    crabyCoreClient.deleteConversation(conversationId, deletedAt);
  },
  async listConversationMessages(conversationId: string): Promise<Message[]> {
    return parseJson(crabyCoreClient.listConversationMessagesJson(conversationId));
  },
  async addMessage(message: NewMessage): Promise<Message> {
    return parseJson(crabyCoreClient.addMessageJson(stringifyJson(message)));
  },
  async updateMessage(messageId: string, patch: MessagePatch): Promise<Message> {
    return parseJson(
      crabyCoreClient.updateMessageJson(messageId, stringifyJson(patch))
    );
  },
  async deleteMessage(messageId: string, deletedAt: number): Promise<void> {
    crabyCoreClient.deleteMessage(messageId, deletedAt);
  },
  async saveRecommendations(recommendations: NewRecommendation[]): Promise<void> {
    crabyCoreClient.saveRecommendationsJson(stringifyJson(recommendations));
  },
  async listRecommendations(): Promise<Recommendation[]> {
    return parseJson(crabyCoreClient.listRecommendationsJson());
  },
  async listPendingRecommendations(): Promise<Recommendation[]> {
    return parseJson(crabyCoreClient.listPendingRecommendationsJson());
  },
  async listRecentFeedbackEvents(limit: number): Promise<FeedbackEvent[]> {
    return parseJson(crabyCoreClient.listRecentFeedbackEventsJson(limit));
  },
  async logRecommendationFeedback(event: NewFeedbackEvent): Promise<FeedbackEvent> {
    return parseJson(
      crabyCoreClient.logRecommendationFeedbackJson(stringifyJson(event))
    );
  },
  async respondToRecommendation(
    recommendationId: string,
    status: RecommendationStatus,
    event: NewFeedbackEvent
  ): Promise<void> {
    crabyCoreClient.respondToRecommendationJson(
      recommendationId,
      status,
      stringifyJson(event)
    );
  },
};
