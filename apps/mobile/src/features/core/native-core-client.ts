// apps/mobile/src/features/core/native-core-client.ts
// Web/test variant — the rustra JSI surface does not exist off native
// platforms, so the delegate is always the in-memory fallback client.
import type { CoreClient } from '@glimpse/shared';
import { createFallbackCoreClient } from './native-core-fallback-client';

let delegate: CoreClient | null = null;

function getDelegate(): CoreClient {
  if (!delegate) {
    delegate = createFallbackCoreClient();
  }
  return delegate;
}

export const nativeCoreClient: CoreClient = {
  initialize: async (dbPath) => {
    await getDelegate().initialize(dbPath);
  },

  calculateTagOverlap: (input) => getDelegate().calculateTagOverlap(input),
  calculateNextReview: (input) => getDelegate().calculateNextReview(input),
  initializeReviewSchedule: (input) => getDelegate().initializeReviewSchedule(input),

  saveKnowledgeItem: (item) => getDelegate().saveKnowledgeItem(item),
  listKnowledgeItems: () => getDelegate().listKnowledgeItems(),
  getKnowledgeItemById: (itemId) => getDelegate().getKnowledgeItemById(itemId),
  updateKnowledgeItem: (itemId, patch) => getDelegate().updateKnowledgeItem(itemId, patch),
  listKnowledgeItemsByIds: (itemIds) => getDelegate().listKnowledgeItemsByIds(itemIds),
  listWeeklyKnowledgeItems: (since) => getDelegate().listWeeklyKnowledgeItems(since),
  listPendingKnowledgeItemsForLabeling: (limit) =>
    getDelegate().listPendingKnowledgeItemsForLabeling(limit),
  getDueKnowledgeItems: (input) => getDelegate().getDueKnowledgeItems(input),

  createConversation: (conversation) => getDelegate().createConversation(conversation),
  listConversations: () => getDelegate().listConversations(),
  updateConversation: (conversationId, patch) =>
    getDelegate().updateConversation(conversationId, patch),
  deleteConversation: (conversationId, deletedAt) =>
    getDelegate().deleteConversation(conversationId, deletedAt),

  listConversationMessages: (conversationId) =>
    getDelegate().listConversationMessages(conversationId),
  addMessage: (message) => getDelegate().addMessage(message),
  updateMessage: (messageId, patch) => getDelegate().updateMessage(messageId, patch),
  deleteMessage: (messageId, deletedAt) => getDelegate().deleteMessage(messageId, deletedAt),

  saveRecommendations: (recommendations) =>
    getDelegate().saveRecommendations(recommendations),
  listRecommendations: () => getDelegate().listRecommendations(),
  listPendingRecommendations: () => getDelegate().listPendingRecommendations(),
  respondToRecommendation: (recommendationId, status, feedbackEvent) =>
    getDelegate().respondToRecommendation(recommendationId, status, feedbackEvent),

  listRecentFeedbackEvents: (limit) => getDelegate().listRecentFeedbackEvents(limit),
  logRecommendationFeedback: (event) => getDelegate().logRecommendationFeedback(event),
};
