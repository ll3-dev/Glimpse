import { crabyCoreClient } from "./craby-client";
import {
  mobileCoreClient as sqliteFallbackCoreClient,
  type MobileCoreClient,
} from "./sqlite-client";

export type { MobileCoreClient } from "./sqlite-client";

export const mobileCoreClient: MobileCoreClient = {
  calculateTagOverlap(input) {
    if (crabyCoreClient.isAvailable()) {
      try {
        return crabyCoreClient.calculateTagOverlap(input);
      } catch {
        return sqliteFallbackCoreClient.calculateTagOverlap(input);
      }
    }

    return sqliteFallbackCoreClient.calculateTagOverlap(input);
  },

  calculateNextReview(input) {
    if (crabyCoreClient.isAvailable()) {
      try {
        return crabyCoreClient.calculateNextReview(input);
      } catch {
        return sqliteFallbackCoreClient.calculateNextReview(input);
      }
    }

    return sqliteFallbackCoreClient.calculateNextReview(input);
  },

  initializeReviewSchedule(input) {
    if (crabyCoreClient.isAvailable()) {
      try {
        return crabyCoreClient.initializeReviewSchedule(input);
      } catch {
        return sqliteFallbackCoreClient.initializeReviewSchedule(input);
      }
    }

    return sqliteFallbackCoreClient.initializeReviewSchedule(input);
  },

  saveKnowledgeItem: sqliteFallbackCoreClient.saveKnowledgeItem,
  listKnowledgeItems: sqliteFallbackCoreClient.listKnowledgeItems,
  listKnowledgeItemsByIds: sqliteFallbackCoreClient.listKnowledgeItemsByIds,
  listWeeklyKnowledgeItems: sqliteFallbackCoreClient.listWeeklyKnowledgeItems,
  listPendingKnowledgeItemsForLabeling:
    sqliteFallbackCoreClient.listPendingKnowledgeItemsForLabeling,
  getKnowledgeItemById: sqliteFallbackCoreClient.getKnowledgeItemById,
  getDueKnowledgeItems: sqliteFallbackCoreClient.getDueKnowledgeItems,
  updateKnowledgeItem: sqliteFallbackCoreClient.updateKnowledgeItem,
  createConversation: sqliteFallbackCoreClient.createConversation,
  listConversations: sqliteFallbackCoreClient.listConversations,
  updateConversation: sqliteFallbackCoreClient.updateConversation,
  deleteConversation: sqliteFallbackCoreClient.deleteConversation,
  listConversationMessages: sqliteFallbackCoreClient.listConversationMessages,
  addMessage: sqliteFallbackCoreClient.addMessage,
  updateMessage: sqliteFallbackCoreClient.updateMessage,
  deleteMessage: sqliteFallbackCoreClient.deleteMessage,
  saveRecommendations: sqliteFallbackCoreClient.saveRecommendations,
  listRecommendations: sqliteFallbackCoreClient.listRecommendations,
  listPendingRecommendations:
    sqliteFallbackCoreClient.listPendingRecommendations,
  listRecentFeedbackEvents: sqliteFallbackCoreClient.listRecentFeedbackEvents,
  logRecommendationFeedback: sqliteFallbackCoreClient.logRecommendationFeedback,
  respondToRecommendation: sqliteFallbackCoreClient.respondToRecommendation,
};
