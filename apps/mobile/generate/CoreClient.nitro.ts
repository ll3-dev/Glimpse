// apps/mobile/generate/CoreClient.nitro.ts
import type { HybridObject } from 'react-native-nitro-modules';

export interface KnowledgeItem {
  id: string;
  type: string;
  title: string | null;
  body: string | null;
  url: string | null;
  summary: string | null;
  tags: string[] | null;
  labels: string[] | null;
  provisionalLabels: string[] | null;
  labelStatus: string | null;
  labelSource: string | null;
  labelVersion: string | null;
  labelScore: number | null;
  labelRequestedAt: number | null;
  labelCompletedAt: number | null;
  labelError: string | null;
  createdAt: number;
  updatedAt: number;
  stability: number | null;
  difficulty: number | null;
  lastReviewedAt: number | null;
  nextReviewAt: number | null;
}

export interface Recommendation {
  id: string;
  itemAId: string;
  itemBId: string;
  reason: string | null;
  status: string;
  createdAt: number;
  respondedAt: number | null;
}

export interface FeedbackEvent {
  id: string;
  recommendationId: string;
  action: string;
  createdAt: number;
}

export interface Conversation {
  id: string;
  title: string | null;
  icon: string | null;
  contextItemId: string | null;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
}

export interface Message {
  id: string;
  conversationId: string;
  role: string;
  content: string;
  createdAt: number;
  updatedAt: number | null;
  deletedAt: number | null;
}

export interface CalculateNextReviewOutput {
  intervalMs: number;
  nextReviewAt: number;
}

export interface InitializeReviewScheduleOutput {
  nextReviewAt: number;
  stability: number | null;
  difficulty: number | null;
  lastReviewedAt: number | null;
}

export interface StringPatchField {
  hasValue: boolean;
  value: string;
}

export interface NullableStringPatchField {
  hasValue: boolean;
  isNull: boolean;
  value: string;
}

export interface NumberPatchField {
  hasValue: boolean;
  value: number;
}

export interface NullableNumberPatchField {
  hasValue: boolean;
  isNull: boolean;
  value: number;
}

export interface StringArrayPatchField {
  hasValue: boolean;
  value: string[];
}

export interface NullableStringArrayPatchField {
  hasValue: boolean;
  isNull: boolean;
  value: string[];
}

export interface KnowledgeItemPatch {
  type: StringPatchField;
  title: NullableStringPatchField;
  body: NullableStringPatchField;
  url: NullableStringPatchField;
  summary: NullableStringPatchField;
  tags: NullableStringArrayPatchField;
  labels: NullableStringArrayPatchField;
  provisionalLabels: NullableStringArrayPatchField;
  labelStatus: NullableStringPatchField;
  labelSource: NullableStringPatchField;
  labelVersion: NullableStringPatchField;
  labelScore: NullableNumberPatchField;
  labelRequestedAt: NullableNumberPatchField;
  labelCompletedAt: NullableNumberPatchField;
  labelError: NullableStringPatchField;
  updatedAt: NumberPatchField;
  stability: NullableNumberPatchField;
  difficulty: NullableNumberPatchField;
  lastReviewedAt: NullableNumberPatchField;
  nextReviewAt: NullableNumberPatchField;
}

export interface ConversationPatch {
  title: NullableStringPatchField;
  icon: NullableStringPatchField;
  contextItemId: NullableStringPatchField;
  updatedAt: NumberPatchField;
  deletedAt: NullableNumberPatchField;
}

export interface MessagePatch {
  content: StringPatchField;
  updatedAt: NullableNumberPatchField;
  deletedAt: NullableNumberPatchField;
}

/**
 * CoreClient Nitro Spec - Canonical API contract
 */
export interface CoreClient extends HybridObject<{ ios: 'c++'; android: 'c++' }> {
  // Lifecycle
  initialize(dbPath: string): Promise<void>;

  // Synchronous calculations (pure functions, no SQLite)
  calculateTagOverlap(leftTags: string[], rightTags: string[]): number;
  calculateNextReview(
    lastReviewedAt: number | null,
    nextReviewAt: number | null,
    feedbackType: number,
    now: number
  ): CalculateNextReviewOutput;
  initializeReviewSchedule(
    createdAt: number,
    intervalMs: number | null
  ): InitializeReviewScheduleOutput;

  // Knowledge Items
  saveKnowledgeItem(item: KnowledgeItem): Promise<KnowledgeItem>;
  listKnowledgeItems(): Promise<KnowledgeItem[]>;
  getKnowledgeItemById(itemId: string): Promise<KnowledgeItem | null>;
  updateKnowledgeItem(itemId: string, patch: KnowledgeItemPatch): Promise<KnowledgeItem>;

  // Conversations
  createConversation(conversation: Conversation): Promise<Conversation>;
  listConversations(): Promise<Conversation[]>;
  updateConversation(conversationId: string, patch: ConversationPatch): Promise<Conversation>;
  deleteConversation(conversationId: string, deletedAt: number): Promise<void>;

  // Messages
  listConversationMessages(conversationId: string): Promise<Message[]>;
  addMessage(message: Message): Promise<Message>;
  updateMessage(messageId: string, patch: MessagePatch): Promise<Message>;
  deleteMessage(messageId: string, deletedAt: number): Promise<void>;

  // Recommendations
  saveRecommendations(recommendations: Recommendation[]): Promise<void>;
  listRecommendations(): Promise<Recommendation[]>;
  listPendingRecommendations(): Promise<Recommendation[]>;
  respondToRecommendation(
    recommendationId: string,
    status: string,
    feedbackEvent: FeedbackEvent
  ): Promise<void>;

  // Feedback Events
  listRecentFeedbackEvents(limit: number): Promise<FeedbackEvent[]>;
  logRecommendationFeedback(event: FeedbackEvent): Promise<FeedbackEvent>;
}
