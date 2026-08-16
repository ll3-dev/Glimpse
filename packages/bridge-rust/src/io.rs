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
//!
//! Conversion strictness: wire → core conversions are write paths and reject
//! malformed values with [`RustraError::invalid_args`] (wrong-typed patch
//! values, unknown enum strings) instead of silently nulling fields or
//! falling back to a default enum. Core → wire conversions are read paths and
//! stay infallible: core enums serialize to their known wire strings.

use glimpse_core::{
    CalculateNextReviewInput, CalculateNextReviewOutput, CalculateTagOverlapInput, Conversation,
    ConversationPatch, CoreKnowledgeItemLike, FeedbackEvent, InitializeReviewScheduleInput,
    InitializeReviewScheduleOutput, KnowledgeItem, KnowledgeItemLabelSource,
    KnowledgeItemLabelStatus, KnowledgeItemPatch, Message, MessagePatch, NullablePatch,
    Recommendation, RecommendationStatus,
};
use rustra::RustraError;
use serde::{Deserialize, Serialize};
use serde_json::Value;

/// JSON tristate for `NullablePatch<T>` fields.
///
/// `None` → [`NullablePatch::Unset`], `Some(Value::Null)` → [`NullablePatch::Null`],
/// `Some(v)` → [`NullablePatch::Value`] with `v` deserialized into `T`.
pub type NullableValue = Option<Value>;

/// Converts a wire tristate into a core [`NullablePatch`], rejecting malformed values.
///
/// The generated TS types model patch fields as `unknown`, so this is the last
/// line of defense: a `Some(v)` that fails to deserialize into `T` becomes an
/// `invalid_args` error naming `field` — never a silent [`NullablePatch::Null`]
/// (which storage would treat as "clear the column").
fn to_patch<T: for<'de> Deserialize<'de>>(
    field: &'static str,
    value: NullableValue,
) -> Result<NullablePatch<T>, RustraError> {
    match value {
        None => Ok(NullablePatch::Unset),
        Some(Value::Null) => Ok(NullablePatch::Null),
        Some(v) => serde_json::from_value::<T>(v)
            .map(NullablePatch::Value)
            .map_err(|err| {
                RustraError::invalid_args(format!("patch field `{field}` is invalid: {err}"))
            }),
    }
}

fn enum_to_value<T: Serialize>(value: T) -> Value {
    serde_json::to_value(value).unwrap_or(Value::Null)
}

/// Parses a wire enum string on a write path, rejecting unknown values.
///
/// Unlike glimpse-core's own `str_to_*` helpers (which default unknown
/// strings), the bridge must not persist a fallback enum for a typo'd status —
/// `respondToRecommendation("accpeted")` fails loudly instead of writing
/// `pending`.
fn parse_enum<T: for<'de> Deserialize<'de>>(
    field: &'static str,
    value: String,
) -> Result<T, RustraError> {
    serde_json::from_value::<T>(Value::String(value)).map_err(|err| {
        RustraError::invalid_args(format!("field `{field}` has invalid enum value: {err}"))
    })
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

fn label_status_from_str(
    field: &'static str,
    value: Option<String>,
) -> Result<Option<KnowledgeItemLabelStatus>, RustraError> {
    value.map(|s| parse_enum(field, s)).transpose()
}

fn label_source_from_str(
    field: &'static str,
    value: Option<String>,
) -> Result<Option<KnowledgeItemLabelSource>, RustraError> {
    value.map(|s| parse_enum(field, s)).transpose()
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

impl TryFrom<KnowledgeItemIo> for KnowledgeItem {
    type Error = RustraError;

    fn try_from(item: KnowledgeItemIo) -> Result<Self, RustraError> {
        Ok(Self {
            id: item.id,
            item_type: parse_enum("type", item.item_type)?,
            title: item.title,
            body: item.body,
            url: item.url,
            summary: item.summary,
            tags: item.tags,
            labels: item.labels,
            provisional_labels: item.provisional_labels,
            label_status: label_status_from_str("labelStatus", item.label_status)?,
            label_source: label_source_from_str("labelSource", item.label_source)?,
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
        })
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

impl TryFrom<KnowledgeItemPatchIo> for KnowledgeItemPatch {
    type Error = RustraError;

    fn try_from(patch: KnowledgeItemPatchIo) -> Result<Self, RustraError> {
        Ok(Self {
            item_type: patch
                .item_type
                .map(|s| parse_enum("type", s))
                .transpose()?,
            title: to_patch("title", patch.title)?,
            body: to_patch("body", patch.body)?,
            url: to_patch("url", patch.url)?,
            summary: to_patch("summary", patch.summary)?,
            tags: to_patch("tags", patch.tags)?,
            labels: to_patch("labels", patch.labels)?,
            provisional_labels: to_patch("provisionalLabels", patch.provisional_labels)?,
            label_status: to_patch("labelStatus", patch.label_status)?,
            label_source: to_patch("labelSource", patch.label_source)?,
            label_version: to_patch("labelVersion", patch.label_version)?,
            label_score: to_patch("labelScore", patch.label_score)?,
            label_requested_at: to_patch("labelRequestedAt", patch.label_requested_at)?,
            label_completed_at: to_patch("labelCompletedAt", patch.label_completed_at)?,
            label_error: to_patch("labelError", patch.label_error)?,
            updated_at: patch.updated_at,
            stability: to_patch("stability", patch.stability)?,
            difficulty: to_patch("difficulty", patch.difficulty)?,
            last_reviewed_at: to_patch("lastReviewedAt", patch.last_reviewed_at)?,
            next_review_at: to_patch("nextReviewAt", patch.next_review_at)?,
        })
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

impl TryFrom<ConversationPatchIo> for ConversationPatch {
    type Error = RustraError;

    fn try_from(patch: ConversationPatchIo) -> Result<Self, RustraError> {
        Ok(Self {
            title: to_patch("title", patch.title)?,
            icon: to_patch("icon", patch.icon)?,
            context_item_id: to_patch("contextItemId", patch.context_item_id)?,
            updated_at: patch.updated_at,
            deleted_at: to_patch("deletedAt", patch.deleted_at)?,
        })
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

impl TryFrom<MessageIo> for Message {
    type Error = RustraError;

    fn try_from(message: MessageIo) -> Result<Self, RustraError> {
        Ok(Self {
            id: message.id,
            conversation_id: message.conversation_id,
            role: parse_enum("role", message.role)?,
            content: message.content,
            created_at: message.created_at,
            updated_at: message.updated_at,
            deleted_at: message.deleted_at,
        })
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

impl TryFrom<MessagePatchIo> for MessagePatch {
    type Error = RustraError;

    fn try_from(patch: MessagePatchIo) -> Result<Self, RustraError> {
        Ok(Self {
            content: patch.content,
            updated_at: patch.updated_at,
            deleted_at: to_patch("deletedAt", patch.deleted_at)?,
        })
    }
}

// ============================================================================
// Recommendation
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct RecommendationIo {
    pub id: String,
    // camelCase rename_all would produce `itemAId`; the `@glimpse/shared`
    // contract uses `itemA_id`/`itemB_id`, so pin the wire names explicitly.
    #[serde(rename = "itemA_id")]
    pub item_a_id: String,
    #[serde(rename = "itemB_id")]
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

impl TryFrom<RecommendationIo> for Recommendation {
    type Error = RustraError;

    fn try_from(recommendation: RecommendationIo) -> Result<Self, RustraError> {
        Ok(Self {
            id: recommendation.id,
            item_a_id: recommendation.item_a_id,
            item_b_id: recommendation.item_b_id,
            reason: recommendation.reason,
            status: parse_enum("status", recommendation.status)?,
            created_at: recommendation.created_at,
            responded_at: recommendation.responded_at,
        })
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

impl TryFrom<FeedbackEventIo> for FeedbackEvent {
    type Error = RustraError;

    fn try_from(event: FeedbackEventIo) -> Result<Self, RustraError> {
        Ok(Self {
            id: event.id,
            recommendation_id: event.recommendation_id,
            action: parse_enum("action", event.action)?,
            created_at: event.created_at,
        })
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

impl TryFrom<CalculateNextReviewInputIo> for CalculateNextReviewInput {
    type Error = RustraError;

    fn try_from(value: CalculateNextReviewInputIo) -> Result<Self, RustraError> {
        Ok(Self {
            last_reviewed_at: value.last_reviewed_at,
            next_review_at: value.next_review_at,
            feedback_type: parse_enum("feedbackType", value.feedback_type)?,
            now: value.now,
        })
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

/// Parses a wire status string into a core [`RecommendationStatus`].
///
/// Used by the recommendation domain's `respondToRecommendation` command;
/// unknown status strings are rejected as `invalid_args` rather than written
/// back as a fallback status.
pub(crate) fn recommendation_status_from_wire(
    value: String,
) -> Result<RecommendationStatus, RustraError> {
    parse_enum("status", value)
}
