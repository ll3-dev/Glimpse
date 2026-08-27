//! KnowledgeItem storage operations.

use rusqlite::{params, OptionalExtension};

use crate::error::{Error, Result};
use crate::models::{KnowledgeItem, KnowledgeItemPatch, NullablePatch};

use super::sync::ENTITY_KNOWLEDGE_ITEM;
use super::{parse_json_column, parse_optional_json_column, SqliteStorage};

// SQL fragments for KnowledgeItem queries
const KNOWLEDGE_ITEM_COLUMNS: &str = r#"
    id, type, title, body, url, summary, tags, labels, provisional_labels,
    label_status, label_source, label_version, label_score,
    label_requested_at, label_completed_at, label_error,
    created_at, updated_at, stability, difficulty,
    last_reviewed_at, next_review_at
"#;

/// Helper to parse KnowledgeItem from a row.
fn parse_knowledge_item(row: &rusqlite::Row) -> rusqlite::Result<KnowledgeItem> {
    Ok(KnowledgeItem {
        id: row.get(0)?,
        item_type: parse_json_column(row, 1)?,
        title: row.get(2)?,
        body: row.get(3)?,
        url: row.get(4)?,
        summary: row.get(5)?,
        tags: parse_optional_json_column(row, 6)?,
        labels: parse_optional_json_column(row, 7)?,
        provisional_labels: parse_optional_json_column(row, 8)?,
        // label_status/label_source: enum 열은 SQL 리터럴과 비교되는 plain
        // 문자열로 저장한다(serde_json::to_string 이면 `"pending"` 처럼 인용되어
        // list_pending_knowledge_items_for_labeling 의 WHERE 절과 영원히 불일치).
        label_status: parse_optional_json_column(row, 9)?,
        label_source: parse_optional_json_column(row, 10)?,
        label_version: row.get(11)?,
        label_score: row.get(12)?,
        label_requested_at: row.get(13)?,
        label_completed_at: row.get(14)?,
        label_error: row.get(15)?,
        created_at: row.get(16)?,
        updated_at: row.get(17)?,
        stability: row.get(18)?,
        difficulty: row.get(19)?,
        last_reviewed_at: row.get(20)?,
        next_review_at: row.get(21)?,
    })
}

impl SqliteStorage {
    // ========================================================================
    // Knowledge Items
    // ========================================================================

    pub fn insert_knowledge_item(&self, item: &KnowledgeItem) -> Result<()> {
        let tags = item.tags.as_ref().map(serde_json::to_string).transpose()?;
        let labels = item
            .labels
            .as_ref()
            .map(serde_json::to_string)
            .transpose()?;
        let provisional_labels = item
            .provisional_labels
            .as_ref()
            .map(serde_json::to_string)
            .transpose()?;

        self.conn.execute(
            &format!(
                "INSERT OR REPLACE INTO knowledge_items ({}) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20, ?21, ?22)",
                KNOWLEDGE_ITEM_COLUMNS.trim()
            ),
            params![
                item.id,
                serde_json::to_string(&item.item_type)?,
                item.title,
                item.body,
                item.url,
                item.summary,
                tags,
                labels,
                provisional_labels,
                // plain 문자열 저장 — WHERE label_status = 'pending' 비교와
                // 일치(serde 인용 금지). 읽기 쪽 파서는 인용/비인용 모두 수용.
                item.label_status.map(|s| serde_json::to_value(s).ok().and_then(|v| v.as_str().map(String::from)).unwrap_or_default()),
                item.label_source.map(|s| serde_json::to_value(s).ok().and_then(|v| v.as_str().map(String::from)).unwrap_or_default()),
                item.label_version,
                item.label_score,
                item.label_requested_at,
                item.label_completed_at,
                item.label_error,
                item.created_at,
                item.updated_at,
                item.stability,
                item.difficulty,
                item.last_reviewed_at,
                item.next_review_at,
            ],
        )?;
        Ok(())
    }

    pub fn get_knowledge_item(&self, id: &str) -> Result<Option<KnowledgeItem>> {
        let mut stmt = self.conn.prepare(&format!(
            "SELECT {} FROM knowledge_items WHERE id = ?1",
            KNOWLEDGE_ITEM_COLUMNS.trim()
        ))?;

        let result = stmt
            .query_row(params![id], parse_knowledge_item)
            .optional()?;
        Ok(result)
    }

    pub fn list_knowledge_items(&self) -> Result<Vec<KnowledgeItem>> {
        let mut stmt = self.conn.prepare(&format!(
            "SELECT {} FROM knowledge_items ORDER BY created_at DESC",
            KNOWLEDGE_ITEM_COLUMNS.trim()
        ))?;

        let items = stmt
            .query_map([], parse_knowledge_item)?
            .collect::<std::result::Result<Vec<_>, _>>()?;
        Ok(items)
    }

    /// Delta-sync slice: only rows whose merge clock (`updated_at`) is
    /// strictly newer than `since_clock_ms`. Uses the 0004
    /// `idx_knowledge_items_updated_at` index instead of a full scan.
    pub(super) fn list_knowledge_items_since(&self, since_clock_ms: i64) -> Result<Vec<KnowledgeItem>> {
        let mut stmt = self.conn.prepare(&format!(
            "SELECT {} FROM knowledge_items WHERE updated_at > ?1",
            KNOWLEDGE_ITEM_COLUMNS.trim()
        ))?;

        let items = stmt
            .query_map(params![since_clock_ms], parse_knowledge_item)?
            .collect::<std::result::Result<Vec<_>, _>>()?;
        Ok(items)
    }

    pub fn list_knowledge_items_by_ids(&self, ids: &[String]) -> Result<Vec<KnowledgeItem>> {
        if ids.is_empty() {
            return Ok(Vec::new());
        }

        let placeholders: Vec<String> = ids.iter().map(|_| "?".to_string()).collect();
        let sql = format!(
            "SELECT {} FROM knowledge_items WHERE id IN ({})",
            KNOWLEDGE_ITEM_COLUMNS.trim(),
            placeholders.join(", ")
        );

        let mut stmt = self.conn.prepare(&sql)?;
        let params: Vec<&dyn rusqlite::ToSql> =
            ids.iter().map(|id| id as &dyn rusqlite::ToSql).collect();

        let items = stmt
            .query_map(params.as_slice(), parse_knowledge_item)?
            .collect::<std::result::Result<Vec<_>, _>>()?;
        Ok(items)
    }

    pub fn list_weekly_knowledge_items(&self, since: i64) -> Result<Vec<KnowledgeItem>> {
        let mut stmt = self.conn.prepare(&format!(
            "SELECT {} FROM knowledge_items WHERE created_at >= ?1 ORDER BY created_at DESC",
            KNOWLEDGE_ITEM_COLUMNS.trim()
        ))?;

        let items = stmt
            .query_map(params![since], parse_knowledge_item)?
            .collect::<std::result::Result<Vec<_>, _>>()?;
        Ok(items)
    }

    pub fn list_pending_knowledge_items_for_labeling(
        &self,
        limit: usize,
    ) -> Result<Vec<KnowledgeItem>> {
        let mut stmt = self.conn.prepare(&format!(
            "SELECT {} FROM knowledge_items WHERE label_status = 'pending' ORDER BY label_requested_at ASC LIMIT ?1",
            KNOWLEDGE_ITEM_COLUMNS.trim()
        ))?;

        let items = stmt
            .query_map(params![limit as i64], parse_knowledge_item)?
            .collect::<std::result::Result<Vec<_>, _>>()?;
        Ok(items)
    }

    pub fn get_due_knowledge_items(
        &self,
        now: i64,
        limit: Option<usize>,
    ) -> Result<Vec<KnowledgeItem>> {
        let sql = match limit {
            Some(lim) => format!(
                "SELECT {} FROM knowledge_items WHERE next_review_at IS NULL OR next_review_at <= {} ORDER BY next_review_at ASC LIMIT {}",
                KNOWLEDGE_ITEM_COLUMNS.trim(), now, lim
            ),
            None => format!(
                "SELECT {} FROM knowledge_items WHERE next_review_at IS NULL OR next_review_at <= {} ORDER BY next_review_at ASC",
                KNOWLEDGE_ITEM_COLUMNS.trim(), now
            ),
        };

        let mut stmt = self.conn.prepare(&sql)?;
        let items = stmt
            .query_map([], parse_knowledge_item)?
            .collect::<std::result::Result<Vec<_>, _>>()?;
        Ok(items)
    }

    pub fn update_knowledge_item(
        &self,
        id: &str,
        patch: &KnowledgeItemPatch,
    ) -> Result<KnowledgeItem> {
        let existing = self
            .get_knowledge_item(id)?
            .ok_or_else(|| Error::NotFound("knowledge_item".to_string(), id.to_string()))?;

        let updated = KnowledgeItem {
            id: existing.id,
            item_type: patch.item_type.unwrap_or(existing.item_type),
            title: apply_nullable_patch(&patch.title, existing.title),
            body: apply_nullable_patch(&patch.body, existing.body),
            url: apply_nullable_patch(&patch.url, existing.url),
            summary: apply_nullable_patch(&patch.summary, existing.summary),
            tags: apply_nullable_patch(&patch.tags, existing.tags),
            labels: apply_nullable_patch(&patch.labels, existing.labels),
            provisional_labels: apply_nullable_patch(
                &patch.provisional_labels,
                existing.provisional_labels,
            ),
            label_status: apply_nullable_patch(&patch.label_status, existing.label_status),
            label_source: apply_nullable_patch(&patch.label_source, existing.label_source),
            label_version: apply_nullable_patch(&patch.label_version, existing.label_version),
            label_score: apply_nullable_patch(&patch.label_score, existing.label_score),
            label_requested_at: apply_nullable_patch(
                &patch.label_requested_at,
                existing.label_requested_at,
            ),
            label_completed_at: apply_nullable_patch(
                &patch.label_completed_at,
                existing.label_completed_at,
            ),
            label_error: apply_nullable_patch(&patch.label_error, existing.label_error),
            created_at: existing.created_at,
            updated_at: patch
                .updated_at
                .unwrap_or_else(|| chrono::Utc::now().timestamp_millis()),
            stability: apply_nullable_patch(&patch.stability, existing.stability),
            difficulty: apply_nullable_patch(&patch.difficulty, existing.difficulty),
            last_reviewed_at: apply_nullable_patch(
                &patch.last_reviewed_at,
                existing.last_reviewed_at,
            ),
            next_review_at: apply_nullable_patch(&patch.next_review_at, existing.next_review_at),
        };

        self.insert_knowledge_item(&updated)?;
        Ok(updated)
    }

    pub fn delete_knowledge_item(&self, id: &str) -> Result<()> {
        self.conn.execute_batch("BEGIN IMMEDIATE")?;
        let result = self
            .record_sync_tombstone(
                ENTITY_KNOWLEDGE_ITEM,
                id,
                chrono::Utc::now().timestamp_millis(),
            )
            .and_then(|_| {
                self.conn
                    .execute("DELETE FROM knowledge_items WHERE id = ?1", params![id])?;
                Ok(())
            });
        match result {
            Ok(()) => {
                self.conn.execute_batch("COMMIT")?;
                Ok(())
            }
            Err(error) => {
                let _ = self.conn.execute_batch("ROLLBACK");
                Err(error)
            }
        }
    }
}

fn apply_nullable_patch<T: Clone>(patch: &NullablePatch<T>, existing: Option<T>) -> Option<T> {
    match patch {
        NullablePatch::Unset => existing,
        NullablePatch::Null => None,
        NullablePatch::Value(value) => Some(value.clone()),
    }
}
