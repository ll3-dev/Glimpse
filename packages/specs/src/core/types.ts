// packages/specs/src/core/types.ts
import type { KnowledgeItem } from '@glimpse/shared';

/**
 * Bridge transport types - FFI-safe versions of domain types.
 * Only what crosses the bridge boundary.
 * These are intentionally limited to the allowed subset per architecture doc.
 */

// Re-export shared types that are already bridge-compatible
export type {
  KnowledgeItem,
  KnowledgeItemType,
  KnowledgeItemLabelStatus,
  KnowledgeItemLabelSource,
  Recommendation,
  RecommendationStatus,
  FeedbackEvent,
  FeedbackActionType,
  Conversation,
  Message,
  MessageRole,
  ReviewFeedbackType,
  InitializeReviewScheduleInput,
  InitializeReviewScheduleOutput,
  GetDueKnowledgeItemsInput,
} from '@glimpse/shared';

/**
 * Bridge-specific input types with explicit nullability
 * Using snake_case for FFI compatibility as per architecture doc.
 */
export interface BridgeCalculateTagOverlapInput {
  left_tags: string[] | null;
  right_tags: string[] | null;
}

export interface BridgeCalculateNextReviewInput {
  last_reviewed_at: number | null;
  next_review_at: number | null;
  feedback_type: 'remembered' | 'postponed';
  now: number;
}

export interface BridgeKnowledgeItemPatch {
  item_type?: 'note' | 'link' | 'highlight' | 'screenshot' | 'share';
  title?: string | null;
  body?: string | null;
  url?: string | null;
  summary?: string | null;
  tags?: string[] | null;
  labels?: string[] | null;
  provisional_labels?: string[] | null;
  label_status?: 'idle' | 'pending' | 'provisional' | 'final' | 'failed' | null;
  label_source?: 'none' | 'rules' | 'apple' | 'local_small' | 'local_full' | 'stub' | 'byok' | null;
  label_version?: string | null;
  label_score?: number | null;
  label_requested_at?: number | null;
  label_completed_at?: number | null;
  label_error?: string | null;
  updated_at?: number;
  stability?: number | null;
  difficulty?: number | null;
  last_reviewed_at?: number | null;
  next_review_at?: number | null;
}

export interface BridgeConversationPatch {
  title?: string | null;
  icon?: string | null;
  context_item_id?: string | null;
  updated_at?: number;
  deleted_at?: number | null;
}

export interface BridgeMessagePatch {
  content?: string;
  updated_at?: number;
  deleted_at?: number | null;
}

export interface BridgeRecommendationPatch {
  reason?: string | null;
  status?: 'pending' | 'accepted' | 'ignored' | 'dismissed';
  responded_at?: number | null;
}
