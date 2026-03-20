export type PlatformTarget = 'mobile' | 'desktop' | 'extension';

export interface WorkspaceArchitecture {
  mobileApp: string;
  mobileBridgePackage: string;
  desktopApp: string;
  rustCore: string;
  sharedPackage: string;
}

export const workspaceArchitecture: WorkspaceArchitecture = {
  mobileApp: 'apps/mobile',
  mobileBridgePackage: 'packages/mobile-core-module',
  desktopApp: 'apps/desktop',
  rustCore: 'packages/core-rs',
  sharedPackage: 'packages/shared',
};

export type KnowledgeItemType = 'note' | 'link' | 'highlight' | 'screenshot' | 'share';
export type KnowledgeItemLabelStatus =
  | 'idle'
  | 'pending'
  | 'provisional'
  | 'final'
  | 'failed';
export type KnowledgeItemLabelSource =
  | 'none'
  | 'rules'
  | 'apple'
  | 'local_small'
  | 'local_full'
  | 'byok';
export type RecommendationStatus = 'pending' | 'accepted' | 'ignored' | 'dismissed';
export type FeedbackActionType = 'accept' | 'ignore' | 'dismiss';
export type MessageRole = 'user' | 'assistant';
export type EmbeddingSourceType = 'message' | 'knowledge_item';

export interface KnowledgeItem {
  id: string;
  type: KnowledgeItemType;
  title: string | null;
  body: string | null;
  url: string | null;
  summary: string | null;
  tags: string[] | null;
  labels?: string[] | null;
  provisionalLabels?: string[] | null;
  labelStatus?: KnowledgeItemLabelStatus | null;
  labelSource?: KnowledgeItemLabelSource | null;
  labelVersion?: string | null;
  labelScore?: number | null;
  labelRequestedAt?: number | null;
  labelCompletedAt?: number | null;
  labelError?: string | null;
  createdAt: number;
  updatedAt: number;
  stability: number | null;
  difficulty: number | null;
  lastReviewedAt: number | null;
  nextReviewAt: number | null;
}

export type NewKnowledgeItem = KnowledgeItem;
export type KnowledgeItemPatch = Partial<Omit<KnowledgeItem, 'id' | 'createdAt'>>;

export interface Recommendation {
  id: string;
  itemA_id: string;
  itemB_id: string;
  reason: string | null;
  status: RecommendationStatus;
  createdAt: number;
  respondedAt: number | null;
}

export type NewRecommendation = Recommendation;
export type RecommendationPatch = Partial<Omit<Recommendation, 'id' | 'createdAt'>>;

export interface FeedbackEvent {
  id: string;
  recommendationId: string;
  action: FeedbackActionType;
  createdAt: number;
}

export type NewFeedbackEvent = FeedbackEvent;

export interface Conversation {
  id: string;
  title: string | null;
  icon: string | null;
  contextItemId: string | null;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
}

export type NewConversation = Conversation;
export type ConversationPatch = Partial<Omit<Conversation, 'id' | 'createdAt'>>;

export interface Message {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  createdAt: number;
  updatedAt: number | null;
  deletedAt: number | null;
}

export type NewMessage = Message;
export type MessagePatch = Partial<Omit<Message, 'id' | 'conversationId' | 'createdAt'>>;

export interface Embedding {
  id: string;
  sourceType: EmbeddingSourceType;
  sourceId: string;
  vector: number[];
  createdAt: number;
}

export interface CoreKnowledgeItemLike {
  tags?: string[] | null;
  lastReviewedAt?: number | null;
  nextReviewAt?: number | null;
  createdAt?: number | null;
}

export type ReviewFeedbackType = 'remembered' | 'postponed';

export interface CalculateTagOverlapInput {
  left: Pick<CoreKnowledgeItemLike, 'tags'>;
  right: Pick<CoreKnowledgeItemLike, 'tags'>;
}

export interface CalculateNextReviewInput {
  lastReviewedAt: number | null;
  nextReviewAt: number | null;
  feedbackType: ReviewFeedbackType;
  now: number;
}

export interface CalculateNextReviewOutput {
  intervalMs: number;
  nextReviewAt: number;
}

export interface InitializeReviewScheduleInput {
  createdAt: number;
  intervalMs?: number;
}

export interface InitializeReviewScheduleOutput {
  nextReviewAt: number;
  stability: number | null;
  difficulty: number | null;
  lastReviewedAt: number | null;
}

export interface GetDueKnowledgeItemsInput {
  now: number;
  limit?: number;
}
