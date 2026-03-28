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

#[derive(Debug, Clone, Default, Serialize, Deserialize, PartialEq)]
#[serde(untagged)]
pub enum NullablePatch<T> {
    Value(T),
    Null,
    #[default]
    Unset,
}

impl<T> NullablePatch<T> {
    pub fn is_unset(&self) -> bool {
        matches!(self, Self::Unset)
    }

    pub fn map<U>(self, transform: impl FnOnce(T) -> U) -> NullablePatch<U> {
        match self {
            Self::Value(value) => NullablePatch::Value(transform(value)),
            Self::Null => NullablePatch::Null,
            Self::Unset => NullablePatch::Unset,
        }
    }
}

impl<T, E> NullablePatch<Result<T, E>> {
    pub fn transpose(self) -> Result<NullablePatch<T>, E> {
        match self {
            NullablePatch::Value(Ok(value)) => Ok(NullablePatch::Value(value)),
            NullablePatch::Value(Err(error)) => Err(error),
            NullablePatch::Null => Ok(NullablePatch::Null),
            NullablePatch::Unset => Ok(NullablePatch::Unset),
        }
    }
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct KnowledgeItemPatch {
    #[serde(rename = "type", skip_serializing_if = "Option::is_none")]
    pub item_type: Option<KnowledgeItemType>,
    #[serde(default, skip_serializing_if = "NullablePatch::is_unset")]
    pub title: NullablePatch<String>,
    #[serde(default, skip_serializing_if = "NullablePatch::is_unset")]
    pub body: NullablePatch<String>,
    #[serde(default, skip_serializing_if = "NullablePatch::is_unset")]
    pub url: NullablePatch<String>,
    #[serde(default, skip_serializing_if = "NullablePatch::is_unset")]
    pub summary: NullablePatch<String>,
    #[serde(default, skip_serializing_if = "NullablePatch::is_unset")]
    pub tags: NullablePatch<Vec<String>>,
    #[serde(default, skip_serializing_if = "NullablePatch::is_unset")]
    pub labels: NullablePatch<Vec<String>>,
    #[serde(default, skip_serializing_if = "NullablePatch::is_unset")]
    pub provisional_labels: NullablePatch<Vec<String>>,
    #[serde(default, skip_serializing_if = "NullablePatch::is_unset")]
    pub label_status: NullablePatch<KnowledgeItemLabelStatus>,
    #[serde(default, skip_serializing_if = "NullablePatch::is_unset")]
    pub label_source: NullablePatch<KnowledgeItemLabelSource>,
    #[serde(default, skip_serializing_if = "NullablePatch::is_unset")]
    pub label_version: NullablePatch<String>,
    #[serde(default, skip_serializing_if = "NullablePatch::is_unset")]
    pub label_score: NullablePatch<f64>,
    #[serde(default, skip_serializing_if = "NullablePatch::is_unset")]
    pub label_requested_at: NullablePatch<i64>,
    #[serde(default, skip_serializing_if = "NullablePatch::is_unset")]
    pub label_completed_at: NullablePatch<i64>,
    #[serde(default, skip_serializing_if = "NullablePatch::is_unset")]
    pub label_error: NullablePatch<String>,
    pub updated_at: Option<i64>,
    #[serde(default, skip_serializing_if = "NullablePatch::is_unset")]
    pub stability: NullablePatch<f64>,
    #[serde(default, skip_serializing_if = "NullablePatch::is_unset")]
    pub difficulty: NullablePatch<f64>,
    #[serde(default, skip_serializing_if = "NullablePatch::is_unset")]
    pub last_reviewed_at: NullablePatch<i64>,
    #[serde(default, skip_serializing_if = "NullablePatch::is_unset")]
    pub next_review_at: NullablePatch<i64>,
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
    #[serde(default, skip_serializing_if = "NullablePatch::is_unset")]
    pub title: NullablePatch<String>,
    #[serde(default, skip_serializing_if = "NullablePatch::is_unset")]
    pub icon: NullablePatch<String>,
    #[serde(default, skip_serializing_if = "NullablePatch::is_unset")]
    pub context_item_id: NullablePatch<String>,
    pub updated_at: Option<i64>,
    #[serde(default, skip_serializing_if = "NullablePatch::is_unset")]
    pub deleted_at: NullablePatch<i64>,
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
    #[serde(default, skip_serializing_if = "NullablePatch::is_unset")]
    pub deleted_at: NullablePatch<i64>,
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

#[cfg(test)]
mod tests {
    use super::{KnowledgeItemPatch, NullablePatch};

    #[test]
    fn knowledge_item_patch_deserializes_tristate_fields() {
        let absent: KnowledgeItemPatch = serde_json::from_str("{}").unwrap();
        assert_eq!(absent.title, NullablePatch::Unset);

        let explicit_null: KnowledgeItemPatch =
            serde_json::from_str(r#"{"title":null,"tags":null}"#).unwrap();
        assert_eq!(explicit_null.title, NullablePatch::Null);
        assert_eq!(explicit_null.tags, NullablePatch::Null);

        let value: KnowledgeItemPatch =
            serde_json::from_str(r#"{"title":"hello","tags":["a","b"]}"#).unwrap();
        assert_eq!(value.title, NullablePatch::Value("hello".to_string()));
        assert_eq!(value.tags, NullablePatch::Value(vec!["a".to_string(), "b".to_string()]));
    }
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
