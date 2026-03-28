/**
 * Desktop implementation of CoreClient using Tauri's invoke system.
 *
 * Handles camelCase ↔ snake_case conversion since core-rust models
 * serialize as snake_case while the TypeScript interface uses camelCase.
 */

import type {
  CoreClient,
  KnowledgeItem,
  KnowledgeItemPatch,
  Conversation,
  ConversationPatch,
  Message,
  MessagePatch,
  Recommendation,
  RecommendationStatus,
  FeedbackEvent,
  CalculateTagOverlapInput,
  CalculateNextReviewInput,
  CalculateNextReviewOutput,
  InitializeReviewScheduleInput,
  InitializeReviewScheduleOutput,
  GetDueKnowledgeItemsInput,
} from '@glimpse/shared';
import { invoke } from '@tauri-apps/api/core';

// ---------------------------------------------------------------------------
// camelCase ↔ snake_case key conversion
// ---------------------------------------------------------------------------

function toSnakeCaseKey(key: string): string {
  return key.replace(/[A-Z]/g, (m) => `_${m.toLowerCase()}`);
}

function toCamelCaseKey(key: string): string {
  return key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

function toSnakeCase<T>(obj: T): unknown {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(toSnakeCase);
  if (typeof obj !== 'object') return obj;
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    result[key === 'itemA_id' || key === 'itemB_id' ? key : toSnakeCaseKey(key)] =
      toSnakeCase(value);
  }
  return result;
}

function toCamelCase<T>(obj: T): unknown {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(toCamelCase);
  if (typeof obj !== 'object') return obj;
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    let camelKey = toCamelCaseKey(key);
    if (key === 'item_a_id') camelKey = 'itemA_id';
    if (key === 'item_b_id') camelKey = 'itemB_id';
    result[camelKey] = toCamelCase(value);
  }
  return result;
}

// ---------------------------------------------------------------------------
// Desktop CoreClient implementation
// ---------------------------------------------------------------------------

export function createDesktopCoreClient(): CoreClient {
  return {
    initialize: async (_dbPath: string) => {
      // DB is initialized in Tauri setup hook, no-op on the client side
    },

    // -- Knowledge Items --
    saveKnowledgeItem: async (item) => {
      const raw = await invoke<unknown>('save_knowledge_item', {
        item: toSnakeCase(item),
      });
      return toCamelCase(raw) as unknown as KnowledgeItem;
    },

    listKnowledgeItems: async () => {
      const raw = await invoke<unknown[]>('list_knowledge_items');
      return raw.map((r) => toCamelCase(r) as unknown as KnowledgeItem);
    },

    listKnowledgeItemsByIds: async (itemIds) => {
      const raw = await invoke<unknown[]>('list_knowledge_items_by_ids', { itemIds });
      return raw.map((r) => toCamelCase(r) as unknown as KnowledgeItem);
    },

    listWeeklyKnowledgeItems: async (since) => {
      const raw = await invoke<unknown[]>('list_weekly_knowledge_items', { since });
      return raw.map((r) => toCamelCase(r) as unknown as KnowledgeItem);
    },

    listPendingKnowledgeItemsForLabeling: async (limit) => {
      const raw = await invoke<unknown[]>('list_pending_knowledge_items_for_labeling', { limit });
      return raw.map((r) => toCamelCase(r) as unknown as KnowledgeItem);
    },

    getKnowledgeItemById: async (itemId) => {
      const raw = await invoke<unknown | null>('get_knowledge_item_by_id', { itemId });
      return raw ? (toCamelCase(raw) as unknown as KnowledgeItem) : null;
    },

    getDueKnowledgeItems: async (input) => {
      const raw = await invoke<unknown[]>('get_due_knowledge_items', {
        input: toSnakeCase(input),
      });
      return raw.map((r) => toCamelCase(r) as unknown as KnowledgeItem);
    },

    updateKnowledgeItem: async (itemId, patch) => {
      const raw = await invoke<unknown>('update_knowledge_item', {
        itemId,
        patch: toSnakeCase(patch),
      });
      return toCamelCase(raw) as unknown as KnowledgeItem;
    },

    // -- Conversations --
    createConversation: async (conversation) => {
      const raw = await invoke<unknown>('create_conversation', {
        conversation: toSnakeCase(conversation),
      });
      return toCamelCase(raw) as unknown as Conversation;
    },

    listConversations: async () => {
      const raw = await invoke<unknown[]>('list_conversations');
      return raw.map((r) => toCamelCase(r) as unknown as Conversation);
    },

    updateConversation: async (conversationId, patch) => {
      const raw = await invoke<unknown>('update_conversation', {
        conversationId,
        patch: toSnakeCase(patch),
      });
      return toCamelCase(raw) as unknown as Conversation;
    },

    deleteConversation: async (conversationId, deletedAt) => {
      await invoke('delete_conversation', { conversationId, deletedAt });
    },

    // -- Messages --
    listConversationMessages: async (conversationId) => {
      const raw = await invoke<unknown[]>('list_conversation_messages', { conversationId });
      return raw.map((r) => toCamelCase(r) as unknown as Message);
    },

    addMessage: async (message) => {
      const raw = await invoke<unknown>('add_message', { message: toSnakeCase(message) });
      return toCamelCase(raw) as unknown as Message;
    },

    updateMessage: async (messageId, patch) => {
      const raw = await invoke<unknown>('update_message', {
        messageId,
        patch: toSnakeCase(patch),
      });
      return toCamelCase(raw) as unknown as Message;
    },

    deleteMessage: async (messageId, deletedAt) => {
      await invoke('delete_message', { messageId, deletedAt });
    },

    // -- Recommendations --
    saveRecommendations: async (recommendations) => {
      await invoke('save_recommendations', {
        recommendations: recommendations.map((r) => toSnakeCase(r)),
      });
    },

    listRecommendations: async () => {
      const raw = await invoke<unknown[]>('list_recommendations');
      return raw.map((r) => toCamelCase(r) as unknown as Recommendation);
    },

    listPendingRecommendations: async () => {
      const raw = await invoke<unknown[]>('list_pending_recommendations');
      return raw.map((r) => toCamelCase(r) as unknown as Recommendation);
    },

    respondToRecommendation: async (recommendationId, status, feedbackEvent) => {
      await invoke('respond_to_recommendation', {
        recommendationId,
        status,
        feedbackEvent: toSnakeCase(feedbackEvent),
      });
    },

    // -- Feedback --
    listRecentFeedbackEvents: async (limit) => {
      const raw = await invoke<unknown[]>('list_recent_feedback_events', { limit });
      return raw.map((r) => toCamelCase(r) as unknown as FeedbackEvent);
    },

    logRecommendationFeedback: async (event) => {
      const raw = await invoke<unknown>('log_recommendation_feedback', {
        event: toSnakeCase(event),
      });
      return toCamelCase(raw) as unknown as FeedbackEvent;
    },

    // -- Review Calculations --
    calculateTagOverlap: async (input: CalculateTagOverlapInput) => {
      return invoke<number>('calculate_tag_overlap', {
        input: toSnakeCase(input),
      });
    },

    calculateNextReview: async (input: CalculateNextReviewInput) => {
      const raw = await invoke<unknown>('calculate_next_review', {
        input: toSnakeCase(input),
      });
      return toCamelCase(raw) as unknown as CalculateNextReviewOutput;
    },

    initializeReviewSchedule: async (input: InitializeReviewScheduleInput) => {
      const raw = await invoke<unknown>('initialize_review_schedule', {
        input: toSnakeCase(input),
      });
      return toCamelCase(raw) as unknown as InitializeReviewScheduleOutput;
    },
  };
}
