/**
 * Mobile CoreClient implemented on the rustra-generated TS client.
 *
 * Mirrors the desktop adapter (`apps/desktop/src/features/core/
 * rustra-core-client.ts`): the generated functions from
 * `@glimpse/bridge-generated` call the engine configured at bootstrap, the
 * wire is camelCase end-to-end, and this adapter only unwraps the command
 * output envelopes (`{ item }`, `{ items }`, ...) and narrows wire types
 * (enums as plain strings) back to the shared string-literal-union types.
 *
 * The mobile-specific difference is `initialize`: unlike desktop (whose
 * Tauri setup hook owns the DB), mobile dispatches the `initializeCore`
 * command with the same DB path the previous Nitro path computed. The bridge
 * global then owns the single SQLite connection for the process.
 *
 * Errors: the engine rejects with `RustraCommandError` (an Error subclass
 * carrying `code` + `message`), which propagates as-is to consumers.
 */

import type {
  CoreClient,
  KnowledgeItem,
  Conversation,
  Message,
  Recommendation,
  FeedbackEvent,
  CalculateNextReviewOutput,
  InitializeReviewScheduleOutput,
} from '@glimpse/shared';
import {
  initializeCore,
  saveKnowledgeItem,
  listKnowledgeItems,
  getKnowledgeItemById,
  updateKnowledgeItem,
  deleteKnowledgeItem,
  listKnowledgeItemsByIds,
  listWeeklyKnowledgeItems,
  listPendingKnowledgeItemsForLabeling,
  getDueKnowledgeItems,
  createConversation,
  listConversations,
  updateConversation,
  deleteConversation,
  listConversationMessages,
  addMessage,
  updateMessage,
  deleteMessage,
  saveRecommendations,
  listRecommendations,
  listPendingRecommendations,
  respondToRecommendation,
  listRecentFeedbackEvents,
  logRecommendationFeedback,
  calculateTagOverlap,
  calculateNextReview,
  initializeReviewSchedule,
} from '@glimpse/bridge-generated';

export function createRustraCoreClient(): CoreClient {
  return {
    initialize: async (dbPath: string) => {
      // Opens (or reuses) the process-wide SharedCore on the Rust side —
      // exactly one SQLite connection, owned by the bridge global.
      await initializeCore({ dbPath });
    },

    // -- Knowledge Items --
    saveKnowledgeItem: async (item) =>
      (await saveKnowledgeItem({ item })).item as KnowledgeItem,
    listKnowledgeItems: async () =>
      (await listKnowledgeItems({})).items as KnowledgeItem[],
    listKnowledgeItemsByIds: async (itemIds) =>
      (await listKnowledgeItemsByIds({ itemIds })).items as KnowledgeItem[],
    listWeeklyKnowledgeItems: async (since) =>
      (await listWeeklyKnowledgeItems({ since })).items as KnowledgeItem[],
    listPendingKnowledgeItemsForLabeling: async (limit) =>
      (await listPendingKnowledgeItemsForLabeling({ limit })).items as KnowledgeItem[],
    getKnowledgeItemById: async (itemId) =>
      ((await getKnowledgeItemById({ itemId })).item as KnowledgeItem) ?? null,
    getDueKnowledgeItems: async (input) =>
      (await getDueKnowledgeItems(input)).items as KnowledgeItem[],
    updateKnowledgeItem: async (itemId, patch) =>
      (await updateKnowledgeItem({ itemId, patch })).item as KnowledgeItem,
    deleteKnowledgeItem: async (itemId) => {
      await deleteKnowledgeItem({ itemId });
    },

    // -- Conversations --
    createConversation: async (conversation) =>
      (await createConversation({ conversation })).conversation as Conversation,
    listConversations: async () =>
      (await listConversations({})).conversations as Conversation[],
    updateConversation: async (conversationId, patch) =>
      (await updateConversation({ conversationId, patch })).conversation as Conversation,
    deleteConversation: async (conversationId, deletedAt) => {
      await deleteConversation({ conversationId, deletedAt });
    },

    // -- Messages --
    listConversationMessages: async (conversationId) =>
      (await listConversationMessages({ conversationId })).messages as Message[],
    addMessage: async (message) => (await addMessage({ message })).message as Message,
    updateMessage: async (messageId, patch) =>
      (await updateMessage({ messageId, patch })).message as Message,
    deleteMessage: async (messageId, deletedAt) => {
      await deleteMessage({ messageId, deletedAt });
    },

    // -- Recommendations --
    saveRecommendations: async (recommendations) => {
      await saveRecommendations({ recommendations });
    },
    listRecommendations: async () =>
      (await listRecommendations({})).recommendations as Recommendation[],
    listPendingRecommendations: async () =>
      (await listPendingRecommendations({})).recommendations as Recommendation[],
    respondToRecommendation: async (recommendationId, status, feedbackEvent) => {
      await respondToRecommendation({ recommendationId, status, feedbackEvent });
    },

    // -- Feedback --
    listRecentFeedbackEvents: async (limit) =>
      (await listRecentFeedbackEvents({ limit })).events as FeedbackEvent[],
    logRecommendationFeedback: async (event) =>
      (await logRecommendationFeedback({ event })).event as FeedbackEvent,

    // -- Review Calculations --
    // The flattened review outputs already match the shared shape; only
    // calculateTagOverlap wraps its result in an `overlap` field.
    calculateTagOverlap: async (input) => (await calculateTagOverlap(input)).overlap,
    calculateNextReview: async (input) =>
      (await calculateNextReview(input)) as CalculateNextReviewOutput,
    initializeReviewSchedule: async (input) =>
      (await initializeReviewSchedule(input)) as InitializeReviewScheduleOutput,
  };
}
