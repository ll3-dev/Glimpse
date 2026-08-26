export interface WorkspaceArchitecture {
  mobileApp: string;
  desktopApp: string;
  desktopShell: 'tauri' | 'electron' | 'pending';
  sharedPackage: string;
}

export const workspaceArchitecture: WorkspaceArchitecture = {
  mobileApp: 'apps/mobile',
  desktopApp: 'apps/desktop',
  desktopShell: 'tauri',
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
  | 'stub'
  | 'byok';
export type RecommendationStatus = 'pending' | 'accepted' | 'ignored' | 'dismissed';
export type FeedbackActionType = 'accept' | 'ignore' | 'dismiss';
export type MessageRole = 'user' | 'assistant';
export type EmbeddingSourceType = 'message' | 'knowledge_item';
export type InferenceMode = 'local' | 'apple' | 'byok';

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

export interface KeyValueStorage {
  getString: (key: string) => string | undefined;
  set: <T extends string>(key: string, value: T) => void;
  remove: (key: string) => void;
}

export interface CoreClient {
  initialize(dbPath: string): Promise<void>;
  calculateTagOverlap(input: CalculateTagOverlapInput): Promise<number>;
  calculateNextReview(input: CalculateNextReviewInput): Promise<CalculateNextReviewOutput>;
  initializeReviewSchedule(input: InitializeReviewScheduleInput): Promise<InitializeReviewScheduleOutput>;
  saveKnowledgeItem(item: KnowledgeItem): Promise<KnowledgeItem>;
  listKnowledgeItems(): Promise<KnowledgeItem[]>;
  listKnowledgeItemsByIds(itemIds: string[]): Promise<KnowledgeItem[]>;
  listWeeklyKnowledgeItems(since: number): Promise<KnowledgeItem[]>;
  listPendingKnowledgeItemsForLabeling(limit: number): Promise<KnowledgeItem[]>;
  getKnowledgeItemById(itemId: string): Promise<KnowledgeItem | null>;
  getDueKnowledgeItems(input: GetDueKnowledgeItemsInput): Promise<KnowledgeItem[]>;
  updateKnowledgeItem(
    itemId: string,
    patch: Partial<Omit<KnowledgeItem, 'id' | 'createdAt'>>
  ): Promise<KnowledgeItem>;
  deleteKnowledgeItem(itemId: string): Promise<void>;
  createConversation(conversation: Conversation): Promise<Conversation>;
  listConversations(): Promise<Conversation[]>;
  updateConversation(
    conversationId: string,
    patch: Partial<Omit<Conversation, 'id' | 'createdAt'>>
  ): Promise<Conversation>;
  deleteConversation(conversationId: string, deletedAt: number): Promise<void>;
  listConversationMessages(conversationId: string): Promise<Message[]>;
  addMessage(message: Message): Promise<Message>;
  updateMessage(
    messageId: string,
    patch: Partial<Omit<Message, 'id' | 'conversationId' | 'createdAt'>>
  ): Promise<Message>;
  deleteMessage(messageId: string, deletedAt: number): Promise<void>;
  saveRecommendations(recommendations: Recommendation[]): Promise<void>;
  listRecommendations(): Promise<Recommendation[]>;
  listPendingRecommendations(): Promise<Recommendation[]>;
  respondToRecommendation(
    recommendationId: string,
    status: RecommendationStatus,
    feedbackEvent: FeedbackEvent
  ): Promise<void>;
  listRecentFeedbackEvents(limit: number): Promise<FeedbackEvent[]>;
  logRecommendationFeedback(event: FeedbackEvent): Promise<FeedbackEvent>;
  exportData(): Promise<string>;
  importData(dataJson: string): Promise<DataImportSummary>;
  mergeData(dataJson: string): Promise<DataImportSummary>;
  deleteAllData(): Promise<void>;
}

export interface DataImportSummary {
  knowledgeItems: number;
  conversations: number;
  messages: number;
  recommendations: number;
  feedbackEvents: number;
}

export * from './local-model-registry';
export * from './diagnostics';
