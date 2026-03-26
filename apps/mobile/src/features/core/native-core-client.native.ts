// apps/mobile/src/features/core/native-core-client.native.ts
import { NitroModules } from 'react-native-nitro-modules';
import type { CoreClient } from '../../../generate/CoreClient.nitro';
import type { MobileCoreClient } from './types';
import type {
  KnowledgeItem,
  Conversation,
  Message,
  Recommendation,
  FeedbackEvent,
} from '@glimpse/shared';

/**
 * In-memory stub storage for development when Nitro module is not available.
 */
class InMemoryStorage {
  private knowledgeItems: Map<string, KnowledgeItem> = new Map();
  private conversations: Map<string, Conversation> = new Map();
  private messages: Map<string, Message[]> = new Map();
  private recommendations: Map<string, Recommendation> = new Map();
  private feedbackEvents: FeedbackEvent[] = [];

  // Knowledge Items
  addKnowledgeItem(item: KnowledgeItem): void {
    this.knowledgeItems.set(item.id, item);
  }

  getKnowledgeItem(id: string): KnowledgeItem | undefined {
    return this.knowledgeItems.get(id);
  }

  getAllKnowledgeItems(): KnowledgeItem[] {
    return Array.from(this.knowledgeItems.values());
  }

  updateKnowledgeItem(id: string, patch: Partial<KnowledgeItem>): KnowledgeItem | undefined {
    const item = this.knowledgeItems.get(id);
    if (!item) return undefined;
    const updated = { ...item, ...patch };
    this.knowledgeItems.set(id, updated);
    return updated;
  }

  // Conversations
  addConversation(conversation: Conversation): void {
    this.conversations.set(conversation.id, conversation);
    this.messages.set(conversation.id, []);
  }

  getConversation(id: string): Conversation | undefined {
    return this.conversations.get(id);
  }

  getAllConversations(): Conversation[] {
    return Array.from(this.conversations.values());
  }

  updateConversation(id: string, patch: Partial<Conversation>): Conversation | undefined {
    const conversation = this.conversations.get(id);
    if (!conversation) return undefined;
    const updated = { ...conversation, ...patch };
    this.conversations.set(id, updated);
    return updated;
  }

  deleteConversation(id: string): void {
    this.conversations.delete(id);
    this.messages.delete(id);
  }

  // Messages
  addMessage(conversationId: string, message: Message): void {
    const messages = this.messages.get(conversationId);
    if (messages) {
      messages.push(message);
    }
  }

  getMessages(conversationId: string): Message[] {
    return this.messages.get(conversationId) ?? [];
  }

  updateMessage(messageId: string, patch: Partial<Message>): Message | undefined {
    for (const [, messages] of this.messages) {
      const index = messages.findIndex(m => m.id === messageId);
      if (index !== -1) {
        const updated = { ...messages[index], ...patch };
        messages[index] = updated;
        return updated;
      }
    }
    return undefined;
  }

  deleteMessage(messageId: string): void {
    for (const [, messages] of this.messages) {
      const index = messages.findIndex(m => m.id === messageId);
      if (index !== -1) {
        messages.splice(index, 1);
        return;
      }
    }
  }

  // Recommendations
  addRecommendation(recommendation: Recommendation): void {
    this.recommendations.set(recommendation.id, recommendation);
  }

  getAllRecommendations(): Recommendation[] {
    return Array.from(this.recommendations.values());
  }

  updateRecommendation(id: string, patch: Partial<Recommendation>): Recommendation | undefined {
    const rec = this.recommendations.get(id);
    if (!rec) return undefined;
    const updated = { ...rec, ...patch };
    this.recommendations.set(id, updated);
    return updated;
  }

  // Feedback Events
  addFeedbackEvent(event: FeedbackEvent): void {
    this.feedbackEvents.push(event);
  }

  getRecentFeedbackEvents(limit: number): FeedbackEvent[] {
    return this.feedbackEvents.slice(-limit);
  }
}

const inMemoryStorage = new InMemoryStorage();
const isTestEnvironment = typeof Bun !== 'undefined';

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
    console.log('✅ Nitro CoreClient module loaded successfully');
  } catch (e) {
    if (!isTestEnvironment) {
      throw new Error(
        `Nitro CoreClient module is not registered. Native bridge linking is incomplete: ${String(e)}`
      );
    }
    console.warn('⚠️ Nitro CoreClient module not registered, using in-memory stub implementation:', e);
  }

  return {
    // Lifecycle
    async initialize(dbPath: string): Promise<void> {
      if (coreClient) {
        await coreClient.initialize(dbPath);
      }
      // Stub: no-op, data is already in memory
    },

    // Sync calculations
    calculateTagOverlap(input) {
      if (!coreClient) {
        // Simple Jaccard similarity for stub
        const leftTags = new Set(input.left.tags ?? []);
        const rightTags = new Set(input.right.tags ?? []);
        if (leftTags.size === 0 && rightTags.size === 0) return 0;
        let intersection = 0;
        for (const tag of leftTags) {
          if (rightTags.has(tag)) intersection++;
        }
        const union = leftTags.size + rightTags.size - intersection;
        return union > 0 ? intersection / union : 0;
      }
      const leftTags = input.left.tags?.join('|') ?? '';
      const rightTags = input.right.tags?.join('|') ?? '';
      return coreClient.calculateTagOverlap(leftTags, rightTags);
    },

    calculateNextReview(input) {
      if (!coreClient) {
        // Simple stub: 1 day interval for remembered, 4 hours for forgotten
        const intervalMs = input.feedbackType === 'remembered'
          ? 24 * 60 * 60 * 1000
          : 4 * 60 * 60 * 1000;
        return {
          intervalMs,
          nextReviewAt: input.now + intervalMs,
        };
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
    async saveKnowledgeItem(item: KnowledgeItem): Promise<KnowledgeItem> {
      if (coreClient) {
        const json = await coreClient.saveKnowledgeItem(JSON.stringify(item));
        return JSON.parse(json);
      }
      // Stub implementation
      inMemoryStorage.addKnowledgeItem(item);
      return item;
    },

    async listKnowledgeItems(): Promise<KnowledgeItem[]> {
      if (coreClient) {
        const json = await coreClient.listKnowledgeItems();
        return JSON.parse(json);
      }
      return inMemoryStorage.getAllKnowledgeItems();
    },

    async listKnowledgeItemsByIds(itemIds: string[]): Promise<KnowledgeItem[]> {
      const all = await this.listKnowledgeItems();
      const idSet = new Set(itemIds);
      return all.filter(item => idSet.has(item.id));
    },

    async listWeeklyKnowledgeItems(since: number): Promise<KnowledgeItem[]> {
      const all = await this.listKnowledgeItems();
      return all.filter(item => item.createdAt >= since);
    },

    async listPendingKnowledgeItemsForLabeling(limit: number): Promise<KnowledgeItem[]> {
      const all = await this.listKnowledgeItems();
      return all.filter(item => item.labelStatus === 'pending').slice(0, limit);
    },

    async getKnowledgeItemById(itemId: string): Promise<KnowledgeItem | null> {
      if (coreClient) {
        const json = await coreClient.getKnowledgeItemById(itemId);
        return json ? JSON.parse(json) : null;
      }
      return inMemoryStorage.getKnowledgeItem(itemId) ?? null;
    },

    async getDueKnowledgeItems(input: { now: number; limit?: number }): Promise<KnowledgeItem[]> {
      const all = await this.listKnowledgeItems();
      const due = all.filter(item => {
        if (!item.nextReviewAt) return true;
        return item.nextReviewAt <= input.now;
      });
      return input.limit ? due.slice(0, input.limit) : due;
    },

    async updateKnowledgeItem(itemId: string, patch: Partial<KnowledgeItem>): Promise<KnowledgeItem> {
      if (coreClient) {
        const json = await coreClient.updateKnowledgeItem(itemId, JSON.stringify(patch));
        return JSON.parse(json);
      }
      const updated = inMemoryStorage.updateKnowledgeItem(itemId, patch);
      if (!updated) throw new Error(`Knowledge item not found: ${itemId}`);
      return updated;
    },

    // Conversations
    async createConversation(conversation: Conversation): Promise<Conversation> {
      if (coreClient) {
        const json = await coreClient.createConversation(JSON.stringify(conversation));
        return JSON.parse(json);
      }
      inMemoryStorage.addConversation(conversation);
      return conversation;
    },

    async listConversations(): Promise<Conversation[]> {
      if (coreClient) {
        const json = await coreClient.listConversations();
        return JSON.parse(json);
      }
      return inMemoryStorage.getAllConversations();
    },

    async updateConversation(conversationId: string, patch: Partial<Conversation>): Promise<Conversation> {
      if (coreClient) {
        const json = await coreClient.updateConversation(conversationId, JSON.stringify(patch));
        return JSON.parse(json);
      }
      const updated = inMemoryStorage.updateConversation(conversationId, patch);
      if (!updated) throw new Error(`Conversation not found: ${conversationId}`);
      return updated;
    },

    async deleteConversation(conversationId: string, deletedAt: number): Promise<void> {
      if (coreClient) {
        await coreClient.deleteConversation(conversationId, deletedAt);
        return;
      }
      inMemoryStorage.deleteConversation(conversationId);
    },

    // Messages
    async listConversationMessages(conversationId: string): Promise<Message[]> {
      if (coreClient) {
        const json = await coreClient.listConversationMessages(conversationId);
        return JSON.parse(json);
      }
      return inMemoryStorage.getMessages(conversationId);
    },

    async addMessage(message: Message): Promise<Message> {
      if (coreClient) {
        const json = await coreClient.addMessage(JSON.stringify(message));
        return JSON.parse(json);
      }
      inMemoryStorage.addMessage(message.conversationId, message);
      return message;
    },

    async updateMessage(messageId: string, patch: Partial<Message>): Promise<Message> {
      if (coreClient) {
        const json = await coreClient.updateMessage(messageId, JSON.stringify(patch));
        return JSON.parse(json);
      }
      const updated = inMemoryStorage.updateMessage(messageId, patch);
      if (!updated) throw new Error(`Message not found: ${messageId}`);
      return updated;
    },

    async deleteMessage(messageId: string, deletedAt: number): Promise<void> {
      if (coreClient) {
        await coreClient.deleteMessage(messageId, deletedAt);
        return;
      }
      inMemoryStorage.deleteMessage(messageId);
    },

    // Recommendations
    async saveRecommendations(recommendations: Recommendation[]): Promise<void> {
      if (coreClient) {
        await coreClient.saveRecommendations(JSON.stringify(recommendations));
        return;
      }
      for (const rec of recommendations) {
        inMemoryStorage.addRecommendation(rec);
      }
    },

    async listRecommendations(): Promise<Recommendation[]> {
      if (coreClient) {
        const json = await coreClient.listRecommendations();
        return JSON.parse(json);
      }
      return inMemoryStorage.getAllRecommendations();
    },

    async listPendingRecommendations(): Promise<Recommendation[]> {
      if (coreClient) {
        const json = await coreClient.listPendingRecommendations();
        return JSON.parse(json);
      }
      const all = inMemoryStorage.getAllRecommendations();
      return all.filter(r => r.status === 'pending');
    },

    async respondToRecommendation(
      recommendationId: string,
      status: 'accepted' | 'ignored' | 'dismissed',
      feedbackEvent: FeedbackEvent
    ): Promise<void> {
      if (coreClient) {
        await coreClient.respondToRecommendation(
          recommendationId,
          status,
          JSON.stringify(feedbackEvent)
        );
        return;
      }
      inMemoryStorage.updateRecommendation(recommendationId, { status, respondedAt: Date.now() });
    },

    // Feedback Events
    async listRecentFeedbackEvents(limit: number): Promise<FeedbackEvent[]> {
      if (coreClient) {
        const json = await coreClient.listRecentFeedbackEvents(limit);
        return JSON.parse(json);
      }
      return inMemoryStorage.getRecentFeedbackEvents(limit);
    },

    async logRecommendationFeedback(event: FeedbackEvent): Promise<FeedbackEvent> {
      if (coreClient) {
        const json = await coreClient.logRecommendationFeedback(JSON.stringify(event));
        return JSON.parse(json);
      }
      inMemoryStorage.addFeedbackEvent(event);
      return event;
    },
  };
}

export const nativeCoreClient = createNativeCoreClient();
