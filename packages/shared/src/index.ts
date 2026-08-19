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
  | 'glm'
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
  // ── Mobile + Desktop (2025.12 ~ 2026.02) ──────────────────────
  {
    id: 'qwen3.5-0.8b-q4',
    name: 'Qwen 3.5 0.8B',
    repo: 'unsloth/Qwen3.5-0.8B-GGUF',
    filename: 'Qwen3.5-0.8B-Q4_K_M.gguf',
    family: 'qwen-chatml',
    quantization: 'Q4_K_M',
    sizeBytes: 536_870_912,
    displaySize: '~500MB',
    contextLength: 262_144,
    capabilities: ['chat', 'tools', 'vision', 'reasoning'],
    platform: 'both',
    description: '하이브리드 DeltaNet+Attention, 201개 언어 (2026.02)',
  },
  {
    id: 'qwen3.5-2b-q4',
    name: 'Qwen 3.5 2B',
    repo: 'unsloth/Qwen3.5-2B-GGUF',
    filename: 'Qwen3.5-2B-Q4_K_M.gguf',
    family: 'qwen-chatml',
    quantization: 'Q4_K_M',
    sizeBytes: 1_277_802_496,
    displaySize: '~1.2GB',
    contextLength: 262_144,
    capabilities: ['chat', 'tools', 'vision', 'reasoning'],
    platform: 'both',
    description: '속도와 품질의 균형, 멀티모달 (2026.02)',
  },
  {
    id: 'ministral-3-3b-instruct-q4',
    name: 'Ministral-3 3B Instruct',
    repo: 'unsloth/Ministral-3-3B-Instruct-2512-GGUF',
    filename: 'Ministral-3-3B-Instruct-2512-Q4_K_M.gguf',
    family: 'mistral',
    quantization: 'Q4_K_M',
    sizeBytes: 2_147_483_648,
    displaySize: '~2.0GB',
    contextLength: 262_144,
    capabilities: ['chat', 'tools'],
    platform: 'both',
    description: '함수호출+도구사용, 멀티링구얼 (2025.12)',
  },
  {
    id: 'qwen3.5-4b-q4',
    name: 'Qwen 3.5 4B',
    repo: 'unsloth/Qwen3.5-4B-GGUF',
    filename: 'Qwen3.5-4B-Q4_K_M.gguf',
    family: 'qwen-chatml',
    quantization: 'Q4_K_M',
    sizeBytes: 2_738_398_208,
    displaySize: '~2.6GB',
    contextLength: 262_144,
    capabilities: ['chat', 'tools', 'vision', 'reasoning'],
    platform: 'both',
    description: '멀티모달, DeltaNet 아키텍처 (2026.02)',
  },
  {
    id: 'ministral-3-3b-reasoning-q4',
    name: 'Ministral-3 3B Reasoning',
    repo: 'MaziyarPanahi/Ministral-3-3B-Reasoning-2512-GGUF',
    filename: 'Ministral-3-3B-Reasoning-2512-Q4_K_M.gguf',
    family: 'mistral',
    quantization: 'Q4_K_M',
    sizeBytes: 2_147_483_648,
    displaySize: '~2.0GB',
    contextLength: 262_144,
    capabilities: ['chat', 'reasoning'],
    platform: 'both',
    description: '수학/논리 추론 특화 (2025.12)',
  },

  // ── Desktop-only medium (2025.09 ~ 2026.02) ───────────────────
  {
    id: 'qwen3.5-9b-q4',
    name: 'Qwen 3.5 9B',
    repo: 'unsloth/Qwen3.5-9B-GGUF',
    filename: 'Qwen3.5-9B-Q4_K_M.gguf',
    family: 'qwen-chatml',
    quantization: 'Q4_K_M',
    sizeBytes: 5_683_793_920,
    displaySize: '~5.3GB',
    contextLength: 262_144,
    capabilities: ['chat', 'tools', 'vision', 'reasoning'],
    platform: 'desktop',
    description: 'MMLU-Pro 82.5, 최고 소형 모델 (2026.02)',
  },
  {
    id: 'ministral-3-8b-instruct-q4',
    name: 'Ministral-3 8B Instruct',
    repo: 'unsloth/Ministral-3-8B-Instruct-2512-GGUF',
    filename: 'Ministral-3-8B-Instruct-2512-Q4_K_M.gguf',
    family: 'mistral',
    quantization: 'Q4_K_M',
    sizeBytes: 5_197_434_880,
    displaySize: '~4.8GB',
    contextLength: 262_144,
    capabilities: ['chat', 'tools', 'code'],
    platform: 'desktop',
    description: '에이전트/도구사용 특화 (2025.12)',
  },
  {
    id: 'ministral-3-14b-reasoning-q4',
    name: 'Ministral-3 14B Reasoning',
    repo: 'unsloth/Ministral-3-14B-Reasoning-2512-GGUF',
    filename: 'Ministral-3-14B-Reasoning-2512-Q4_K_M.gguf',
    family: 'mistral',
    quantization: 'Q4_K_M',
    sizeBytes: 8_230_502_400,
    displaySize: '~7.7GB',
    contextLength: 262_144,
    capabilities: ['chat', 'reasoning', 'code'],
    platform: 'desktop',
    description: '수학/코딩 추론 (2025.12)',
  },
  {
    id: 'phi-4-reasoning-vision-15b-q4',
    name: 'Phi-4 Reasoning Vision 15B',
    repo: 'jamesburton/Phi-4-reasoning-vision-15B-GGUF',
    filename: 'Phi-4-reasoning-vision-15B-Q4_K_M.gguf',
    family: 'phi',
    quantization: 'Q4_K_M',
    sizeBytes: 9_059_696_640,
    displaySize: '~8.4GB',
    contextLength: 16_384,
    capabilities: ['chat', 'reasoning', 'vision'],
    platform: 'desktop',
    description: '이미지+텍스트 추론, SigLIP-2 (2026.01)',
  },
  {
    id: 'magistral-small-2509-q4',
    name: 'Magistral Small 24B',
    repo: 'unsloth/Magistral-Small-2509-GGUF',
    filename: 'Magistral-Small-2509-Q4_K_M.gguf',
    family: 'mistral',
    quantization: 'Q4_K_M',
    sizeBytes: 14_324_375_552,
    displaySize: '~13.4GB',
    contextLength: 131_072,
    capabilities: ['chat', 'reasoning'],
    platform: 'desktop',
    description: '[THINK] 토큰으로 긴 추론, 24B (2025.09)',
  },
  {
    id: 'devstral-small-2-24b-q4',
    name: 'Devstral Small 2 24B',
    repo: 'unsloth/Devstral-Small-2-24B-Instruct-2512-GGUF',
    filename: 'Devstral-Small-2-24B-Instruct-2512-Q4_K_M.gguf',
    family: 'mistral',
    quantization: 'Q4_K_M',
    sizeBytes: 14_324_375_552,
    displaySize: '~13.4GB',
    contextLength: 262_144,
    capabilities: ['chat', 'code', 'tools'],
    platform: 'desktop',
    description: '에이전트 코딩, 함수호출 (2025.11)',
  },

  // ── Desktop-only large (2026.01 ~ 2026.02) ───────────────────
  {
    id: 'qwen3.5-27b-q4',
    name: 'Qwen 3.5 27B',
    repo: 'unsloth/Qwen3.5-27B-GGUF',
    filename: 'Qwen3.5-27B-Q4_K_M.gguf',
    family: 'qwen-chatml',
    quantization: 'Q4_K_M',
    sizeBytes: 16_744_440_832,
    displaySize: '~15.6GB',
    contextLength: 262_144,
    capabilities: ['chat', 'tools', 'vision', 'reasoning'],
    platform: 'desktop',
    description: '대형 범용, 멀티모달 (2026.02)',
  },
  {
    id: 'glm-4.7-flash-q4',
    name: 'GLM-4.7 Flash',
    repo: 'unsloth/GLM-4.7-Flash-GGUF',
    filename: 'GLM-4.7-Flash-Q4_K_M.gguf',
    family: 'glm',
    quantization: 'Q4_K_M',
    sizeBytes: 18_307_849_216,
    displaySize: '~17GB',
    contextLength: 131_072,
    capabilities: ['chat', 'tools', 'reasoning'],
    platform: 'desktop',
    description: 'Zhipu AI, 한/영/중, 에이전트 (2026.01)',
  },
  {
    id: 'qwen3.5-35b-a3b-q4',
    name: 'Qwen 3.5 35B MoE',
    repo: 'unsloth/Qwen3.5-35B-A3B-GGUF',
    filename: 'Qwen3.5-35B-A3B-Q4_K_M.gguf',
    family: 'qwen-chatml',
    quantization: 'Q4_K_M',
    sizeBytes: 22_011_733_504,
    displaySize: '~20.5GB',
    contextLength: 262_144,
    capabilities: ['chat', 'tools', 'vision', 'reasoning'],
    platform: 'desktop',
    description: 'MoE 3B 활성, 1M 확장, ⭐ 최고 가성비 (2026.02)',
  },

  // ── Embedding ────────────────────────────────────────────────────
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
    description: 'MoE 임베딩, 효율적',
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

export function getMobileModels(): LocalModelDefinition[] {
  return LOCAL_MODEL_REGISTRY.filter((m) => m.platform === 'mobile' || m.platform === 'both');
}
