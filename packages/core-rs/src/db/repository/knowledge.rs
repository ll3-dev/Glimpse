use anyhow::{anyhow, Result};
use rusqlite::{params, params_from_iter, Connection, OptionalExtension};
use serde_json::{Map, Value};

use crate::models::KnowledgeItem;

use super::update_row_from_json_patch;
use crate::db::patches::{placeholders, to_json_string_array, to_optional_json_string_array};
use crate::db::rows::{
    collect_rows, map_knowledge_item_row, to_knowledge_item_type, to_label_source, to_label_status,
};

pub fn save_knowledge_item(conn: &Connection, item: &KnowledgeItem) -> Result<KnowledgeItem> {
    conn.execute(
        "INSERT INTO knowledge_items (
          id, type, title, body, url, summary, tags, labels, provisional_labels,
          label_status, label_source, label_version, label_score, label_requested_at,
          label_completed_at, label_error, created_at, updated_at, stability,
          difficulty, last_reviewed_at, next_review_at
        ) VALUES (
          ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16,
          ?17, ?18, ?19, ?20, ?21, ?22
        );",
        params![
            item.id,
            to_knowledge_item_type(&item.item_type),
            item.title,
            item.body,
            item.url,
            item.summary,
            to_json_string_array(&item.tags)?,
            to_optional_json_string_array(item.labels.as_ref())?,
            to_optional_json_string_array(item.provisional_labels.as_ref())?,
            item.label_status.as_ref().map(to_label_status),
            item.label_source.as_ref().map(to_label_source),
            item.label_version,
            item.label_score,
            item.label_requested_at.map(|value| value as f64),
            item.label_completed_at.map(|value| value as f64),
            item.label_error,
            item.created_at as f64,
            item.updated_at as f64,
            item.stability,
            item.difficulty,
            item.last_reviewed_at.map(|value| value as f64),
            item.next_review_at.map(|value| value as f64),
        ],
    )?;

    get_knowledge_item_by_id(conn, &item.id)?
        .ok_or_else(|| anyhow!("knowledge item not found after insert"))
}

pub fn list_knowledge_items(conn: &Connection) -> Result<Vec<KnowledgeItem>> {
    let mut statement = conn.prepare(
        "SELECT id, type, title, body, url, summary, tags, labels, provisional_labels,
         label_status, label_source, label_version, label_score, label_requested_at,
         label_completed_at, label_error, created_at, updated_at, stability,
         difficulty, last_reviewed_at, next_review_at
         FROM knowledge_items ORDER BY created_at DESC;",
    )?;
    let rows = statement.query_map([], map_knowledge_item_row)?;
    collect_rows(rows)
}

pub fn list_knowledge_items_by_ids(
    conn: &Connection,
    item_ids: &[String],
) -> Result<Vec<KnowledgeItem>> {
    if item_ids.is_empty() {
        return Ok(Vec::new());
    }
    let sql = format!(
        "SELECT id, type, title, body, url, summary, tags, labels, provisional_labels,
         label_status, label_source, label_version, label_score, label_requested_at,
         label_completed_at, label_error, created_at, updated_at, stability,
         difficulty, last_reviewed_at, next_review_at
         FROM knowledge_items WHERE id IN ({});",
        placeholders(item_ids.len())
    );
    let mut statement = conn.prepare(&sql)?;
    let rows = statement.query_map(params_from_iter(item_ids.iter()), map_knowledge_item_row)?;
    collect_rows(rows)
}

pub fn list_weekly_knowledge_items(conn: &Connection, since: i64) -> Result<Vec<KnowledgeItem>> {
    let mut statement = conn.prepare(
        "SELECT id, type, title, body, url, summary, tags, labels, provisional_labels,
         label_status, label_source, label_version, label_score, label_requested_at,
         label_completed_at, label_error, created_at, updated_at, stability,
         difficulty, last_reviewed_at, next_review_at
         FROM knowledge_items WHERE created_at >= ?1 ORDER BY created_at DESC;",
    )?;
    let rows = statement.query_map([since as f64], map_knowledge_item_row)?;
    collect_rows(rows)
}

pub fn list_pending_knowledge_items_for_labeling(
    conn: &Connection,
    limit: i64,
) -> Result<Vec<KnowledgeItem>> {
    let mut statement = conn.prepare(
        "SELECT id, type, title, body, url, summary, tags, labels, provisional_labels,
         label_status, label_source, label_version, label_score, label_requested_at,
         label_completed_at, label_error, created_at, updated_at, stability,
         difficulty, last_reviewed_at, next_review_at
         FROM knowledge_items
         WHERE label_status = 'pending'
         ORDER BY label_requested_at ASC
         LIMIT ?1;",
    )?;
    let rows = statement.query_map([limit.max(0) as f64], map_knowledge_item_row)?;
    collect_rows(rows)
}

pub fn get_knowledge_item_by_id(conn: &Connection, item_id: &str) -> Result<Option<KnowledgeItem>> {
    conn.query_row(
        "SELECT id, type, title, body, url, summary, tags, labels, provisional_labels,
         label_status, label_source, label_version, label_score, label_requested_at,
         label_completed_at, label_error, created_at, updated_at, stability,
         difficulty, last_reviewed_at, next_review_at
         FROM knowledge_items WHERE id = ?1 LIMIT 1;",
        [item_id],
        map_knowledge_item_row,
    )
    .optional()
    .map_err(Into::into)
}

pub fn get_due_knowledge_items(
    conn: &Connection,
    now: i64,
    limit: Option<i64>,
) -> Result<Vec<KnowledgeItem>> {
    let sql = if limit.unwrap_or(0) > 0 {
        "SELECT id, type, title, body, url, summary, tags, labels, provisional_labels,
         label_status, label_source, label_version, label_score, label_requested_at,
         label_completed_at, label_error, created_at, updated_at, stability,
         difficulty, last_reviewed_at, next_review_at
         FROM knowledge_items
         WHERE next_review_at IS NOT NULL AND next_review_at <= ?1
         ORDER BY next_review_at ASC LIMIT ?2;"
    } else {
        "SELECT id, type, title, body, url, summary, tags, labels, provisional_labels,
         label_status, label_source, label_version, label_score, label_requested_at,
         label_completed_at, label_error, created_at, updated_at, stability,
         difficulty, last_reviewed_at, next_review_at
         FROM knowledge_items
         WHERE next_review_at IS NOT NULL AND next_review_at <= ?1
         ORDER BY next_review_at ASC;"
    };
    let mut statement = conn.prepare(sql)?;
    let rows = if let Some(limit) = limit.filter(|value| *value > 0) {
        statement.query_map(params![now as f64, limit as f64], map_knowledge_item_row)?
    } else {
        statement.query_map(params![now as f64], map_knowledge_item_row)?
    };
    collect_rows(rows)
}

pub fn update_knowledge_item(
    conn: &Connection,
    item_id: &str,
    patch: &Map<String, Value>,
) -> Result<KnowledgeItem> {
    update_row_from_json_patch(conn, "knowledge_items", "id", item_id, patch)?;
    get_knowledge_item_by_id(conn, item_id)?
        .ok_or_else(|| anyhow!("knowledge item not found: {item_id}"))
}
