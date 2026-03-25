//! KnowledgeItem storage operations.

use rusqlite::{params, OptionalExtension};

use crate::error::{Error, Result};
use crate::models::{KnowledgeItem, KnowledgeItemPatch};

use super::SqliteStorage;

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
        item_type: serde_json::from_str(&row.get::<_, String>(1)?).unwrap(),
        title: row.get(2)?,
        body: row.get(3)?,
        url: row.get(4)?,
        summary: row.get(5)?,
        tags: row.get::<_, Option<String>>(6)?.and_then(|s| serde_json::from_str(&s).ok()),
        labels: row.get::<_, Option<String>>(7)?.and_then(|s| serde_json::from_str(&s).ok()),
        provisional_labels: row.get::<_, Option<String>>(8)?.and_then(|s| serde_json::from_str(&s).ok()),
        label_status: row.get::<_, Option<String>>(9)?.and_then(|s| serde_json::from_str(&s).ok()),
        label_source: row.get::<_, Option<String>>(10)?.and_then(|s| serde_json::from_str(&s).ok()),
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
        let labels = item.labels.as_ref().map(serde_json::to_string).transpose()?;
        let provisional_labels = item.provisional_labels.as_ref().map(serde_json::to_string).transpose()?;

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
                item.label_status.as_ref().map(serde_json::to_string).transpose()?,
                item.label_source.as_ref().map(serde_json::to_string).transpose()?,
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

        let result = stmt.query_row(params![id], parse_knowledge_item).optional()?;
        Ok(result)
    }

    pub fn list_knowledge_items(&self) -> Result<Vec<KnowledgeItem>> {
        let mut stmt = self.conn.prepare(&format!(
            "SELECT {} FROM knowledge_items ORDER BY created_at DESC",
            KNOWLEDGE_ITEM_COLUMNS.trim()
        ))?;

        let items = stmt.query_map([], parse_knowledge_item)?
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
        let params: Vec<&dyn rusqlite::ToSql> = ids.iter().map(|id| id as &dyn rusqlite::ToSql).collect();

        let items = stmt.query_map(params.as_slice(), parse_knowledge_item)?
            .collect::<std::result::Result<Vec<_>, _>>()?;
        Ok(items)
    }

    pub fn list_weekly_knowledge_items(&self, since: i64) -> Result<Vec<KnowledgeItem>> {
        let mut stmt = self.conn.prepare(&format!(
            "SELECT {} FROM knowledge_items WHERE created_at >= ?1 ORDER BY created_at DESC",
            KNOWLEDGE_ITEM_COLUMNS.trim()
        ))?;

        let items = stmt.query_map(params![since], parse_knowledge_item)?
            .collect::<std::result::Result<Vec<_>, _>>()?;
        Ok(items)
    }

    pub fn list_pending_knowledge_items_for_labeling(&self, limit: usize) -> Result<Vec<KnowledgeItem>> {
        let mut stmt = self.conn.prepare(&format!(
            "SELECT {} FROM knowledge_items WHERE label_status = 'pending' ORDER BY label_requested_at ASC LIMIT ?1",
            KNOWLEDGE_ITEM_COLUMNS.trim()
        ))?;

        let items = stmt.query_map(params![limit as i64], parse_knowledge_item)?
            .collect::<std::result::Result<Vec<_>, _>>()?;
        Ok(items)
    }

    pub fn get_due_knowledge_items(&self, now: i64, limit: Option<usize>) -> Result<Vec<KnowledgeItem>> {
        let sql = match limit {
            Some(lim) => format!(
                "SELECT {} FROM knowledge_items WHERE next_review_at IS NOT NULL AND next_review_at <= {} ORDER BY next_review_at ASC LIMIT {}",
                KNOWLEDGE_ITEM_COLUMNS.trim(), now, lim
            ),
            None => format!(
                "SELECT {} FROM knowledge_items WHERE next_review_at IS NOT NULL AND next_review_at <= {} ORDER BY next_review_at ASC",
                KNOWLEDGE_ITEM_COLUMNS.trim(), now
            ),
        };

        let mut stmt = self.conn.prepare(&sql)?;
        let items = stmt.query_map([], parse_knowledge_item)?
            .collect::<std::result::Result<Vec<_>, _>>()?;
        Ok(items)
    }

    pub fn update_knowledge_item(&self, id: &str, patch: &KnowledgeItemPatch) -> Result<KnowledgeItem> {
        let existing = self.get_knowledge_item(id)?
            .ok_or_else(|| Error::NotFound("knowledge_item".to_string(), id.to_string()))?;

        let updated = KnowledgeItem {
            id: existing.id,
            item_type: patch.item_type.unwrap_or(existing.item_type),
            title: patch.title.clone().or(existing.title),
            body: patch.body.clone().or(existing.body),
            url: patch.url.clone().or(existing.url),
            summary: patch.summary.clone().or(existing.summary),
            tags: patch.tags.clone().or(existing.tags),
            labels: patch.labels.clone().or(existing.labels),
            provisional_labels: patch.provisional_labels.clone().or(existing.provisional_labels),
            label_status: patch.label_status.or(existing.label_status),
            label_source: patch.label_source.or(existing.label_source),
            label_version: patch.label_version.clone().or(existing.label_version),
            label_score: patch.label_score.or(existing.label_score),
            label_requested_at: patch.label_requested_at.or(existing.label_requested_at),
            label_completed_at: patch.label_completed_at.or(existing.label_completed_at),
            label_error: patch.label_error.clone().or(existing.label_error),
            created_at: existing.created_at,
            updated_at: patch.updated_at.unwrap_or_else(|| chrono::Utc::now().timestamp_millis()),
            stability: patch.stability.or(existing.stability),
            difficulty: patch.difficulty.or(existing.difficulty),
            last_reviewed_at: patch.last_reviewed_at.or(existing.last_reviewed_at),
            next_review_at: patch.next_review_at.or(existing.next_review_at),
        };

        self.insert_knowledge_item(&updated)?;
        Ok(updated)
    }
}
