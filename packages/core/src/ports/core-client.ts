import type {
  CalculateNextReviewInput,
  CalculateNextReviewOutput,
  CalculateTagOverlapInput,
  Conversation,
  ConversationPatch,
  FeedbackEvent,
  GetDueKnowledgeItemsInput,
  InitializeReviewScheduleInput,
  InitializeReviewScheduleOutput,
  KnowledgeItem,
  KnowledgeItemPatch,
  Message,
  MessagePatch,
  NewConversation,
  NewFeedbackEvent,
  NewKnowledgeItem,
  NewMessage,
  NewRecommendation,
  Recommendation,
  RecommendationStatus,
} from '@glimpse/shared';

export interface CoreClient {
  calculateTagOverlap(input: CalculateTagOverlapInput): number;
  calculateNextReview(input: CalculateNextReviewInput): CalculateNextReviewOutput;
  initializeReviewSchedule(input: InitializeReviewScheduleInput): InitializeReviewScheduleOutput;
  saveKnowledgeItem(item: NewKnowledgeItem): Promise<KnowledgeItem>;
  listKnowledgeItems(): Promise<KnowledgeItem[]>;
  listKnowledgeItemsByIds(itemIds: string[]): Promise<KnowledgeItem[]>;
  listWeeklyKnowledgeItems(since: number): Promise<KnowledgeItem[]>;
  listPendingKnowledgeItemsForLabeling(limit: number): Promise<KnowledgeItem[]>;
  getKnowledgeItemById(itemId: string): Promise<KnowledgeItem | null>;
  getDueKnowledgeItems(input: GetDueKnowledgeItemsInput): Promise<KnowledgeItem[]>;
  updateKnowledgeItem(itemId: string, patch: KnowledgeItemPatch): Promise<KnowledgeItem>;
  createConversation(conversation: NewConversation): Promise<Conversation>;
  listConversations(): Promise<Conversation[]>;
  updateConversation(
    conversationId: string,
    patch: ConversationPatch
  ): Promise<Conversation>;
  deleteConversation(conversationId: string, deletedAt: number): Promise<void>;
  listConversationMessages(conversationId: string): Promise<Message[]>;
  addMessage(message: NewMessage): Promise<Message>;
  updateMessage(messageId: string, patch: MessagePatch): Promise<Message>;
  deleteMessage(messageId: string, deletedAt: number): Promise<void>;
  saveRecommendations(recommendations: NewRecommendation[]): Promise<void>;
  listRecommendations(): Promise<Recommendation[]>;
  listPendingRecommendations(): Promise<Recommendation[]>;
  listRecentFeedbackEvents(limit: number): Promise<FeedbackEvent[]>;
  logRecommendationFeedback(event: NewFeedbackEvent): Promise<FeedbackEvent>;
  respondToRecommendation(
    recommendationId: string,
    status: RecommendationStatus,
    event: NewFeedbackEvent
  ): Promise<void>;
}

export type MobileCoreClient = CoreClient;
