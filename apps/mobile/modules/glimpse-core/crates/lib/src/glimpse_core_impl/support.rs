use anyhow::{anyhow, Result};
use glimpse_core_rs::{
    db,
    models::{KnowledgeItem, KnowledgeItemType},
    recommendation::calculate_tag_overlap,
    review::ReviewFeedbackType,
    RecommendationStatus,
};
use serde::de::DeserializeOwned;
use serde_json::Value;

use crate::ffi::bridging::{NullableNumber, NullableStringArray};

pub struct Context {
    pub id: usize,
    pub data_path: String,
}

pub fn open_database_or_panic(data_path: &str) -> rusqlite::Connection {
    db::open_database(data_path).unwrap_or_else(|error| panic!("Failed to open database: {error}"))
}

pub fn to_i64(value: f64) -> i64 {
    value as i64
}

pub fn to_optional_i64(value: NullableNumber) -> Option<i64> {
    Option::<f64>::from(value).map(to_i64)
}

pub fn to_nullable_number(value: Option<i64>) -> NullableNumber {
    value.map(|item| item as f64).into()
}

pub fn to_knowledge_item(tags: NullableStringArray) -> KnowledgeItem {
    KnowledgeItem {
        id: String::new(),
        item_type: KnowledgeItemType::Note,
        title: None,
        body: None,
        url: None,
        summary: None,
        tags: Option::<Vec<String>>::from(tags).unwrap_or_default(),
        labels: None,
        provisional_labels: None,
        label_status: None,
        label_source: None,
        label_version: None,
        label_score: None,
        label_requested_at: None,
        label_completed_at: None,
        label_error: None,
        created_at: 0,
        updated_at: 0,
        stability: None,
        difficulty: None,
        last_reviewed_at: None,
        next_review_at: None,
    }
}

pub fn parse_feedback_type(value: &str) -> Result<ReviewFeedbackType> {
    match value {
        "remembered" => Ok(ReviewFeedbackType::Remembered),
        "postponed" => Ok(ReviewFeedbackType::Postponed),
        _ => Err(anyhow!("Unsupported feedback type: {value}")),
    }
}

pub fn parse_json<T: DeserializeOwned>(value: &str) -> Result<T> {
    serde_json::from_str(value).map_err(|error| anyhow!("Invalid JSON payload: {error}"))
}

pub fn to_json<T: serde::Serialize>(value: &T) -> Result<String> {
    serde_json::to_string(value).map_err(|error| anyhow!("Failed to serialize JSON: {error}"))
}

pub fn parse_recommendation_status(value: &str) -> Result<RecommendationStatus> {
    serde_json::from_value(Value::String(String::from(value)))
        .map_err(|error| anyhow!("Unsupported recommendation status: {error}"))
}

#[allow(dead_code)]
pub fn calculate_tag_overlap_for_tags(
    left_tags: NullableStringArray,
    right_tags: NullableStringArray,
) -> f64 {
    let left = to_knowledge_item(left_tags);
    let right = to_knowledge_item(right_tags);
    calculate_tag_overlap(&left, &right) as f64
}
