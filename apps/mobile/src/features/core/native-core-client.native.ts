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
 * - install fails in development (Expo Go, unbundled JS) → the existing
 *   in-memory fallback client is constructed instead;
 * - install fails in release → initialization fails closed so a user cannot
 *   unknowingly save data into a temporary in-memory store.
 */

let delegate: CoreClient | null = null;

function allowInMemoryFallback(): boolean {
  if (process.env.NODE_ENV === 'test') {
    return true;
  }
  return typeof __DEV__ !== 'undefined'
    ? __DEV__
    : process.env.NODE_ENV !== 'production';
}

async function selectDelegate(): Promise<CoreClient> {
  if (delegate) {
    return delegate;
  }

  const rustraReady = await bootstrapRustraEngine();
  if (rustraReady) {
    delegate = createRustraCoreClient();
  } else if (allowInMemoryFallback()) {
    logger.warn('RustraJSI unavailable, falling back to in-memory core client');
    const { createFallbackCoreClient } = await import('./native-core-fallback-client');
    delegate = createFallbackCoreClient();
  } else {
    throw new Error(
      'RustraJSI 초기화에 실패했습니다. 데이터 유실을 막기 위해 인메모리 저장소로 전환하지 않습니다.',
    );
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
  deleteKnowledgeItem: (itemId) =>
    selectDelegate().then((c) => c.deleteKnowledgeItem(itemId)),
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
  exportData: () => selectDelegate().then((c) => c.exportData()),
  exportDelta: (sinceClockMs) =>
    selectDelegate().then((c) => c.exportDelta?.(sinceClockMs) ?? c.exportData()),
  syncDataRevision: () => selectDelegate().then((c) => c.syncDataRevision?.() ?? null),
  importData: (dataJson) => selectDelegate().then((c) => c.importData(dataJson)),
  mergeData: (dataJson) => selectDelegate().then((c) => c.mergeData(dataJson)),
  deleteAllData: () => selectDelegate().then((c) => c.deleteAllData()),
};
