//! Data models for the Glimpse core library.
//!
//! These models correspond to the TypeScript types in `@glimpse/shared`.

use serde::{Deserialize, Serialize};

// ============================================================================
// Enums
// ============================================================================

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum KnowledgeItemType {
    Note,
    Link,
    Highlight,
    Screenshot,
    Share,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum KnowledgeItemLabelStatus {
    Idle,
    Pending,
    Provisional,
    Final,
    Failed,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum KnowledgeItemLabelSource {
    None,
    Rules,
    Apple,
    LocalSmall,
    LocalFull,
    Stub,
    Byok,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum RecommendationStatus {
    Pending,
    Accepted,
    Ignored,
    Dismissed,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum FeedbackActionType {
    Accept,
    Ignore,
    Dismiss,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum MessageRole {
    User,
    Assistant,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum EmbeddingSourceType {
    Message,
    KnowledgeItem,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ReviewFeedbackType {
    Remembered,
    Postponed,
}

// Alias for backwards compatibility
pub type CoreReviewFeedbackType = ReviewFeedbackType;

// ============================================================================
// Core Entities
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KnowledgeItem {
    pub id: String,
    #[serde(rename = "type")]
    pub item_type: KnowledgeItemType,
    pub title: Option<String>,
    pub body: Option<String>,
    pub url: Option<String>,
    pub summary: Option<String>,
    pub tags: Option<Vec<String>>,
    pub labels: Option<Vec<String>>,
    pub provisional_labels: Option<Vec<String>>,
    pub label_status: Option<KnowledgeItemLabelStatus>,
    pub label_source: Option<KnowledgeItemLabelSource>,
    pub label_version: Option<String>,
    pub label_score: Option<f64>,
    pub label_requested_at: Option<i64>,
    pub label_completed_at: Option<i64>,
    pub label_error: Option<String>,
    pub created_at: i64,
    pub updated_at: i64,
    pub stability: Option<f64>,
    pub difficulty: Option<f64>,
    pub last_reviewed_at: Option<i64>,
    pub next_review_at: Option<i64>,
}

pub type NewKnowledgeItem = KnowledgeItem;

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct KnowledgeItemPatch {
    #[serde(rename = "type", skip_serializing_if = "Option::is_none")]
    pub item_type: Option<KnowledgeItemType>,
    pub title: Option<String>,
    pub body: Option<String>,
    pub url: Option<String>,
    pub summary: Option<String>,
    pub tags: Option<Vec<String>>,
    pub labels: Option<Vec<String>>,
    pub provisional_labels: Option<Vec<String>>,
    pub label_status: Option<KnowledgeItemLabelStatus>,
    pub label_source: Option<KnowledgeItemLabelSource>,
    pub label_version: Option<String>,
    pub label_score: Option<f64>,
    pub label_requested_at: Option<i64>,
    pub label_completed_at: Option<i64>,
    pub label_error: Option<String>,
    pub updated_at: Option<i64>,
    pub stability: Option<f64>,
    pub difficulty: Option<f64>,
    pub last_reviewed_at: Option<i64>,
    pub next_review_at: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Conversation {
    pub id: String,
    pub title: Option<String>,
    pub icon: Option<String>,
    pub context_item_id: Option<String>,
    pub created_at: i64,
    pub updated_at: i64,
    pub deleted_at: Option<i64>,
}

pub type NewConversation = Conversation;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConversationPatch {
    pub title: Option<String>,
    pub icon: Option<String>,
    pub context_item_id: Option<String>,
    pub updated_at: Option<i64>,
    pub deleted_at: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Message {
    pub id: String,
    pub conversation_id: String,
    pub role: MessageRole,
    pub content: String,
    pub created_at: i64,
    pub updated_at: Option<i64>,
    pub deleted_at: Option<i64>,
}

pub type NewMessage = Message;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MessagePatch {
    pub content: Option<String>,
    pub updated_at: Option<i64>,
    pub deleted_at: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Recommendation {
    pub id: String,
    pub item_a_id: String,
    pub item_b_id: String,
    pub reason: Option<String>,
    pub status: RecommendationStatus,
    pub created_at: i64,
    pub responded_at: Option<i64>,
}

pub type NewRecommendation = Recommendation;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RecommendationPatch {
    pub reason: Option<String>,
    pub status: Option<RecommendationStatus>,
    pub responded_at: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FeedbackEvent {
    pub id: String,
    pub recommendation_id: String,
    pub action: FeedbackActionType,
    pub created_at: i64,
}

pub type NewFeedbackEvent = FeedbackEvent;

// Legacy alias for backwards compatibility
pub type FeedbackEventItem = FeedbackEvent;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Embedding {
    pub id: String,
    pub source_type: EmbeddingSourceType,
    pub source_id: String,
    pub vector: Vec<f64>,
    pub created_at: i64,
}

// ============================================================================
// Input/Output Types
// ============================================================================

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct CoreKnowledgeItemLike {
    pub tags: Option<Vec<String>>,
    pub last_reviewed_at: Option<i64>,
    pub next_review_at: Option<i64>,
    pub created_at: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CalculateTagOverlapInput {
    pub left: CoreKnowledgeItemLike,
    pub right: CoreKnowledgeItemLike,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CalculateNextReviewInput {
    pub last_reviewed_at: Option<i64>,
    pub next_review_at: Option<i64>,
    pub feedback_type: ReviewFeedbackType,
    pub now: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CalculateNextReviewOutput {
    pub interval_ms: i64,
    pub next_review_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InitializeReviewScheduleInput {
    pub created_at: i64,
    pub interval_ms: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InitializeReviewScheduleOutput {
    pub next_review_at: i64,
    pub stability: Option<f64>,
    pub difficulty: Option<f64>,
    pub last_reviewed_at: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GetDueKnowledgeItemsInput {
    pub now: i64,
    pub limit: Option<usize>,
}

// ============================================================================
// Storage Data Structure
// ============================================================================

#[derive(Debug, Clone, Default)]
pub struct CoreStoreData {
    pub knowledge_items: Vec<KnowledgeItem>,
    pub conversations: Vec<Conversation>,
    pub messages: Vec<Message>,
    pub recommendations: Vec<Recommendation>,
    pub feedback_events: Vec<FeedbackEvent>,
}
