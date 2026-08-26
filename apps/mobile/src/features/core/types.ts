// apps/mobile/src/features/core/types.ts
import type {
  Conversation,
  CoreKnowledgeItemLike,
  DataImportSummary,
  FeedbackEvent,
  GetDueKnowledgeItemsInput,
  InitializeReviewScheduleInput,
  InitializeReviewScheduleOutput,
  KnowledgeItem,
  Message,
  Recommendation,
  RecommendationStatus,
  ReviewFeedbackType,
} from '@glimpse/shared';

/**
 * MobileCoreClient interface - the API contract for the mobile app.
 * Implemented by the rustra core client adapter (with an in-memory fallback).
 */
export interface MobileCoreClient {
  // Lifecycle
  initialize(dbPath: string): Promise<void>;

  // Calculations (pure functions, no SQLite — wrapped in Promise for interface consistency)
  calculateTagOverlap(input: { left: CoreKnowledgeItemLike; right: CoreKnowledgeItemLike }): Promise<number>;
  calculateNextReview(input: {
    lastReviewedAt: number | null;
    nextReviewAt: number | null;
    feedbackType: ReviewFeedbackType;
    now: number;
  }): Promise<{ intervalMs: number; nextReviewAt: number }>;
  initializeReviewSchedule(input: InitializeReviewScheduleInput): Promise<InitializeReviewScheduleOutput>;

  // Knowledge Items
  saveKnowledgeItem(item: KnowledgeItem): Promise<KnowledgeItem>;
  listKnowledgeItems(): Promise<KnowledgeItem[]>;
  getKnowledgeItemById(itemId: string): Promise<KnowledgeItem | null>;
  updateKnowledgeItem(itemId: string, patch: Partial<Omit<KnowledgeItem, 'id' | 'createdAt'>>): Promise<KnowledgeItem>;
  deleteKnowledgeItem(itemId: string): Promise<void>;

  // App-level knowledge queries built on top of the shared core bridge
  listKnowledgeItemsByIds(itemIds: string[]): Promise<KnowledgeItem[]>;
  listWeeklyKnowledgeItems(since: number): Promise<KnowledgeItem[]>;
  listPendingKnowledgeItemsForLabeling(limit: number): Promise<KnowledgeItem[]>;
  getDueKnowledgeItems(input: GetDueKnowledgeItemsInput): Promise<KnowledgeItem[]>;

  // Conversations
  createConversation(conversation: Conversation): Promise<Conversation>;
  listConversations(): Promise<Conversation[]>;
  updateConversation(conversationId: string, patch: Partial<Omit<Conversation, 'id' | 'createdAt'>>): Promise<Conversation>;
  deleteConversation(conversationId: string, deletedAt: number): Promise<void>;

  // Messages
  listConversationMessages(conversationId: string): Promise<Message[]>;
  addMessage(message: Message): Promise<Message>;
  updateMessage(messageId: string, patch: Partial<Omit<Message, 'id' | 'conversationId' | 'createdAt'>>): Promise<Message>;
  deleteMessage(messageId: string, deletedAt: number): Promise<void>;

  // Recommendations
  saveRecommendations(recommendations: Recommendation[]): Promise<void>;
  listRecommendations(): Promise<Recommendation[]>;
  listPendingRecommendations(): Promise<Recommendation[]>;
  respondToRecommendation(
    recommendationId: string,
    status: RecommendationStatus,
    feedbackEvent: FeedbackEvent
  ): Promise<void>;

  // Feedback Events
  listRecentFeedbackEvents(limit: number): Promise<FeedbackEvent[]>;
  logRecommendationFeedback(event: FeedbackEvent): Promise<FeedbackEvent>;

  // Data portability
  exportData(): Promise<string>;
  importData(dataJson: string): Promise<DataImportSummary>;
  mergeData(dataJson: string): Promise<DataImportSummary>;
  deleteAllData(): Promise<void>;
}
