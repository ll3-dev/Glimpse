export type { EngineClient, RustraError } from '@rustra/types';
export { RustraCommandError } from '@rustra/types';

export type MessageIo = {
  id: string;
  conversationId: string;
  role: string;
  content: string;
  createdAt: number;
  updatedAt?: number | null;
  deletedAt?: number | null;
};

export type CoreKnowledgeItemLikeIo = {
  tags?: string[] | null;
  lastReviewedAt?: number | null;
  nextReviewAt?: number | null;
  createdAt?: number | null;
};

export type ConversationIo = {
  id: string;
  title?: string | null;
  icon?: string | null;
  contextItemId?: string | null;
  createdAt: number;
  updatedAt: number;
  deletedAt?: number | null;
};

export type KnowledgeItemIo = {
  id: string;
  type: string;
  title?: string | null;
  body?: string | null;
  url?: string | null;
  summary?: string | null;
  tags?: string[] | null;
  labels?: string[] | null;
  provisionalLabels?: string[] | null;
  labelStatus?: string | null;
  labelSource?: string | null;
  labelVersion?: string | null;
  labelScore?: number | null;
  labelRequestedAt?: number | null;
  labelCompletedAt?: number | null;
  labelError?: string | null;
  createdAt: number;
  updatedAt: number;
  stability?: number | null;
  difficulty?: number | null;
  lastReviewedAt?: number | null;
  nextReviewAt?: number | null;
};

export type RecommendationIo = {
  id: string;
  itemA_id: string;
  itemB_id: string;
  reason?: string | null;
  status: string;
  createdAt: number;
  respondedAt?: number | null;
};

export type FeedbackEventIo = {
  id: string;
  recommendationId: string;
  action: string;
  createdAt: number;
};

export type ConversationPatchIo = {
  title?: unknown;
  icon?: unknown;
  contextItemId?: unknown;
  updatedAt?: number | null;
  deletedAt?: unknown;
};

export type KnowledgeItemPatchIo = {
  type?: string | null;
  title?: unknown;
  body?: unknown;
  url?: unknown;
  summary?: unknown;
  tags?: unknown;
  labels?: unknown;
  provisionalLabels?: unknown;
  labelStatus?: unknown;
  labelSource?: unknown;
  labelVersion?: unknown;
  labelScore?: unknown;
  labelRequestedAt?: unknown;
  labelCompletedAt?: unknown;
  labelError?: unknown;
  updatedAt?: number | null;
  stability?: unknown;
  difficulty?: unknown;
  lastReviewedAt?: unknown;
  nextReviewAt?: unknown;
};

export type MessagePatchIo = {
  content?: string | null;
  updatedAt?: number | null;
  deletedAt?: unknown;
};

export type AddMessageInput = {
  message: MessageIo;
};

export type AddMessageOutput = {
  message: MessageIo;
};

export type CalculateNextReviewIoInput = {
  lastReviewedAt?: number | null;
  nextReviewAt?: number | null;
  feedbackType: string;
  now: number;
};

export type CalculateNextReviewIoOutput = {
  intervalMs: number;
  nextReviewAt: number;
};

export type CalculateTagOverlapIoInput = {
  left: CoreKnowledgeItemLikeIo;
  right: CoreKnowledgeItemLikeIo;
};

export type CalculateTagOverlapIoOutput = {
  overlap: number;
};

export type CreateConversationInput = {
  conversation: ConversationIo;
};

export type CreateConversationOutput = {
  conversation: ConversationIo;
};

export type DeleteConversationInput = {
  conversationId: string;
  deletedAt: number;
};

export type DeleteConversationOutput = Record<string, unknown>;

export type DeleteMessageInput = {
  messageId: string;
  deletedAt: number;
};

export type DeleteMessageOutput = Record<string, unknown>;

export type GetDueKnowledgeItemsIoInput = {
  now: number;
  limit?: number | null;
};

export type GetDueKnowledgeItemsIoOutput = {
  items: KnowledgeItemIo[];
};

export type GetKnowledgeItemByIdInput = {
  itemId: string;
};

export type GetKnowledgeItemByIdOutput = {
  item?: KnowledgeItemIo | null;
};

export type InitializeReviewScheduleIoInput = {
  createdAt: number;
  intervalMs?: number | null;
};

export type InitializeReviewScheduleIoOutput = {
  nextReviewAt: number;
  stability?: number | null;
  difficulty?: number | null;
  lastReviewedAt?: number | null;
};

export type ListConversationMessagesInput = {
  conversationId: string;
};

export type ListConversationMessagesOutput = {
  messages: MessageIo[];
};

export type ListConversationsInput = Record<string, unknown>;

export type ListConversationsOutput = {
  conversations: ConversationIo[];
};

export type ListKnowledgeItemsInput = Record<string, unknown>;

export type ListKnowledgeItemsOutput = {
  items: KnowledgeItemIo[];
};

export type ListKnowledgeItemsByIdsInput = {
  itemIds: string[];
};

export type ListKnowledgeItemsOutputByIds = {
  items: KnowledgeItemIo[];
};

export type ListPendingKnowledgeItemsForLabelingInput = {
  limit: number;
};

export type ListPendingKnowledgeItemsForLabelingOutput = {
  items: KnowledgeItemIo[];
};

export type ListPendingRecommendationsInput = Record<string, unknown>;

export type ListPendingRecommendationsOutput = {
  recommendations: RecommendationIo[];
};

export type ListRecentFeedbackEventsInput = {
  limit: number;
};

export type ListRecentFeedbackEventsOutput = {
  events: FeedbackEventIo[];
};

export type ListRecommendationsInput = Record<string, unknown>;

export type ListRecommendationsOutput = {
  recommendations: RecommendationIo[];
};

export type ListWeeklyKnowledgeItemsInput = {
  since: number;
};

export type ListWeeklyKnowledgeItemsOutput = {
  items: KnowledgeItemIo[];
};

export type LogRecommendationFeedbackInput = {
  event: FeedbackEventIo;
};

export type LogRecommendationFeedbackOutput = {
  event: FeedbackEventIo;
};

export type RespondToRecommendationInput = {
  recommendationId: string;
  status: string;
  feedbackEvent: FeedbackEventIo;
};

export type RespondToRecommendationOutput = Record<string, unknown>;

export type SaveKnowledgeItemInput = {
  item: KnowledgeItemIo;
};

export type SaveKnowledgeItemOutput = {
  item: KnowledgeItemIo;
};

export type SaveRecommendationsInput = {
  recommendations: RecommendationIo[];
};

export type SaveRecommendationsOutput = Record<string, unknown>;

export type UpdateConversationInput = {
  conversationId: string;
  patch: ConversationPatchIo;
};

export type UpdateConversationOutput = {
  conversation: ConversationIo;
};

export type UpdateKnowledgeItemInput = {
  itemId: string;
  patch: KnowledgeItemPatchIo;
};

export type UpdateKnowledgeItemOutput = {
  item: KnowledgeItemIo;
};

export type UpdateMessageInput = {
  messageId: string;
  patch: MessagePatchIo;
};

export type UpdateMessageOutput = {
  message: MessageIo;
};

