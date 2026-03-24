use anyhow::Result;
use serde_json::Value;

use super::rows::to_sql_conversion_error;

pub fn normalize_json_string_array(raw: Option<String>) -> Option<String> {
    let parsed = raw.and_then(|value| serde_json::from_str::<Value>(&value).ok())?;
    let array = parsed.as_array()?;
    let mut normalized: Vec<String> = Vec::new();
    for tag in array
        .iter()
        .filter_map(Value::as_str)
        .map(str::trim)
        .filter(|tag| !tag.is_empty() && *tag != "stub-tag")
    {
        if normalized.iter().any(|existing| existing == tag) {
            continue;
        }
        normalized.push(String::from(tag));
    }

    if normalized.is_empty() {
        return None;
    }

    serde_json::to_string(&normalized).ok()
}

pub fn parse_required_string_array(raw: Option<String>) -> rusqlite::Result<Vec<String>> {
    Ok(parse_optional_string_array(raw)?.unwrap_or_default())
}

pub fn parse_optional_string_array(raw: Option<String>) -> rusqlite::Result<Option<Vec<String>>> {
    match raw {
        None => Ok(None),
        Some(value) => serde_json::from_str::<Vec<String>>(&value)
            .map(Some)
            .map_err(to_sql_conversion_error),
    }
}

pub fn placeholders(count: usize) -> String {
    (1..=count)
        .map(|index| format!("?{index}"))
        .collect::<Vec<_>>()
        .join(", ")
}

pub fn to_json_string_array(values: &[String]) -> Result<String> {
    Ok(serde_json::to_string(values)?)
}

pub fn to_optional_json_string_array(values: Option<&Vec<String>>) -> Result<Option<String>> {
    values
        .map(serde_json::to_string)
        .transpose()
        .map_err(Into::into)
}

pub fn json_value_to_sql(value: &Value) -> Result<Value> {
    match value {
        Value::Array(items) => Ok(Value::String(serde_json::to_string(items)?)),
        _ => Ok(value.clone()),
    }
}

pub fn value_ref_from_json(value: &Value) -> rusqlite::types::Value {
    match value {
        Value::Null => rusqlite::types::Value::Null,
        Value::Bool(value) => rusqlite::types::Value::Integer(if *value { 1 } else { 0 }),
        Value::Number(value) => value
            .as_i64()
            .map(rusqlite::types::Value::Integer)
            .or_else(|| value.as_f64().map(rusqlite::types::Value::Real))
            .unwrap_or(rusqlite::types::Value::Null),
        Value::String(value) => rusqlite::types::Value::Text(value.clone()),
        Value::Array(_) | Value::Object(_) => rusqlite::types::Value::Text(value.to_string()),
    }
}

pub fn to_column_name(key: &str) -> String {
    match key {
        "type" => String::from("type"),
        "title" => String::from("title"),
        "body" => String::from("body"),
        "url" => String::from("url"),
        "summary" => String::from("summary"),
        "tags" => String::from("tags"),
        "labels" => String::from("labels"),
        "provisionalLabels" => String::from("provisional_labels"),
        "labelStatus" => String::from("label_status"),
        "labelSource" => String::from("label_source"),
        "labelVersion" => String::from("label_version"),
        "labelScore" => String::from("label_score"),
        "labelRequestedAt" => String::from("label_requested_at"),
        "labelCompletedAt" => String::from("label_completed_at"),
        "labelError" => String::from("label_error"),
        "updatedAt" => String::from("updated_at"),
        "stability" => String::from("stability"),
        "difficulty" => String::from("difficulty"),
        "lastReviewedAt" => String::from("last_reviewed_at"),
        "nextReviewAt" => String::from("next_review_at"),
        "icon" => String::from("icon"),
        "contextItemId" => String::from("context_item_id"),
        "deletedAt" => String::from("deleted_at"),
        "conversationId" => String::from("conversation_id"),
        "role" => String::from("role"),
        "content" => String::from("content"),
        _ => String::from(key),
    }
}
