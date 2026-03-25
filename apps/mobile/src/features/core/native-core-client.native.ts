// apps/mobile/src/features/core/native-core-client.native.ts
import { NitroModules } from 'react-native-nitro-modules';
import type { CoreClient } from '../../generate/CoreClient.nitro';
import type { MobileCoreClient } from './types';

/**
 * Native CoreClient implementation using Nitro bridge.
 * This file is only used on native platforms (iOS/Android).
 */
function createNativeCoreClient(): MobileCoreClient {
  const coreClient = NitroModules.createHybridObject<CoreClient>('CoreClient');

  return {
    // Lifecycle
    async initialize(dbPath: string): Promise<void> {
      await coreClient.initialize(dbPath);
    },

    // Sync calculations
    calculateTagOverlap(left, right) {
      const leftTags = left.tags?.join('|') ?? '';
      const rightTags = right.tags?.join('|') ?? '';
      return coreClient.calculateTagOverlap(leftTags, rightTags);
    },

    calculateNextReview(input) {
      const resultJson = coreClient.calculateNextReview(
        input.lastReviewedAt ?? null,
        input.nextReviewAt ?? null,
        input.feedbackType === 'remembered' ? 0 : 1,
        input.now
      );
      const result = JSON.parse(resultJson) as { interval_ms: number; next_review_at: number };
      return result;
    },

    initializeReviewSchedule(input) {
      const resultJson = coreClient.initializeReviewSchedule(
        input.createdAt,
        input.intervalMs ?? null
      );
      return JSON.parse(resultJson) as {
        next_review_at: number;
        stability: number | null;
        difficulty: number | null;
        last_reviewed_at: number | null;
      };
    },

    // Knowledge Items
    async saveKnowledgeItem(item) {
      const json = await coreClient.saveKnowledgeItem(JSON.stringify(item));
      return JSON.parse(json);
    },

    async listKnowledgeItems() {
      const json = await coreClient.listKnowledgeItems();
      return JSON.parse(json);
    },

    async listKnowledgeItemsByIds(itemIds) {
      // TODO: Implement in native
      const all = await this.listKnowledgeItems();
      const idSet = new Set(itemIds);
      return all.filter(item => idSet.has(item.id));
    },

    async listWeeklyKnowledgeItems(since) {
      // TODO: Implement in native
      const all = await this.listKnowledgeItems();
      return all.filter(item => item.createdAt >= since);
    },

    async listPendingKnowledgeItemsForLabeling(limit) {
      // TODO: Implement in native
      const all = await this.listKnowledgeItems();
      return all.filter(item => item.labelStatus === 'pending').slice(0, limit);
    },

    async getKnowledgeItemById(itemId) {
      const json = await coreClient.getKnowledgeItemById(itemId);
      return json ? JSON.parse(json) : null;
    },

    async getDueKnowledgeItems(input) {
      // TODO: Implement in native
      const all = await this.listKnowledgeItems();
      const due = all.filter(item => {
        if (!item.nextReviewAt) return true;
        return item.nextReviewAt <= input.now;
      });
      return input.limit ? due.slice(0, input.limit) : due;
    },

    async updateKnowledgeItem(itemId, patch) {
      const json = await coreClient.updateKnowledgeItem(itemId, JSON.stringify(patch));
      return JSON.parse(json);
    },

    // Conversations
    async createConversation(conversation) {
      const json = await coreClient.createConversation(JSON.stringify(conversation));
      return JSON.parse(json);
    },

    async listConversations() {
      const json = await coreClient.listConversations();
      return JSON.parse(json);
    },

    async updateConversation(conversationId, patch) {
      const json = await coreClient.updateConversation(conversationId, JSON.stringify(patch));
      return JSON.parse(json);
    },

    async deleteConversation(conversationId, deletedAt) {
      await coreClient.deleteConversation(conversationId, deletedAt);
    },

    // Messages
    async listConversationMessages(conversationId) {
      const json = await coreClient.listConversationMessages(conversationId);
      return JSON.parse(json);
    },

    async addMessage(message) {
      const json = await coreClient.addMessage(JSON.stringify(message));
      return JSON.parse(json);
    },

    async updateMessage(messageId, patch) {
      const json = await coreClient.updateMessage(messageId, JSON.stringify(patch));
      return JSON.parse(json);
    },

    async deleteMessage(messageId, deletedAt) {
      await coreClient.deleteMessage(messageId, deletedAt);
    },

    // Recommendations
    async saveRecommendations(recommendations) {
      await coreClient.saveRecommendations(JSON.stringify(recommendations));
    },

    async listRecommendations() {
      const json = await coreClient.listRecommendations();
      return JSON.parse(json);
    },

    async listPendingRecommendations() {
      const json = await coreClient.listPendingRecommendations();
      return JSON.parse(json);
    },

    async respondToRecommendation(recommendationId, status, feedbackEvent) {
      await coreClient.respondToRecommendation(
        recommendationId,
        status,
        JSON.stringify(feedbackEvent)
      );
    },

    // Feedback Events
    async listRecentFeedbackEvents(limit) {
      const json = await coreClient.listRecentFeedbackEvents(limit);
      return JSON.parse(json);
    },

    async logRecommendationFeedback(event) {
      const json = await coreClient.logRecommendationFeedback(JSON.stringify(event));
      return JSON.parse(json);
    },
  };
}

export const nativeCoreClient = createNativeCoreClient();
