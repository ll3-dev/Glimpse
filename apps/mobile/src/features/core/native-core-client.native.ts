// apps/mobile/src/features/core/native-core-client.native.ts
import type { CoreClient } from '@glimpse/shared';
import { createRustraCoreClient } from './rustra-core-client';
import { bootstrapRustraEngine } from './rustra-engine.native';
import { logger } from '@/src/utils/logger';

/**
 * Native CoreClient implementation over the rustra JSI bridge.
 *
 * Engine bootstrap is async (NativeModules promise on iOS, JNI install on
 * Android), so the delegate is chosen during `initialize()` — the one entry
 * point the app already awaits at startup (`initialize-core-client.native.ts`).
 *
 * Exactly one core path is ever live:
 * - rustra install succeeds → the bridge global owns the single SQLite
 *   connection (opened by the `initializeCore` command);
 * - install fails (Expo Go, unbundled JS) → the existing in-memory fallback
 *   client is constructed instead, and no rustra command is dispatched —
 *   so a second SQLite connection is never opened.
 */

let delegate: CoreClient | null = null;

async function selectDelegate(): Promise<CoreClient> {
  if (delegate) {
    return delegate;
  }

  const rustraReady = await bootstrapRustraEngine();
  if (rustraReady) {
    delegate = createRustraCoreClient();
  } else {
    logger.warn('RustraJSI unavailable, falling back to in-memory core client');
    const { createFallbackCoreClient } = await import('./native-core-fallback-client');
    delegate = createFallbackCoreClient();
  }
  return delegate;
}

export const nativeCoreClient: CoreClient = {
  initialize: async (dbPath) => {
    const client = await selectDelegate();
    await client.initialize(dbPath);
  },

  calculateTagOverlap: (input) => selectDelegate().then((c) => c.calculateTagOverlap(input)),
  calculateNextReview: (input) => selectDelegate().then((c) => c.calculateNextReview(input)),
  initializeReviewSchedule: (input) =>
    selectDelegate().then((c) => c.initializeReviewSchedule(input)),

  saveKnowledgeItem: (item) => selectDelegate().then((c) => c.saveKnowledgeItem(item)),
  listKnowledgeItems: () => selectDelegate().then((c) => c.listKnowledgeItems()),
  getKnowledgeItemById: (itemId) =>
    selectDelegate().then((c) => c.getKnowledgeItemById(itemId)),
  updateKnowledgeItem: (itemId, patch) =>
    selectDelegate().then((c) => c.updateKnowledgeItem(itemId, patch)),
  listKnowledgeItemsByIds: (itemIds) =>
    selectDelegate().then((c) => c.listKnowledgeItemsByIds(itemIds)),
  listWeeklyKnowledgeItems: (since) =>
    selectDelegate().then((c) => c.listWeeklyKnowledgeItems(since)),
  listPendingKnowledgeItemsForLabeling: (limit) =>
    selectDelegate().then((c) => c.listPendingKnowledgeItemsForLabeling(limit)),
  getDueKnowledgeItems: (input) =>
    selectDelegate().then((c) => c.getDueKnowledgeItems(input)),

  createConversation: (conversation) =>
    selectDelegate().then((c) => c.createConversation(conversation)),
  listConversations: () => selectDelegate().then((c) => c.listConversations()),
  updateConversation: (conversationId, patch) =>
    selectDelegate().then((c) => c.updateConversation(conversationId, patch)),
  deleteConversation: (conversationId, deletedAt) =>
    selectDelegate().then((c) => c.deleteConversation(conversationId, deletedAt)),

  listConversationMessages: (conversationId) =>
    selectDelegate().then((c) => c.listConversationMessages(conversationId)),
  addMessage: (message) => selectDelegate().then((c) => c.addMessage(message)),
  updateMessage: (messageId, patch) =>
    selectDelegate().then((c) => c.updateMessage(messageId, patch)),
  deleteMessage: (messageId, deletedAt) =>
    selectDelegate().then((c) => c.deleteMessage(messageId, deletedAt)),

  saveRecommendations: (recommendations) =>
    selectDelegate().then((c) => c.saveRecommendations(recommendations)),
  listRecommendations: () => selectDelegate().then((c) => c.listRecommendations()),
  listPendingRecommendations: () =>
    selectDelegate().then((c) => c.listPendingRecommendations()),
  respondToRecommendation: (recommendationId, status, feedbackEvent) =>
    selectDelegate().then((c) =>
      c.respondToRecommendation(recommendationId, status, feedbackEvent),
    ),

  listRecentFeedbackEvents: (limit) =>
    selectDelegate().then((c) => c.listRecentFeedbackEvents(limit)),
  logRecommendationFeedback: (event) =>
    selectDelegate().then((c) => c.logRecommendationFeedback(event)),
};
