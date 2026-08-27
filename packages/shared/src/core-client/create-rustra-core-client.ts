/**
 * Shared CoreClient factory built on the rustra-generated TS client.
 *
 * Desktop and mobile previously carried ~150-line near-identical adapters
 * whose only differences were (a) what `initialize` does and (b) how the
 * next-review-interval is computed. Both now inject those two behaviors:
 *
 * - `initialize`: desktop's Tauri setup hook owns the SQLite connection
 *   (no-op), while mobile dispatches `initializeCore` with the app-computed
 *   DB path.
 * - `calculateNextReview`: computed in-process by the shared TS scheduler
 *   (`@glimpse/features`), which cannot be imported here because features
 *   already depends on shared — injecting keeps the dependency graph
 *   acyclic.
 *
 * The wire from `@glimpse/bridge-generated` is camelCase end-to-end (bridge
 * IO structs rename to camelCase), so no key conversion happens — this
 * adapter only unwraps the command output envelopes (`{ item }`,
 * `{ items }`, ...) and narrows wire types (enums as plain strings) back to
 * the shared string-literal-union domain types.
 *
 * Errors: the engine rejects with `RustraCommandError` (an Error subclass
 * carrying `code` + `message`), which propagates as-is to consumers.
 */

import type {
  Conversation,
  CoreClient,
  FeedbackEvent,
  KnowledgeItem,
  Message,
  Recommendation,
} from '../index';
import type {
  CalculateNextReviewInput,
  CalculateNextReviewOutput,
  InitializeReviewScheduleInput,
  InitializeReviewScheduleOutput,
} from '../index';
// The generated functions call the global rustra engine configured at app
// bootstrap, routing every command through the single `rustra_dispatch`
// bridge command.
import {
  addMessage,
  calculateTagOverlap,
  createConversation,
  deleteAllData,
  deleteConversation,
  deleteKnowledgeItem,
  deleteMessage,
  exportData,
  getDueKnowledgeItems,
  getKnowledgeItemById,
  importData,
  initializeCore,
  initializeReviewSchedule,
  listConversationMessages,
  listConversations,
  listKnowledgeItems,
  listKnowledgeItemsByIds,
  listPendingKnowledgeItemsForLabeling,
  listPendingRecommendations,
  listRecentFeedbackEvents,
  listRecommendations,
  listWeeklyKnowledgeItems,
  logRecommendationFeedback,
  mergeData,
  respondToRecommendation,
  saveKnowledgeItem,
  saveRecommendations,
  updateConversation,
  updateKnowledgeItem,
  updateMessage,
} from '@glimpse/bridge-generated';

/** App-specific behaviors injected into the rustra CoreClient adapter. */
export interface RustraCoreClientDeps {
  /**
   * Opens (or attaches to) the process-wide SQLite database. Desktop binds a
   * no-op (Tauri setup hook owns it); mobile dispatches `initializeCore`.
   */
  initialize(dbPath: string): Promise<void>;
  /** Next-interval scheduling, provided by the apps via `@glimpse/features`. */
  calculateNextReview(
    input: CalculateNextReviewInput
  ): Promise<CalculateNextReviewOutput>;
}

export function createRustraCoreClient(deps: RustraCoreClientDeps): CoreClient {
  return {
    initialize: async (dbPath) => deps.initialize(dbPath),

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
    calculateNextReview: deps.calculateNextReview,
    initializeReviewSchedule: async (input) =>
      (await initializeReviewSchedule(input)) as InitializeReviewScheduleOutput,

    // -- Data portability --
    exportData: async () => (await exportData({})).dataJson,
    importData: async (dataJson) => importData({ dataJson }),
    mergeData: async (dataJson) => mergeData({ dataJson }),
    deleteAllData: async () => {
      await deleteAllData({});
    },
  };
}
