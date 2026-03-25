// apps/mobile/src/features/core/specs/core/CoreClient.nitro.ts
import type { HybridObject } from 'react-native-nitro-modules';
import type {
  KnowledgeItem,
  Recommendation,
  FeedbackEvent,
  Conversation,
  Message,
  InitializeReviewScheduleInput,
  InitializeReviewScheduleOutput,
  GetDueKnowledgeItemsInput,
} from '@glimpse/shared';
import type {
  BridgeCalculateTagOverlapInput,
  BridgeCalculateNextReviewInput,
  BridgeKnowledgeItemPatch,
  BridgeConversationPatch,
  BridgeMessagePatch,
  BridgeRecommendationPatch,
} from './types';
import type { CoreBridgeError } from './errors';

/**
 * CoreClient Nitro Spec - Canonical API contract
 * This is the single source of truth for the mobile bridge API.
 * All methods that touch SQLite are async from JS perspective.
 */
export interface CoreClient extends HybridObject<{ ios: 'c++'; android: 'c++' }> {
  // Lifecycle
  initialize(dbPath: string): Promise<void>;

  // Synchronous calculations (pure functions, no SQLite)
  calculateTagOverlap(input: BridgeCalculateTagOverlapInput): number;
  calculateNextReview(input: BridgeCalculateNextReviewInput): { interval_ms: number; next_review_at: number };
  initializeReviewSchedule(input: InitializeReviewScheduleInput): InitializeReviewScheduleOutput;

  // Async CRUD - Knowledge Items
  saveKnowledgeItem(item: KnowledgeItem): Promise<KnowledgeItem>;
  listKnowledgeItems(): Promise<KnowledgeItem[]>;
  listKnowledgeItemsByIds(itemIds: string[]): Promise<KnowledgeItem[]>;
  listWeeklyKnowledgeItems(since: number): Promise<KnowledgeItem[]>;
  listPendingKnowledgeItemsForLabeling(limit: number): Promise<KnowledgeItem[]>;
  getKnowledgeItemById(itemId: string): Promise<KnowledgeItem | null>;
  getDueKnowledgeItems(input: GetDueKnowledgeItemsInput): Promise<KnowledgeItem[]>;
  updateKnowledgeItem(itemId: string, patch: BridgeKnowledgeItemPatch): Promise<KnowledgeItem>;

  // Async CRUD - Conversations
  createConversation(conversation: Conversation): Promise<Conversation>;
  listConversations(): Promise<Conversation[]>;
  updateConversation(conversationId: string, patch: BridgeConversationPatch): Promise<Conversation>;
  deleteConversation(conversationId: string, deletedAt: number): Promise<void>;

  // Async CRUD - Messages
  listConversationMessages(conversationId: string): Promise<Message[]>;
  addMessage(message: Message): Promise<Message>;
  updateMessage(messageId: string, patch: BridgeMessagePatch): Promise<Message>;
  deleteMessage(messageId: string, deletedAt: number): Promise<void>;

  // Async CRUD - Recommendations
  saveRecommendations(recommendations: Recommendation[]): Promise<void>;
  listRecommendations(): Promise<Recommendation[]>;
  listPendingRecommendations(): Promise<Recommendation[]>;
  respondToRecommendation(
    recommendationId: string,
    status: Recommendation['status'],
    feedbackEvent: FeedbackEvent
  ): Promise<void>;

  // Async CRUD - Feedback Events
  listRecentFeedbackEvents(limit: number): Promise<FeedbackEvent[]>;
  logRecommendationFeedback(event: FeedbackEvent): Promise<FeedbackEvent>;
}
