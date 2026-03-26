// apps/mobile/src/features/core/native-core-client.native.ts
import { NitroModules } from 'react-native-nitro-modules';
import type { CoreClient } from '../../../generate/CoreClient.nitro';
import type { MobileCoreClient } from './types';

/**
 * Native CoreClient implementation using Nitro bridge.
 * This file is only used on native platforms (iOS/Android).
 *
 * NOTE: The Nitro module 'CoreClient' must be registered at app startup.
 * The C++ implementation needs to be linked and registered.
 */
function createNativeCoreClient(): MobileCoreClient {
  // Try to get the Nitro module, fall back to stub if not registered
  let coreClient: CoreClient | null = null;
  try {
    coreClient = NitroModules.createHybridObject<CoreClient>('CoreClient');
  } catch (e) {
    console.warn('Nitro CoreClient module not registered, using stub implementation:', e);
  }

  return {
    // Lifecycle
    async initialize(dbPath: string): Promise<void> {
      if (!coreClient) throw new Error('CoreClient not initialized');
      await coreClient.initialize(dbPath);
    },

    // Sync calculations
    calculateTagOverlap(input) {
      if (!coreClient) return 0;
      const leftTags = input.left.tags?.join('|') ?? '';
      const rightTags = input.right.tags?.join('|') ?? '';
      return coreClient.calculateTagOverlap(leftTags, rightTags);
    },

    calculateNextReview(input) {
      if (!coreClient) {
        return { intervalMs: 24 * 60 * 60 * 1000, nextReviewAt: input.now + 24 * 60 * 60 * 1000 };
      }
      const resultJson = coreClient.calculateNextReview(
        input.lastReviewedAt ?? null,
        input.nextReviewAt ?? null,
        input.feedbackType === 'remembered' ? 0 : 1,
        input.now
      );
      const parsed = JSON.parse(resultJson) as { interval_ms: number; next_review_at: number };
      return {
        intervalMs: parsed.interval_ms,
        nextReviewAt: parsed.next_review_at,
      };
    },

    initializeReviewSchedule(input) {
      if (!coreClient) {
        return {
          nextReviewAt: input.createdAt + (input.intervalMs ?? 24 * 60 * 60 * 1000),
          stability: null,
          difficulty: null,
          lastReviewedAt: null,
        };
      }
      const resultJson = coreClient.initializeReviewSchedule(
        input.createdAt,
        input.intervalMs ?? null
      );
      const parsed = JSON.parse(resultJson) as {
        next_review_at: number;
        stability: number | null;
        difficulty: number | null;
        last_reviewed_at: number | null;
      };
      return {
        nextReviewAt: parsed.next_review_at,
        stability: parsed.stability,
        difficulty: parsed.difficulty,
        lastReviewedAt: parsed.last_reviewed_at,
      };
    },

    // Knowledge Items
    async saveKnowledgeItem(item) {
      if (!coreClient) throw new Error('CoreClient not initialized');
      const json = await coreClient.saveKnowledgeItem(JSON.stringify(item));
      return JSON.parse(json);
    },

    async listKnowledgeItems() {
      if (!coreClient) return [];
      const json = await coreClient.listKnowledgeItems();
      return JSON.parse(json);
    },

    async listKnowledgeItemsByIds(itemIds) {
      const all = await this.listKnowledgeItems();
      const idSet = new Set(itemIds);
      return all.filter(item => idSet.has(item.id));
    },

    async listWeeklyKnowledgeItems(since) {
      const all = await this.listKnowledgeItems();
      return all.filter(item => item.createdAt >= since);
    },

    async listPendingKnowledgeItemsForLabeling(limit) {
      const all = await this.listKnowledgeItems();
      return all.filter(item => item.labelStatus === 'pending').slice(0, limit);
    },

    async getKnowledgeItemById(itemId) {
      if (!coreClient) return null;
      const json = await coreClient.getKnowledgeItemById(itemId);
      return json ? JSON.parse(json) : null;
    },

    async getDueKnowledgeItems(input) {
      const all = await this.listKnowledgeItems();
      const due = all.filter(item => {
        if (!item.nextReviewAt) return true;
        return item.nextReviewAt <= input.now;
      });
      return input.limit ? due.slice(0, input.limit) : due;
    },

    async updateKnowledgeItem(itemId, patch) {
      if (!coreClient) throw new Error('CoreClient not initialized');
      const json = await coreClient.updateKnowledgeItem(itemId, JSON.stringify(patch));
      return JSON.parse(json);
    },

    // Conversations
    async createConversation(conversation) {
      if (!coreClient) throw new Error('CoreClient not initialized');
      const json = await coreClient.createConversation(JSON.stringify(conversation));
      return JSON.parse(json);
    },

    async listConversations() {
      if (!coreClient) return [];
      const json = await coreClient.listConversations();
      return JSON.parse(json);
    },

    async updateConversation(conversationId, patch) {
      if (!coreClient) throw new Error('CoreClient not initialized');
      const json = await coreClient.updateConversation(conversationId, JSON.stringify(patch));
      return JSON.parse(json);
    },

    async deleteConversation(conversationId, deletedAt) {
      if (!coreClient) return;
      await coreClient.deleteConversation(conversationId, deletedAt);
    },

    // Messages
    async listConversationMessages(conversationId) {
      if (!coreClient) return [];
      const json = await coreClient.listConversationMessages(conversationId);
      return JSON.parse(json);
    },

    async addMessage(message) {
      if (!coreClient) throw new Error('CoreClient not initialized');
      const json = await coreClient.addMessage(JSON.stringify(message));
      return JSON.parse(json);
    },

    async updateMessage(messageId, patch) {
      if (!coreClient) throw new Error('CoreClient not initialized');
      const json = await coreClient.updateMessage(messageId, JSON.stringify(patch));
      return JSON.parse(json);
    },

    async deleteMessage(messageId, deletedAt) {
      if (!coreClient) return;
      await coreClient.deleteMessage(messageId, deletedAt);
    },

    // Recommendations
    async saveRecommendations(recommendations) {
      if (!coreClient) return;
      await coreClient.saveRecommendations(JSON.stringify(recommendations));
    },

    async listRecommendations() {
      if (!coreClient) return [];
      const json = await coreClient.listRecommendations();
      return JSON.parse(json);
    },

    async listPendingRecommendations() {
      if (!coreClient) return [];
      const json = await coreClient.listPendingRecommendations();
      return JSON.parse(json);
    },

    async respondToRecommendation(recommendationId, status, feedbackEvent) {
      if (!coreClient) return;
      await coreClient.respondToRecommendation(
        recommendationId,
        status,
        JSON.stringify(feedbackEvent)
      );
    },

    // Feedback Events
    async listRecentFeedbackEvents(limit) {
      if (!coreClient) return [];
      const json = await coreClient.listRecentFeedbackEvents(limit);
      return JSON.parse(json);
    },

    async logRecommendationFeedback(event) {
      if (!coreClient) throw new Error('CoreClient not initialized');
      const json = await coreClient.logRecommendationFeedback(JSON.stringify(event));
      return JSON.parse(json);
    },
  };
}

export const nativeCoreClient = createNativeCoreClient();
