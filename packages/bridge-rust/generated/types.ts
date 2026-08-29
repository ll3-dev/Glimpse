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

export type BackoffState = {
  /** Consecutive failures so far (reset to 0 on success). */
  failures: number;
  /** True once an auth rejection made retrying pointless until re-pairing. */
  invalidated: boolean;
  /** Timestamp (ms) until which auto-sync should hold off. */
  holdUntil: number;
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

/**
 * One discoverable desktop sync server (mDNS SRV + TXT resolved).
 */
export type DiscoveredPeer = {
  /** Instance name — the desktop's user-facing device name. */
  name: string;
  /** mDNS hostname with trailing dot (e.g. `glimpse-ab12cd34.local.`). */
  host: string;
  port: number;
  /** Resolved IPv4/IPv6 addresses observed during browse. */
  addresses: string[];
  /** TXT `deviceId` — stable identity for dedupe/pairing. */
  deviceId: string;
  /** TXT `protocol` — sync wire protocol version. */
  protocolVersion: number;
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

export type CalculateTagOverlapInput = {
  left: CoreKnowledgeItemLikeIo;
  right: CoreKnowledgeItemLikeIo;
};

export type CalculateTagOverlapOutput = {
  overlap: number;
};

export type CreateConversationInput = {
  conversation: ConversationIo;
};

export type CreateConversationOutput = {
  conversation: ConversationIo;
};

export type DeleteAllDataInput = Record<string, unknown>;

export type DeleteAllDataOutput = Record<string, unknown>;

export type DeleteConversationInput = {
  conversationId: string;
  deletedAt: number;
};

export type DeleteConversationOutput = Record<string, unknown>;

export type DeleteKnowledgeItemInput = {
  itemId: string;
};

export type DeleteKnowledgeItemOutput = Record<string, unknown>;

export type DeleteMessageInput = {
  messageId: string;
  deletedAt: number;
};

export type DeleteMessageOutput = Record<string, unknown>;

export type DiscoveryBaseUrlInput = {
  host: string;
  port: number;
};

export type DiscoveryBaseUrlOutput = {
  url: string;
};

export type EndpointCandidatesInput = {
  tailscaleUrl?: string | null;
  lanUrl?: string | null;
};

export type EndpointCandidatesOutput = {
  endpoints: string[];
};

export type ExportDataInput = Record<string, unknown>;

export type ExportDataOutput = {
  dataJson: string;
};

export type ExportDeltaInput = {
  sinceClockMs: number;
};

export type ExportDeltaOutput = {
  dataJson: string;
};

export type GetDueKnowledgeItemsInput = {
  now: number;
  limit?: number | null;
};

export type GetDueKnowledgeItemsOutput = {
  items: KnowledgeItemIo[];
};

export type GetKnowledgeItemByIdInput = {
  itemId: string;
};

export type GetKnowledgeItemByIdOutput = {
  item?: KnowledgeItemIo | null;
};

export type ImportDataInput = {
  dataJson: string;
};

export type ImportDataOutput = {
  knowledgeItems: number;
  conversations: number;
  messages: number;
  recommendations: number;
  feedbackEvents: number;
};

export type InitializeCoreInput = {
  /** Absolute path of the SQLite database file to open. Ignored when the core is already initialized (the first path wins). */
  dbPath: string;
};

export type InitializeCoreOutput = {
  /** True when this call opened the database; false when a previous call (or the desktop Tauri setup hook) had already initialized the core. */
  initialized: boolean;
};

export type InitializeReviewScheduleInput = {
  createdAt: number;
  intervalMs?: number | null;
};

export type InitializeReviewScheduleOutput = {
  nextReviewAt: number;
  stability?: number | null;
  difficulty?: number | null;
  lastReviewedAt?: number | null;
};

export type IsHoldingOffInput = {
  state: BackoffState;
  now: number;
  force?: boolean;
};

export type IsHoldingOffOutput = {
  holdingOff: boolean;
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

export type MergeDataInput = {
  dataJson: string;
};

export type MergeDataOutput = {
  knowledgeItems: number;
  conversations: number;
  messages: number;
  recommendations: number;
  feedbackEvents: number;
};

export type MergeDeltaInput = {
  dataJson: string;
};

export type MergeDeltaOutput = {
  knowledgeItems: number;
  conversations: number;
  messages: number;
  recommendations: number;
  feedbackEvents: number;
};

export type NormalizeBaseUrlInput = {
  value: string;
};

export type NormalizeBaseUrlOutput = {
  url: string;
};

export type RecordFailureInput = {
  state: BackoffState;
  now: number;
  authRejected?: boolean;
};

export type RecordFailureOutput = {
  state: BackoffState;
};

export type RecordSuccessInput = {
  state: BackoffState;
};

export type RecordSuccessOutput = {
  state: BackoffState;
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

export type SyncDataRevisionInput = Record<string, unknown>;

export type SyncDataRevisionOutput = {
  revision: number;
};

export type SyncDiscoverInput = {
  /** How long to browse before returning (clamped to [100, 5000] ms). */
  timeoutMs: number;
};

export type SyncDiscoverOutput = {
  peers: DiscoveredPeer[];
};

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

