// @glimpse/shared/src/core-stub.ts
// Stub module for @glimpse/core/* imports during migration
// This file provides compatibility layer for old core imports

import type {
  KnowledgeItem,
  Recommendation,
  FeedbackEvent,
  Conversation,
  Message,
  KnowledgeItemLabelStatus,
  KnowledgeItemLabelSource,
  RecommendationStatus,
  FeedbackActionType,
  MessageRole,
  ReviewFeedbackType,
  CoreKnowledgeItemLike,
  CalculateTagOverlapInput,
  CalculateNextReviewInput,
  CalculateNextReviewOutput,
  InitializeReviewScheduleInput,
  InitializeReviewScheduleOutput,
  GetDueKnowledgeItemsInput,
} from './index';

// ============================================================================
// Port Types (for dependency injection)
// ============================================================================

export interface KeyValueStorage {
  getString: (key: string) => string | undefined;
  set: <T extends string>(key: string, value: T) => void;
  remove: (key: string) => void;
}

// ============================================================================
// Core Client Interface (application layer)
// ============================================================================

export interface CoreClient {
  // Lifecycle
  initialize(dbPath: string): Promise<void>;

  // Sync calculations (pure functions, no SQLite)
  calculateTagOverlap(input: CalculateTagOverlapInput): number;
  calculateNextReview(input: CalculateNextReviewInput): CalculateNextReviewOutput;
  initializeReviewSchedule(input: InitializeReviewScheduleInput): InitializeReviewScheduleOutput;

  // Knowledge Items
  saveKnowledgeItem(item: KnowledgeItem): Promise<KnowledgeItem>;
  listKnowledgeItems(): Promise<KnowledgeItem[]>;
  listKnowledgeItemsByIds(itemIds: string[]): Promise<KnowledgeItem[]>;
  listWeeklyKnowledgeItems(since: number): Promise<KnowledgeItem[]>;
  listPendingKnowledgeItemsForLabeling(limit: number): Promise<KnowledgeItem[]>;
  getKnowledgeItemById(itemId: string): Promise<KnowledgeItem | null>;
  getDueKnowledgeItems(input: GetDueKnowledgeItemsInput): Promise<KnowledgeItem[]>;
  updateKnowledgeItem(itemId: string, patch: Partial<Omit<KnowledgeItem, 'id' | 'createdAt'>>): Promise<KnowledgeItem>;

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
}

// ============================================================================
// State Types
// ============================================================================

export type InferenceMode = 'local' | 'apple' | 'byok';

export interface BYOKConfig {
  provider: 'openai' | 'anthropic' | 'google';
  apiKey: string;
  modelId: string;
  baseUrl?: string;
}

export interface AppleIntelligenceConfig {
  enabled: boolean;
}

export interface LocalLLMConfig {
  modelPath: string;
  contextSize: number;
}

export interface AppState {
  inferenceMode: InferenceMode;
  byokConfig: BYOKConfig | null;
  appleIntelligenceConfig: AppleIntelligenceConfig | null;
  localLLMConfig: LocalLLMConfig | null;
}

// ============================================================================
// Capture Types
// ============================================================================

export interface SaveKnowledgeItemInput {
  item: KnowledgeItem;
}

export interface SaveKnowledgeItemOutput {
  item: KnowledgeItem;
}

// ============================================================================
// Chat Types
// ============================================================================

export interface CreateConversationInput {
  conversation: Conversation;
}

export interface AddMessageInput {
  message: Message;
}

export interface UpdateConversationInput {
  conversationId: string;
  patch: Partial<Omit<Conversation, 'id' | 'createdAt'>>;
}

export interface UpdateMessageInput {
  messageId: string;
  patch: Partial<Omit<Message, 'id' | 'conversationId' | 'createdAt'>>;
}

// ============================================================================
// Recommendation Types
// ============================================================================

export interface GenerateRecommendationsInput {
  since: number;
  limit?: number;
}

export interface RecommendationSimilarityInput {
  itemA: KnowledgeItem;
  itemB: KnowledgeItem;
}

export interface LogRecommendationFeedbackInput {
  event: FeedbackEvent;
}

// ============================================================================
// Review Types
// ============================================================================

export interface ReviewActionInput {
  itemId: string;
  action: 'remembered' | 'postponed';
  now: number;
}

// Legacy type aliases
export type CoreKnowledgeItem = KnowledgeItem;
export type CoreInitializeReviewScheduleInput = InitializeReviewScheduleInput;
export type CoreGetDueItemsInput = GetDueKnowledgeItemsInput;
