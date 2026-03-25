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
  initialize: (dbPath) => nativeCoreClient.initialize(dbPath),

  calculateTagOverlap: (input) => nativeCoreClient.calculateTagOverlap(input),
  calculateNextReview: (input) => nativeCoreClient.calculateNextReview(input),
  initializeReviewSchedule: (input) => nativeCoreClient.initializeReviewSchedule(input),

  saveKnowledgeItem: (item) => nativeCoreClient.saveKnowledgeItem(item),
  listKnowledgeItems: () => nativeCoreClient.listKnowledgeItems(),
  listKnowledgeItemsByIds: (itemIds) => nativeCoreClient.listKnowledgeItemsByIds(itemIds),
  listWeeklyKnowledgeItems: (since) => nativeCoreClient.listWeeklyKnowledgeItems(since),
  listPendingKnowledgeItemsForLabeling: (limit) => nativeCoreClient.listPendingKnowledgeItemsForLabeling(limit),
  getKnowledgeItemById: (itemId) => nativeCoreClient.getKnowledgeItemById(itemId),
  getDueKnowledgeItems: (input: GetDueKnowledgeItemsInput) => nativeCoreClient.getDueKnowledgeItems(input),
  updateKnowledgeItem: (itemId: string, patch: KnowledgeItemPatch) => nativeCoreClient.updateKnowledgeItem(itemId, patch),

  createConversation: (conversation) => nativeCoreClient.createConversation(conversation),
  listConversations: () => nativeCoreClient.listConversations(),
  updateConversation: (conversationId: string, patch: ConversationPatch) => nativeCoreClient.updateConversation(conversationId, patch),
  deleteConversation: (conversationId: string, deletedAt: number) => nativeCoreClient.deleteConversation(conversationId, deletedAt),

  listConversationMessages: (conversationId) => nativeCoreClient.listConversationMessages(conversationId),
  addMessage: (message) => nativeCoreClient.addMessage(message),
  updateMessage: (messageId: string, patch: MessagePatch) => nativeCoreClient.updateMessage(messageId, patch),
  deleteMessage: (messageId: string, deletedAt: number) => nativeCoreClient.deleteMessage(messageId, deletedAt),

  saveRecommendations: (recommendations) => nativeCoreClient.saveRecommendations(recommendations),
  listRecommendations: () => nativeCoreClient.listRecommendations(),
  listPendingRecommendations: () => nativeCoreClient.listPendingRecommendations(),
  respondToRecommendation: (recommendationId: string, status: RecommendationStatus, event) =>
    nativeCoreClient.respondToRecommendation(recommendationId, status, event),

  listRecentFeedbackEvents: (limit) => nativeCoreClient.listRecentFeedbackEvents(limit),
  logRecommendationFeedback: (event) => nativeCoreClient.logRecommendationFeedback(event),
};
