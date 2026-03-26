// apps/mobile/src/features/core/native-core-client.native.ts
import { NitroModules } from 'react-native-nitro-modules';
import type {
  CoreClient,
  KnowledgeItem as NitroKnowledgeItem,
  Message as NitroMessage,
  Recommendation as NitroRecommendation,
  FeedbackEvent as NitroFeedbackEvent,
} from '../../../generate/CoreClient.nitro';
import type { MobileCoreClient } from './types';
import type {
  KnowledgeItem,
  Conversation,
  Message,
  Recommendation,
  FeedbackEvent,
  KnowledgeItemType,
  KnowledgeItemLabelStatus,
  KnowledgeItemLabelSource,
  MessageRole,
  FeedbackActionType,
  RecommendationStatus,
} from '@glimpse/shared';

function stringPatch(value: string | undefined) {
  return {
    hasValue: value !== undefined,
    value: value ?? '',
  };
}

function nullableStringPatch(value: string | null | undefined) {
  return {
    hasValue: value !== undefined,
    isNull: value === null,
    value: value ?? '',
  };
}

function numberPatch(value: number | undefined) {
  return {
    hasValue: value !== undefined,
    value: value ?? 0,
  };
}

function nullableNumberPatch(value: number | null | undefined) {
  return {
    hasValue: value !== undefined,
    isNull: value === null,
    value: value ?? 0,
  };
}

function nullableStringArrayPatch(value: string[] | null | undefined) {
  return {
    hasValue: value !== undefined,
    isNull: value === null,
    value: value ?? [],
  };
}

function toKnowledgeItemPatch(patch: Partial<KnowledgeItem>) {
  return {
    type: stringPatch(patch.type),
    title: nullableStringPatch(patch.title),
    body: nullableStringPatch(patch.body),
    url: nullableStringPatch(patch.url),
    summary: nullableStringPatch(patch.summary),
    tags: nullableStringArrayPatch(patch.tags),
    labels: nullableStringArrayPatch(patch.labels),
    provisionalLabels: nullableStringArrayPatch(patch.provisionalLabels),
    labelStatus: nullableStringPatch(patch.labelStatus),
    labelSource: nullableStringPatch(patch.labelSource),
    labelVersion: nullableStringPatch(patch.labelVersion),
    labelScore: nullableNumberPatch(patch.labelScore),
    labelRequestedAt: nullableNumberPatch(patch.labelRequestedAt),
    labelCompletedAt: nullableNumberPatch(patch.labelCompletedAt),
    labelError: nullableStringPatch(patch.labelError),
    updatedAt: numberPatch(patch.updatedAt),
    stability: nullableNumberPatch(patch.stability),
    difficulty: nullableNumberPatch(patch.difficulty),
    lastReviewedAt: nullableNumberPatch(patch.lastReviewedAt),
    nextReviewAt: nullableNumberPatch(patch.nextReviewAt),
  };
}

function toNitroKnowledgeItem(item: KnowledgeItem): NitroKnowledgeItem {
  return {
    ...item,
    labels: item.labels ?? null,
    provisionalLabels: item.provisionalLabels ?? null,
    labelStatus: item.labelStatus ?? null,
    labelSource: item.labelSource ?? null,
    labelVersion: item.labelVersion ?? null,
    labelScore: item.labelScore ?? null,
    labelRequestedAt: item.labelRequestedAt ?? null,
    labelCompletedAt: item.labelCompletedAt ?? null,
    labelError: item.labelError ?? null,
  };
}

function fromNitroKnowledgeItem(item: NitroKnowledgeItem): KnowledgeItem {
  return {
    ...item,
    type: item.type as KnowledgeItemType,
    labelStatus: item.labelStatus as KnowledgeItemLabelStatus | null,
    labelSource: item.labelSource as KnowledgeItemLabelSource | null,
  };
}

function toNitroRecommendation(item: Recommendation): NitroRecommendation {
  return {
    id: item.id,
    itemAId: item.itemA_id,
    itemBId: item.itemB_id,
    reason: item.reason,
    status: item.status,
    createdAt: item.createdAt,
    respondedAt: item.respondedAt,
  };
}

function fromNitroRecommendation(item: NitroRecommendation): Recommendation {
  return {
    id: item.id,
    itemA_id: item.itemAId,
    itemB_id: item.itemBId,
    reason: item.reason,
    status: item.status as RecommendationStatus,
    createdAt: item.createdAt,
    respondedAt: item.respondedAt,
  };
}

function fromNitroMessage(item: NitroMessage): Message {
  return {
    ...item,
    role: item.role as MessageRole,
  };
}

function toNitroMessage(item: Message): NitroMessage {
  return item;
}

function fromNitroFeedbackEvent(item: NitroFeedbackEvent): FeedbackEvent {
  return {
    ...item,
    action: item.action as FeedbackActionType,
  };
}

function toNitroFeedbackEvent(item: FeedbackEvent): NitroFeedbackEvent {
  return item;
}

function toConversationPatch(patch: Partial<Conversation>) {
  return {
    title: nullableStringPatch(patch.title),
    icon: nullableStringPatch(patch.icon),
    contextItemId: nullableStringPatch(patch.contextItemId),
    updatedAt: numberPatch(patch.updatedAt),
    deletedAt: nullableNumberPatch(patch.deletedAt),
  };
}

function toMessagePatch(patch: Partial<Message>) {
  return {
    content: stringPatch(patch.content),
    updatedAt: nullableNumberPatch(patch.updatedAt),
    deletedAt: nullableNumberPatch(patch.deletedAt),
  };
}

export const nativeCoreBridgeHelpers = {
  stringPatch,
  nullableStringPatch,
  numberPatch,
  nullableNumberPatch,
  nullableStringArrayPatch,
  toKnowledgeItemPatch,
  toConversationPatch,
  toMessagePatch,
  toNitroKnowledgeItem,
  fromNitroKnowledgeItem,
  toNitroRecommendation,
  fromNitroRecommendation,
  toNitroMessage,
  fromNitroMessage,
  toNitroFeedbackEvent,
  fromNitroFeedbackEvent,
};

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
      console.warn('Nitro module unavailable, using in-memory stub');
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
      return coreClient.calculateTagOverlap(
        input.left.tags ?? [],
        input.right.tags ?? [],
      );
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
      const result = coreClient.calculateNextReview(
        input.lastReviewedAt ?? null,
        input.nextReviewAt ?? null,
        input.feedbackType === 'remembered' ? 0 : 1,
        input.now
      );
      return {
        intervalMs: result.intervalMs,
        nextReviewAt: result.nextReviewAt,
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
      const result = coreClient.initializeReviewSchedule(
        input.createdAt,
        input.intervalMs ?? null
      );
      return {
        nextReviewAt: result.nextReviewAt,
        stability: result.stability,
        difficulty: result.difficulty,
        lastReviewedAt: result.lastReviewedAt,
      };
    },

    // Knowledge Items
    async saveKnowledgeItem(item: KnowledgeItem): Promise<KnowledgeItem> {
      if (coreClient) {
        return fromNitroKnowledgeItem(
          await coreClient.saveKnowledgeItem(toNitroKnowledgeItem(item))
        );
      }
      // Stub implementation
      inMemoryStorage.addKnowledgeItem(item);
      return item;
    },

    async listKnowledgeItems(): Promise<KnowledgeItem[]> {
      if (coreClient) {
        return (await coreClient.listKnowledgeItems()).map(fromNitroKnowledgeItem);
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
        const item = await coreClient.getKnowledgeItemById(itemId);
        return item ? fromNitroKnowledgeItem(item) : null;
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
        return fromNitroKnowledgeItem(
          await coreClient.updateKnowledgeItem(itemId, toKnowledgeItemPatch(patch))
        );
      }
      const updated = inMemoryStorage.updateKnowledgeItem(itemId, patch);
      if (!updated) {
        const error = new Error(`Knowledge item not found: ${itemId}`);
        (error as Error).message = `Knowledge item not found: ${itemId}`;
        throw error;
      }
      return updated;
    },

    // Conversations
    async createConversation(conversation: Conversation): Promise<Conversation> {
      if (coreClient) {
        return coreClient.createConversation(conversation);
      }
      inMemoryStorage.addConversation(conversation);
      return conversation;
    },

    async listConversations(): Promise<Conversation[]> {
      if (coreClient) {
        return coreClient.listConversations();
      }
      return inMemoryStorage.getAllConversations();
    },

    async updateConversation(conversationId: string, patch: Partial<Conversation>): Promise<Conversation> {
      if (coreClient) {
        return coreClient.updateConversation(conversationId, toConversationPatch(patch));
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
        return (await coreClient.listConversationMessages(conversationId)).map(fromNitroMessage);
      }
      return inMemoryStorage.getMessages(conversationId);
    },

    async addMessage(message: Message): Promise<Message> {
      if (coreClient) {
        return fromNitroMessage(await coreClient.addMessage(toNitroMessage(message)));
      }
      inMemoryStorage.addMessage(message.conversationId, message);
      return message;
    },

    async updateMessage(messageId: string, patch: Partial<Message>): Promise<Message> {
      if (coreClient) {
        return fromNitroMessage(await coreClient.updateMessage(messageId, toMessagePatch(patch)));
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
        await coreClient.saveRecommendations(recommendations.map(toNitroRecommendation));
        return;
      }
      for (const rec of recommendations) {
        inMemoryStorage.addRecommendation(rec);
      }
    },

    async listRecommendations(): Promise<Recommendation[]> {
      if (coreClient) {
        return (await coreClient.listRecommendations()).map(fromNitroRecommendation);
      }
      return inMemoryStorage.getAllRecommendations();
    },

    async listPendingRecommendations(): Promise<Recommendation[]> {
      if (coreClient) {
        return (await coreClient.listPendingRecommendations()).map(fromNitroRecommendation);
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
          toNitroFeedbackEvent(feedbackEvent)
        );
        return;
      }
      inMemoryStorage.updateRecommendation(recommendationId, { status, respondedAt: Date.now() });
    },

    // Feedback Events
    async listRecentFeedbackEvents(limit: number): Promise<FeedbackEvent[]> {
      if (coreClient) {
        return (await coreClient.listRecentFeedbackEvents(limit)).map(fromNitroFeedbackEvent);
      }
      return inMemoryStorage.getRecentFeedbackEvents(limit);
    },

    async logRecommendationFeedback(event: FeedbackEvent): Promise<FeedbackEvent> {
      if (coreClient) {
        return fromNitroFeedbackEvent(
          await coreClient.logRecommendationFeedback(toNitroFeedbackEvent(event))
        );
      }
      inMemoryStorage.addFeedbackEvent(event);
      return event;
    },
  };
}

export const nativeCoreClient = createNativeCoreClient();
