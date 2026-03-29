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
}

// ============================================================================
// Local LLM Model Registry
// ============================================================================

export type LocalLLMModelFamily =
  | 'qwen-chatml'
  | 'qwen'
  | 'llama'
  | 'mistral'
  | 'phi'
  | 'nomic'
  | 'gemma'
  | 'generic-instruct';

export type ModelCapability = 'chat' | 'embedding' | 'tools';

export interface LocalModelDefinition {
  /** Unique model identifier (also used as filename stem) */
  id: string;
  /** Human-readable name */
  name: string;
  /** HuggingFace repository for downloading */
  repo: string;
  /** GGUF filename in the repository */
  filename: string;
  /** Template/prompt family */
  family: LocalLLMModelFamily;
  /** Quantization level */
  quantization: string;
  /** Size in bytes (approximate) */
  sizeBytes: number;
  /** Display size string (e.g., "~535MB") */
  displaySize: string;
  /** Context window length */
  contextLength: number;
  /** What this model can do */
  capabilities: ModelCapability[];
  /** Brief description */
  description?: string;
}

export const LOCAL_MODEL_REGISTRY: LocalModelDefinition[] = [
  {
    id: 'qwen3.5-0.8b-unsloth-q4',
    name: 'Qwen 3.5 0.8B Unsloth (Q4_K_M)',
    repo: 'unsloth/Qwen3.5-0.8B-GGUF',
    filename: 'Qwen3.5-0.8B-Q4_K_M.gguf',
    family: 'qwen-chatml',
    quantization: 'Q4_K_M',
    sizeBytes: 562_036_672,
    displaySize: '~535MB',
    contextLength: 8192,
    capabilities: ['chat', 'tools'],
    description: '가장 가벼운 Qwen 3.5',
  },
  {
    id: 'qwen3.5-2b-unsloth-q4',
    name: 'Qwen 3.5 2B Unsloth (Q4_K_M)',
    repo: 'unsloth/Qwen3.5-2B-GGUF',
    filename: 'Qwen3.5-2B-Q4_K_M.gguf',
    family: 'qwen-chatml',
    quantization: 'Q4_K_M',
    sizeBytes: 1_353_293_824,
    displaySize: '~1.29GB',
    contextLength: 8192,
    capabilities: ['chat', 'tools'],
    description: '속도와 성능의 균형',
  },
  {
    id: 'qwen3.5-4b-unsloth-q4',
    name: 'Qwen 3.5 4B Unsloth (Q4_K_M)',
    repo: 'unsloth/Qwen3.5-4B-GGUF',
    filename: 'Qwen3.5-4B-Q4_K_M.gguf',
    family: 'qwen-chatml',
    quantization: 'Q4_K_M',
    sizeBytes: 2_899_560_448,
    displaySize: '~2.7GB',
    contextLength: 8192,
    capabilities: ['chat', 'tools'],
    description: 'Unsloth 최적화 버전',
  },
  {
    id: 'gemma-3n-e2b-q3',
    name: 'Gemma 3N E2B IT (Q3_K_M)',
    repo: 'unsloth/gemma-3n-E2B-it-GGUF',
    filename: 'gemma-3n-E2B-it-Q3_K_M.gguf',
    family: 'generic-instruct',
    quantization: 'Q3_K_M',
    sizeBytes: 2_462_556_160,
    displaySize: '~2.3GB',
    contextLength: 8192,
    capabilities: ['chat'],
    description: '균형 잡힌 성능',
  },
  {
    id: 'nomic-embed-text-v1.5-q8_0',
    name: 'Nomic Embed Text v1.5 (Q8_0)',
    repo: 'nomic-ai/nomic-embed-text-v1.5-GGUF',
    filename: 'nomic-embed-text-v1.5.Q8_0.gguf',
    family: 'nomic',
    quantization: 'Q8_0',
    sizeBytes: 327_155_712,
    displaySize: '~312MB',
    contextLength: 2048,
    capabilities: ['embedding'],
    description: '텍스트 임베딩 전용',
  },
];

export function getModelDefinition(modelId: string): LocalModelDefinition | undefined {
  return LOCAL_MODEL_REGISTRY.find((m) => m.id === modelId);
}

export function getChatModels(): LocalModelDefinition[] {
  return LOCAL_MODEL_REGISTRY.filter((m) => m.capabilities.includes('chat'));
}

export function getEmbeddingModels(): LocalModelDefinition[] {
  return LOCAL_MODEL_REGISTRY.filter((m) => m.capabilities.includes('embedding'));
}
