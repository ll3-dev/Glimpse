//! KnowledgeItem wire mirror.

use glimpse_core::{
    KnowledgeItem, KnowledgeItemLabelSource, KnowledgeItemLabelStatus, KnowledgeItemPatch,
};
use rustra::RustraError;
use serde::{Deserialize, Serialize};

use super::{enum_to_value, parse_enum, to_patch, NullableValue};

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
            item_type: patch.item_type.map(|s| parse_enum("type", s)).transpose()?,
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
