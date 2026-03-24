import type {
  ConversationPatch,
  GetDueKnowledgeItemsInput,
  KnowledgeItemPatch,
  MessagePatch,
  RecommendationStatus,
} from '@glimpse/shared';
import { nativeCoreClient } from './native-core-client';
import type { MobileCoreClient } from './types';

export const mobileCoreClient: MobileCoreClient = {
  calculateTagOverlap: (input) => nativeCoreClient.calculateTagOverlap(input),
  calculateNextReview: (input) => nativeCoreClient.calculateNextReview(input),
  initializeReviewSchedule: (input) => nativeCoreClient.initializeReviewSchedule(input),
  async saveKnowledgeItem(item) {
    return nativeCoreClient.saveKnowledgeItem(item);
  },
  async listKnowledgeItems() {
    return nativeCoreClient.listKnowledgeItems();
  },
  async listKnowledgeItemsByIds(itemIds) {
    return nativeCoreClient.listKnowledgeItemsByIds(itemIds);
  },
  async listWeeklyKnowledgeItems(since) {
    return nativeCoreClient.listWeeklyKnowledgeItems(since);
  },
  async listPendingKnowledgeItemsForLabeling(limit) {
    return nativeCoreClient.listPendingKnowledgeItemsForLabeling(limit);
  },
  async getKnowledgeItemById(itemId) {
    return nativeCoreClient.getKnowledgeItemById(itemId);
  },
  async getDueKnowledgeItems(input: GetDueKnowledgeItemsInput) {
    return nativeCoreClient.getDueKnowledgeItems(input.now, input.limit ?? null);
  },
  async updateKnowledgeItem(itemId: string, patch: KnowledgeItemPatch) {
    return nativeCoreClient.updateKnowledgeItem(itemId, patch);
  },
  async createConversation(conversation) {
    return nativeCoreClient.createConversation(conversation);
  },
  async listConversations() {
    return nativeCoreClient.listConversations();
  },
  async updateConversation(conversationId: string, patch: ConversationPatch) {
    return nativeCoreClient.updateConversation(conversationId, patch);
  },
  async deleteConversation(conversationId: string, deletedAt: number): Promise<void> {
    nativeCoreClient.deleteConversation(conversationId, deletedAt);
  },
  async listConversationMessages(conversationId) {
    return nativeCoreClient.listConversationMessages(conversationId);
  },
  async addMessage(message) {
    return nativeCoreClient.addMessage(message);
  },
  async updateMessage(messageId: string, patch: MessagePatch) {
    return nativeCoreClient.updateMessage(messageId, patch);
  },
  async deleteMessage(messageId: string, deletedAt: number): Promise<void> {
    nativeCoreClient.deleteMessage(messageId, deletedAt);
  },
  async saveRecommendations(recommendations) {
    nativeCoreClient.saveRecommendations(recommendations);
  },
  async listRecommendations() {
    return nativeCoreClient.listRecommendations();
  },
  async listPendingRecommendations() {
    return nativeCoreClient.listPendingRecommendations();
  },
  async listRecentFeedbackEvents(limit) {
    return nativeCoreClient.listRecentFeedbackEvents(limit);
  },
  async logRecommendationFeedback(event) {
    return nativeCoreClient.logRecommendationFeedback(event);
  },
  async respondToRecommendation(
    recommendationId: string,
    status: RecommendationStatus,
    event
  ): Promise<void> {
    nativeCoreClient.respondToRecommendation(
      recommendationId,
      status,
      event
    );
  },
};
