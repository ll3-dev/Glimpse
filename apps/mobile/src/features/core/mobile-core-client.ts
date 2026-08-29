import type { GetDueKnowledgeItemsInput } from '@glimpse/shared';
import { nativeCoreClient } from './native-core-client';
import type { MobileCoreClient } from './types';
import {
  getDueKnowledgeItemsWithCore,
  listKnowledgeItemsByIdsWithCore,
  listPendingKnowledgeItemsForLabelingWithCore,
  listWeeklyKnowledgeItemsWithCore,
} from './application/knowledge';

export const mobileCoreClient: MobileCoreClient = {
  initialize: (dbPath) => nativeCoreClient.initialize(dbPath),

  calculateTagOverlap: (input) => nativeCoreClient.calculateTagOverlap(input),
  calculateNextReview: (input) => nativeCoreClient.calculateNextReview(input),
  initializeReviewSchedule: (input) => nativeCoreClient.initializeReviewSchedule(input),

  saveKnowledgeItem: (item) => nativeCoreClient.saveKnowledgeItem(item),
  listKnowledgeItems: () => nativeCoreClient.listKnowledgeItems(),
  getKnowledgeItemById: (itemId) => nativeCoreClient.getKnowledgeItemById(itemId),
  updateKnowledgeItem: (itemId, patch) => nativeCoreClient.updateKnowledgeItem(itemId, patch),
  deleteKnowledgeItem: (itemId) => nativeCoreClient.deleteKnowledgeItem(itemId),
  listKnowledgeItemsByIds: (itemIds) => listKnowledgeItemsByIdsWithCore(nativeCoreClient, itemIds),
  listWeeklyKnowledgeItems: (since) => listWeeklyKnowledgeItemsWithCore(nativeCoreClient, since),
  listPendingKnowledgeItemsForLabeling: (limit) =>
    listPendingKnowledgeItemsForLabelingWithCore(nativeCoreClient, limit),
  getDueKnowledgeItems: (input: GetDueKnowledgeItemsInput) =>
    getDueKnowledgeItemsWithCore(nativeCoreClient, input),

  createConversation: (conversation) => nativeCoreClient.createConversation(conversation),
  listConversations: () => nativeCoreClient.listConversations(),
  updateConversation: (conversationId, patch) => nativeCoreClient.updateConversation(conversationId, patch),
  deleteConversation: (conversationId, deletedAt) => nativeCoreClient.deleteConversation(conversationId, deletedAt),

  listConversationMessages: (conversationId) => nativeCoreClient.listConversationMessages(conversationId),
  addMessage: (message) => nativeCoreClient.addMessage(message),
  updateMessage: (messageId, patch) => nativeCoreClient.updateMessage(messageId, patch),
  deleteMessage: (messageId, deletedAt) => nativeCoreClient.deleteMessage(messageId, deletedAt),

  saveRecommendations: (recommendations) => nativeCoreClient.saveRecommendations(recommendations),
  listRecommendations: () => nativeCoreClient.listRecommendations(),
  listPendingRecommendations: () => nativeCoreClient.listPendingRecommendations(),
  respondToRecommendation: (recommendationId: string, status, event) =>
    nativeCoreClient.respondToRecommendation(recommendationId, status, event),

  listRecentFeedbackEvents: (limit) => nativeCoreClient.listRecentFeedbackEvents(limit),
  logRecommendationFeedback: (event) => nativeCoreClient.logRecommendationFeedback(event),
  exportData: () => nativeCoreClient.exportData(),
  exportDelta: (sinceClockMs) =>
    nativeCoreClient.exportDelta
      ? nativeCoreClient.exportDelta(sinceClockMs)
      : Promise.reject(new Error('exportDelta is not available on this client')),
  syncDataRevision: () => nativeCoreClient.syncDataRevision?.() ?? Promise.resolve(null),
  importData: (dataJson) => nativeCoreClient.importData(dataJson),
  mergeData: (dataJson) => nativeCoreClient.mergeData(dataJson),
  deleteAllData: () => nativeCoreClient.deleteAllData(),
};
