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

export type ModelCapability = 'chat' | 'embedding' | 'tools' | 'code' | 'reasoning' | 'vision';

export type ModelPlatform = 'mobile' | 'desktop' | 'both';

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
  /** Which platforms can run this model */
  platform: ModelPlatform;
  /** Brief description */
  description?: string;
}

export const LOCAL_MODEL_REGISTRY: LocalModelDefinition[] = [
  // ── Mobile + Desktop (small, 2025~2026) ─────────────────────────
  {
    id: 'qwen3.5-0.8b-unsloth-q4',
    name: 'Qwen 3.5 0.8B',
    repo: 'unsloth/Qwen3.5-0.8B-GGUF',
    filename: 'Qwen3.5-0.8B-Q4_K_M.gguf',
    family: 'qwen-chatml',
    quantization: 'Q4_K_M',
    sizeBytes: 562_036_672,
    displaySize: '~535MB',
    contextLength: 131_072,
    capabilities: ['chat', 'tools'],
    platform: 'both',
    description: '가장 가벼운 Qwen 3.5 (2025)',
  },
  {
    id: 'qwen3.5-2b-unsloth-q4',
    name: 'Qwen 3.5 2B',
    repo: 'unsloth/Qwen3.5-2B-GGUF',
    filename: 'Qwen3.5-2B-Q4_K_M.gguf',
    family: 'qwen-chatml',
    quantization: 'Q4_K_M',
    sizeBytes: 1_610_612_736,
    displaySize: '~1.5GB',
    contextLength: 131_072,
    capabilities: ['chat', 'tools'],
    platform: 'both',
    description: '속도와 품질의 균형 (2025)',
  },
  {
    id: 'qwen3.5-4b-unsloth-q4',
    name: 'Qwen 3.5 4B',
    repo: 'unsloth/Qwen3.5-4B-GGUF',
    filename: 'Qwen3.5-4B-Q4_K_M.gguf',
    family: 'qwen-chatml',
    quantization: 'Q4_K_M',
    sizeBytes: 2_689_878_016,
    displaySize: '~2.5GB',
    contextLength: 131_072,
    capabilities: ['chat', 'tools', 'vision'],
    platform: 'both',
    description: '멀티모달, 131K 컨텍스트 (2025)',
  },
  {
    id: 'gemma-3-1b-it-q4',
    name: 'Gemma 3 1B IT',
    repo: 'unsloth/gemma-3-1b-it-GGUF',
    filename: 'gemma-3-1b-it-Q4_K_M.gguf',
    family: 'gemma',
    quantization: 'Q4_K_M',
    sizeBytes: 855_638_016,
    displaySize: '~816MB',
    contextLength: 131_072,
    capabilities: ['chat', 'vision'],
    platform: 'both',
    description: 'Google 초경량 멀티모달 (2025.03)',
  },
  {
    id: 'gemma-3-4b-it-q4',
    name: 'Gemma 3 4B IT',
    repo: 'unsloth/gemma-3-4b-it-GGUF',
    filename: 'gemma-3-4b-it-Q4_K_M.gguf',
    family: 'gemma',
    quantization: 'Q4_K_M',
    sizeBytes: 2_689_878_016,
    displaySize: '~2.5GB',
    contextLength: 131_072,
    capabilities: ['chat', 'vision'],
    platform: 'both',
    description: 'Google 멀티모달, 고품질 (2025.03)',
  },
  {
    id: 'phi-4-mini-instruct-q4',
    name: 'Phi-4 Mini 3.8B',
    repo: 'unsloth/Phi-4-mini-instruct-GGUF',
    filename: 'Phi-4-mini-instruct-Q4_K_M.gguf',
    family: 'phi',
    quantization: 'Q4_K_M',
    sizeBytes: 2_468_708_352,
    displaySize: '~2.3GB',
    contextLength: 131_072,
    capabilities: ['chat', 'reasoning'],
    platform: 'both',
    description: '추론/함수호출 특화 (2025.02)',
  },

  // ── Desktop-only (medium, 2025~2026) ───────────────────────────
  {
    id: 'qwen3.5-35b-a3b-q4',
    name: 'Qwen 3.5 35B MoE',
    repo: 'unsloth/Qwen3.5-35B-A3B-GGUF',
    filename: 'Qwen3.5-35B-A3B-Q4_K_M.gguf',
    family: 'qwen-chatml',
    quantization: 'Q4_K_M',
    sizeBytes: 4_831_834_112,
    displaySize: '~4.5GB',
    contextLength: 131_072,
    capabilities: ['chat', 'tools', 'vision', 'reasoning'],
    platform: 'desktop',
    description: 'MoE, 35B 품질에 3B 속도 ⭐ 추천 (2025)',
  },
  {
    id: 'qwen3-coder-30b-a3b-q4',
    name: 'Qwen3 Coder 30B MoE',
    repo: 'CleanUnicorn/Qwen3-Coder-30B-A3B-Instruct-Q4_K_M-GGUF',
    filename: 'qwen3-coder-30b-a3b-instruct-q4_k_m.gguf',
    family: 'qwen-chatml',
    quantization: 'Q4_K_M',
    sizeBytes: 18_253_721_600,
    displaySize: '~17GB',
    contextLength: 131_072,
    capabilities: ['chat', 'code', 'tools'],
    platform: 'desktop',
    description: '코딩 특화 MoE, 3B 활성 (2025)',
  },
  {
    id: 'qwen3.5-9b-q4',
    name: 'Qwen 3.5 9B',
    repo: 'unsloth/Qwen3.5-9B-GGUF',
    filename: 'Qwen3.5-9B-Q4_K_M.gguf',
    family: 'qwen-chatml',
    quantization: 'Q4_K_M',
    sizeBytes: 5_368_709_120,
    displaySize: '~5.0GB',
    contextLength: 131_072,
    capabilities: ['chat', 'tools', 'vision'],
    platform: 'desktop',
    description: '멀티모달, 고품질 범용 (2025)',
  },
  {
    id: 'deepseek-r1-distill-llama-8b-q4',
    name: 'DeepSeek R1 Distill 8B',
    repo: 'unsloth/DeepSeek-R1-Distill-Llama-8B-GGUF',
    filename: 'DeepSeek-R1-Distill-Llama-8B-Q4_K_M.gguf',
    family: 'llama',
    quantization: 'Q4_K_M',
    sizeBytes: 5_261_332_480,
    displaySize: '~4.9GB',
    contextLength: 131_072,
    capabilities: ['chat', 'reasoning'],
    platform: 'desktop',
    description: '수학/논리 추론 (2025.01)',
  },
  {
    id: 'gemma-3-12b-it-q4',
    name: 'Gemma 3 12B IT',
    repo: 'unsloth/gemma-3-12b-it-GGUF',
    filename: 'gemma-3-12b-it-Q4_K_M.gguf',
    family: 'gemma',
    quantization: 'Q4_K_M',
    sizeBytes: 8_589_934_592,
    displaySize: '~8GB',
    contextLength: 131_072,
    capabilities: ['chat', 'vision'],
    platform: 'desktop',
    description: 'Google 멀티모달, 대형 (2025.03)',
  },

  // ── Desktop-only (large, 2025) ─────────────────────────────────
  {
    id: 'mistral-small-3.2-24b-q4',
    name: 'Mistral Small 3.2 24B',
    repo: 'unsloth/Mistral-Small-3.2-24B-Instruct-2506-GGUF',
    filename: 'Mistral-Small-3.2-24B-Instruct-2506-Q4_K_M.gguf',
    family: 'mistral',
    quantization: 'Q4_K_M',
    sizeBytes: 15_032_385_536,
    displaySize: '~14GB',
    contextLength: 131_072,
    capabilities: ['chat', 'tools', 'vision'],
    platform: 'desktop',
    description: '멀티모달+함수호출, 최신 (2025.06)',
  },
  {
    id: 'phi-4-q4',
    name: 'Phi-4 14B',
    repo: 'unsloth/phi-4-GGUF',
    filename: 'phi-4-Q4_K_M.gguf',
    family: 'phi',
    quantization: 'Q4_K_M',
    sizeBytes: 9_126_860_800,
    displaySize: '~8.5GB',
    contextLength: 16_384,
    capabilities: ['chat', 'reasoning', 'code'],
    platform: 'desktop',
    description: '강력한 추론/코딩, MIT (2025.01)',
  },
  {
    id: 'deepseek-r1-distill-qwen-14b-q4',
    name: 'DeepSeek R1 Distill Qwen 14B',
    repo: 'unsloth/DeepSeek-R1-Distill-Qwen-14B-GGUF',
    filename: 'DeepSeek-R1-Distill-Qwen-14B-Q4_K_M.gguf',
    family: 'qwen-chatml',
    quantization: 'Q4_K_M',
    sizeBytes: 9_126_860_800,
    displaySize: '~8.5GB',
    contextLength: 131_072,
    capabilities: ['chat', 'reasoning'],
    platform: 'desktop',
    description: '수학/과학 최고 수준 (2025.01)',
  },

  // ── Embedding (2025) ────────────────────────────────────────────
  {
    id: 'nomic-embed-text-v1.5-q8_0',
    name: 'Nomic Embed v1.5',
    repo: 'nomic-ai/nomic-embed-text-v1.5-GGUF',
    filename: 'nomic-embed-text-v1.5.Q8_0.gguf',
    family: 'nomic',
    quantization: 'Q8_0',
    sizeBytes: 327_155_712,
    displaySize: '~312MB',
    contextLength: 8_192,
    capabilities: ['embedding'],
    platform: 'both',
    description: '텍스트 임베딩, 768차원',
  },
  {
    id: 'nomic-embed-text-v2-moe-q8_0',
    name: 'Nomic Embed v2 MoE',
    repo: 'nomic-ai/nomic-embed-text-v2-moe-GGUF',
    filename: 'nomic-embed-text-v2-moe.Q8_0.gguf',
    family: 'nomic',
    quantization: 'Q8_0',
    sizeBytes: 293_601_280,
    displaySize: '~280MB',
    contextLength: 8_192,
    capabilities: ['embedding'],
    platform: 'desktop',
    description: 'MoE 임베딩, 효율적 (2025)',
  },
];

export function getModelDefinition(modelId: string): LocalModelDefinition | undefined {
  return LOCAL_MODEL_REGISTRY.find((m) => m.id === modelId);
}

export function getChatModels(platform?: ModelPlatform): LocalModelDefinition[] {
  return LOCAL_MODEL_REGISTRY.filter(
    (m) => m.capabilities.includes('chat') && (!platform || m.platform === platform || m.platform === 'both'),
  );
}

export function getEmbeddingModels(platform?: ModelPlatform): LocalModelDefinition[] {
  return LOCAL_MODEL_REGISTRY.filter(
    (m) => m.capabilities.includes('embedding') && (!platform || m.platform === platform || m.platform === 'both'),
  );
}

export function getDesktopModels(): LocalModelDefinition[] {
  return LOCAL_MODEL_REGISTRY.filter((m) => m.platform === 'desktop' || m.platform === 'both');
}
