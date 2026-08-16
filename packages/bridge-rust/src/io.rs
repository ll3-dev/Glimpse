//! Wire (camelCase) IO models mirroring `glimpse_core` models.
//!
//! Contract rules:
//! - Every struct derives `Debug, Clone, Serialize, Deserialize, JsonSchema`
//!   and renames fields to camelCase to match the `@glimpse/shared` TS types.
//! - Enum-typed fields cross the bridge as plain strings — core enums are
//!   `#[serde(rename_all = "lowercase")]`, so strings round-trip back into the
//!   core enums via serde.
//! - Tristate patch fields (`NullablePatch<T>` in core) are modeled as
//!   `Option<serde_json::Value>`: `None` = unset, `Some(Value::Null)` =
//!   explicit null, `Some(v)` = value. See [`NullableValue`].

use glimpse_core::{
    CalculateNextReviewInput, CalculateNextReviewOutput, CalculateTagOverlapInput, Conversation,
    ConversationPatch, CoreKnowledgeItemLike, FeedbackEvent, InitializeReviewScheduleInput,
    InitializeReviewScheduleOutput, KnowledgeItem, KnowledgeItemLabelSource,
    KnowledgeItemLabelStatus, KnowledgeItemPatch, KnowledgeItemType, Message, MessagePatch,
    MessageRole, NullablePatch, Recommendation, RecommendationStatus, ReviewFeedbackType,
};
use serde::{Deserialize, Serialize};
use serde_json::Value;

/// JSON tristate for `NullablePatch<T>` fields.
///
/// `None` → [`NullablePatch::Unset`], `Some(Value::Null)` → [`NullablePatch::Null`],
/// `Some(v)` → [`NullablePatch::Value`] with `v` deserialized into `T`.
pub type NullableValue = Option<Value>;

fn to_patch<T: for<'de> Deserialize<'de>>(value: NullableValue) -> NullablePatch<T> {
    match value {
        None => NullablePatch::Unset,
        Some(Value::Null) => NullablePatch::Null,
        Some(v) => match serde_json::from_value::<T>(v.clone()) {
            Ok(parsed) => NullablePatch::Value(parsed),
            // Malformed payloads collapse to Null; rustra's arg validation has
            // already accepted the JSON shape, so keep the patch lenient here.
            Err(_) => NullablePatch::Null,
        },
    }
}

fn enum_to_value<T: Serialize>(value: T) -> Value {
    serde_json::to_value(value).unwrap_or(Value::Null)
}

fn enum_from_value<T: for<'de> Deserialize<'de>>(value: Value) -> T {
    serde_json::from_value(value).expect("valid enum wire value")
}

// ============================================================================
// KnowledgeItem
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct KnowledgeItemIo {
    pub id: String,
    #[serde(rename = "type")]
    pub item_type: String,
    pub title: Option<String>,
    pub body: Option<String>,
    pub url: Option<String>,
    pub summary: Option<String>,
    pub tags: Option<Vec<String>>,
    pub labels: Option<Vec<String>>,
    pub provisional_labels: Option<Vec<String>>,
    pub label_status: Option<String>,
    pub label_source: Option<String>,
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

fn label_status_from_str(value: Option<String>) -> Option<KnowledgeItemLabelStatus> {
    value.map(|s| serde_json::from_value::<KnowledgeItemLabelStatus>(Value::String(s)).expect("valid labelStatus"))
}

fn label_source_from_str(value: Option<String>) -> Option<KnowledgeItemLabelSource> {
    value.map(|s| serde_json::from_value::<KnowledgeItemLabelSource>(Value::String(s)).expect("valid labelSource"))
}

impl From<KnowledgeItem> for KnowledgeItemIo {
    fn from(item: KnowledgeItem) -> Self {
        Self {
            id: item.id,
            item_type: enum_to_value(item.item_type)
                .as_str()
                .unwrap_or("note")
                .to_string(),
            title: item.title,
            body: item.body,
            url: item.url,
            summary: item.summary,
            tags: item.tags,
            labels: item.labels,
            provisional_labels: item.provisional_labels,
            label_status: item
                .label_status
                .map(|v| enum_to_value(v).as_str().unwrap_or("idle").to_string()),
            label_source: item
                .label_source
                .map(|v| enum_to_value(v).as_str().unwrap_or("none").to_string()),
            label_version: item.label_version,
            label_score: item.label_score,
            label_requested_at: item.label_requested_at,
            label_completed_at: item.label_completed_at,
            label_error: item.label_error,
            created_at: item.created_at,
            updated_at: item.updated_at,
            stability: item.stability,
            difficulty: item.difficulty,
            last_reviewed_at: item.last_reviewed_at,
            next_review_at: item.next_review_at,
        }
    }
}

impl From<KnowledgeItemIo> for KnowledgeItem {
    fn from(item: KnowledgeItemIo) -> Self {
        Self {
            id: item.id,
            item_type: serde_json::from_value::<KnowledgeItemType>(Value::String(item.item_type))
                .expect("valid knowledge item type"),
            title: item.title,
            body: item.body,
            url: item.url,
            summary: item.summary,
            tags: item.tags,
            labels: item.labels,
            provisional_labels: item.provisional_labels,
            label_status: label_status_from_str(item.label_status),
            label_source: label_source_from_str(item.label_source),
            label_version: item.label_version,
            label_score: item.label_score,
            label_requested_at: item.label_requested_at,
            label_completed_at: item.label_completed_at,
            label_error: item.label_error,
            created_at: item.created_at,
            updated_at: item.updated_at,
            stability: item.stability,
            difficulty: item.difficulty,
            last_reviewed_at: item.last_reviewed_at,
            next_review_at: item.next_review_at,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct KnowledgeItemPatchIo {
    #[serde(rename = "type", default, skip_serializing_if = "Option::is_none")]
    pub item_type: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub title: NullableValue,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub body: NullableValue,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub url: NullableValue,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub summary: NullableValue,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub tags: NullableValue,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub labels: NullableValue,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub provisional_labels: NullableValue,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub label_status: NullableValue,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub label_source: NullableValue,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub label_version: NullableValue,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub label_score: NullableValue,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub label_requested_at: NullableValue,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub label_completed_at: NullableValue,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub label_error: NullableValue,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub updated_at: Option<i64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub stability: NullableValue,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub difficulty: NullableValue,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub last_reviewed_at: NullableValue,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub next_review_at: NullableValue,
}

impl From<KnowledgeItemPatchIo> for KnowledgeItemPatch {
    fn from(patch: KnowledgeItemPatchIo) -> Self {
        Self {
            item_type: patch.item_type.map(|s| {
                serde_json::from_value::<KnowledgeItemType>(Value::String(s))
                    .expect("valid knowledge item type")
            }),
            title: to_patch(patch.title),
            body: to_patch(patch.body),
            url: to_patch(patch.url),
            summary: to_patch(patch.summary),
            tags: to_patch(patch.tags),
            labels: to_patch(patch.labels),
            provisional_labels: to_patch(patch.provisional_labels),
            label_status: to_patch(patch.label_status),
            label_source: to_patch(patch.label_source),
            label_version: to_patch(patch.label_version),
            label_score: to_patch(patch.label_score),
            label_requested_at: to_patch(patch.label_requested_at),
            label_completed_at: to_patch(patch.label_completed_at),
            label_error: to_patch(patch.label_error),
            updated_at: patch.updated_at,
            stability: to_patch(patch.stability),
            difficulty: to_patch(patch.difficulty),
            last_reviewed_at: to_patch(patch.last_reviewed_at),
            next_review_at: to_patch(patch.next_review_at),
        }
    }
}

// ============================================================================
// Conversation
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct ConversationIo {
    pub id: String,
    pub title: Option<String>,
    pub icon: Option<String>,
    pub context_item_id: Option<String>,
    pub created_at: i64,
    pub updated_at: i64,
    pub deleted_at: Option<i64>,
}

impl From<Conversation> for ConversationIo {
    fn from(conversation: Conversation) -> Self {
        Self {
            id: conversation.id,
            title: conversation.title,
            icon: conversation.icon,
            context_item_id: conversation.context_item_id,
            created_at: conversation.created_at,
            updated_at: conversation.updated_at,
            deleted_at: conversation.deleted_at,
        }
    }
}

impl From<ConversationIo> for Conversation {
    fn from(conversation: ConversationIo) -> Self {
        Self {
            id: conversation.id,
            title: conversation.title,
            icon: conversation.icon,
            context_item_id: conversation.context_item_id,
            created_at: conversation.created_at,
            updated_at: conversation.updated_at,
            deleted_at: conversation.deleted_at,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct ConversationPatchIo {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub title: NullableValue,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub icon: NullableValue,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub context_item_id: NullableValue,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub updated_at: Option<i64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub deleted_at: NullableValue,
}

impl From<ConversationPatchIo> for ConversationPatch {
    fn from(patch: ConversationPatchIo) -> Self {
        Self {
            title: to_patch(patch.title),
            icon: to_patch(patch.icon),
            context_item_id: to_patch(patch.context_item_id),
            updated_at: patch.updated_at,
            deleted_at: to_patch(patch.deleted_at),
        }
    }
}

// ============================================================================
// Message
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct MessageIo {
    pub id: String,
    pub conversation_id: String,
    pub role: String,
    pub content: String,
    pub created_at: i64,
    pub updated_at: Option<i64>,
    pub deleted_at: Option<i64>,
}

impl From<Message> for MessageIo {
    fn from(message: Message) -> Self {
        Self {
            id: message.id,
            conversation_id: message.conversation_id,
            role: enum_to_value(message.role)
                .as_str()
                .unwrap_or("user")
                .to_string(),
            content: message.content,
            created_at: message.created_at,
            updated_at: message.updated_at,
            deleted_at: message.deleted_at,
        }
    }
}

impl From<MessageIo> for Message {
    fn from(message: MessageIo) -> Self {
        Self {
            id: message.id,
            conversation_id: message.conversation_id,
            role: enum_from_value(Value::String(message.role)),
            content: message.content,
            created_at: message.created_at,
            updated_at: message.updated_at,
            deleted_at: message.deleted_at,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct MessagePatchIo {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub content: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub updated_at: Option<i64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub deleted_at: NullableValue,
}

impl From<MessagePatchIo> for MessagePatch {
    fn from(patch: MessagePatchIo) -> Self {
        Self {
            content: patch.content,
            updated_at: patch.updated_at,
            deleted_at: to_patch(patch.deleted_at),
        }
    }
}

// ============================================================================
// Recommendation
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct RecommendationIo {
    pub id: String,
    pub item_a_id: String,
    pub item_b_id: String,
    pub reason: Option<String>,
    pub status: String,
    pub created_at: i64,
    pub responded_at: Option<i64>,
}

impl From<Recommendation> for RecommendationIo {
    fn from(recommendation: Recommendation) -> Self {
        Self {
            id: recommendation.id,
            item_a_id: recommendation.item_a_id,
            item_b_id: recommendation.item_b_id,
            reason: recommendation.reason,
            status: enum_to_value(recommendation.status)
                .as_str()
                .unwrap_or("pending")
                .to_string(),
            created_at: recommendation.created_at,
            responded_at: recommendation.responded_at,
        }
    }
}

impl From<RecommendationIo> for Recommendation {
    fn from(recommendation: RecommendationIo) -> Self {
        Self {
            id: recommendation.id,
            item_a_id: recommendation.item_a_id,
            item_b_id: recommendation.item_b_id,
            reason: recommendation.reason,
            status: enum_from_value(Value::String(recommendation.status)),
            created_at: recommendation.created_at,
            responded_at: recommendation.responded_at,
        }
    }
}

// ============================================================================
// FeedbackEvent
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct FeedbackEventIo {
    pub id: String,
    pub recommendation_id: String,
    pub action: String,
    pub created_at: i64,
}

impl From<FeedbackEvent> for FeedbackEventIo {
    fn from(event: FeedbackEvent) -> Self {
        Self {
            id: event.id,
            recommendation_id: event.recommendation_id,
            action: enum_to_value(event.action)
                .as_str()
                .unwrap_or("accept")
                .to_string(),
            created_at: event.created_at,
        }
    }
}

impl From<FeedbackEventIo> for FeedbackEvent {
    fn from(event: FeedbackEventIo) -> Self {
        Self {
            id: event.id,
            recommendation_id: event.recommendation_id,
            action: enum_from_value(Value::String(event.action)),
            created_at: event.created_at,
        }
    }
}

// ============================================================================
// Review inputs/outputs
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct CoreKnowledgeItemLikeIo {
    pub tags: Option<Vec<String>>,
    pub last_reviewed_at: Option<i64>,
    pub next_review_at: Option<i64>,
    pub created_at: Option<i64>,
}

impl From<CoreKnowledgeItemLikeIo> for CoreKnowledgeItemLike {
    fn from(value: CoreKnowledgeItemLikeIo) -> Self {
        Self {
            tags: value.tags,
            last_reviewed_at: value.last_reviewed_at,
            next_review_at: value.next_review_at,
            created_at: value.created_at,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct CalculateTagOverlapInputIo {
    pub left: CoreKnowledgeItemLikeIo,
    pub right: CoreKnowledgeItemLikeIo,
}

impl From<CalculateTagOverlapInputIo> for CalculateTagOverlapInput {
    fn from(value: CalculateTagOverlapInputIo) -> Self {
        Self {
            left: value.left.into(),
            right: value.right.into(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct CalculateNextReviewInputIo {
    pub last_reviewed_at: Option<i64>,
    pub next_review_at: Option<i64>,
    pub feedback_type: String,
    pub now: i64,
}

impl From<CalculateNextReviewInputIo> for CalculateNextReviewInput {
    fn from(value: CalculateNextReviewInputIo) -> Self {
        Self {
            last_reviewed_at: value.last_reviewed_at,
            next_review_at: value.next_review_at,
            feedback_type: enum_from_value(Value::String(value.feedback_type)),
            now: value.now,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct CalculateNextReviewOutputIo {
    pub interval_ms: i64,
    pub next_review_at: i64,
}

impl From<CalculateNextReviewOutput> for CalculateNextReviewOutputIo {
    fn from(value: CalculateNextReviewOutput) -> Self {
        Self {
            interval_ms: value.interval_ms,
            next_review_at: value.next_review_at,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct InitializeReviewScheduleInputIo {
    pub created_at: i64,
    pub interval_ms: Option<i64>,
}

impl From<InitializeReviewScheduleInputIo> for InitializeReviewScheduleInput {
    fn from(value: InitializeReviewScheduleInputIo) -> Self {
        Self {
            created_at: value.created_at,
            interval_ms: value.interval_ms,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct InitializeReviewScheduleOutputIo {
    pub next_review_at: i64,
    pub stability: Option<f64>,
    pub difficulty: Option<f64>,
    pub last_reviewed_at: Option<i64>,
}

impl From<InitializeReviewScheduleOutput> for InitializeReviewScheduleOutputIo {
    fn from(value: InitializeReviewScheduleOutput) -> Self {
        Self {
            next_review_at: value.next_review_at,
            stability: value.stability,
            difficulty: value.difficulty,
            last_reviewed_at: value.last_reviewed_at,
        }
    }
}

// Re-exported so command modules can build status enums from wire strings.
pub use glimpse_core::RecommendationStatus as CoreRecommendationStatus;
pub use glimpse_core::ReviewFeedbackType as CoreReviewFeedbackType;

/// Parses a wire status string into a core [`RecommendationStatus`].
pub fn recommendation_status_from_wire(value: String) -> RecommendationStatus {
    enum_from_value(Value::String(value))
}

/// Parses a wire feedback type string into a core [`ReviewFeedbackType`].
pub fn review_feedback_type_from_wire(value: String) -> ReviewFeedbackType {
    enum_from_value(Value::String(value))
}

/// Parses a wire role string into a core [`MessageRole`].
pub fn message_role_from_wire(value: String) -> MessageRole {
    enum_from_value(Value::String(value))
}
