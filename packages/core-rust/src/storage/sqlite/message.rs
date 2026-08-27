//! Message storage operations.

use rusqlite::{params, OptionalExtension};

use crate::error::{Error, Result};
use crate::models::{Message, MessagePatch, NullablePatch};

use super::{parse_json_column, SqliteStorage};

impl SqliteStorage {
    // ========================================================================
    // Messages
    // ========================================================================

    pub fn insert_message(&self, message: &Message) -> Result<()> {
        self.conn.execute(
            r#"
            INSERT OR REPLACE INTO messages (
                id, conversation_id, role, content, created_at, updated_at, deleted_at
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
            "#,
            params![
                message.id,
                message.conversation_id,
                serde_json::to_string(&message.role)?,
                message.content,
                message.created_at,
                message.updated_at,
                message.deleted_at,
            ],
        )?;
        Ok(())
    }

    pub fn get_message(&self, id: &str) -> Result<Option<Message>> {
        let mut stmt = self.conn.prepare(
            r#"
            SELECT id, conversation_id, role, content, created_at, updated_at, deleted_at
            FROM messages WHERE id = ?1
            "#,
        )?;

        let result = stmt
            .query_row(params![id], |row| {
                Ok(Message {
                    id: row.get(0)?,
                    conversation_id: row.get(1)?,
                    role: parse_json_column(row, 2)?,
                    content: row.get(3)?,
                    created_at: row.get(4)?,
                    updated_at: row.get(5)?,
                    deleted_at: row.get(6)?,
                })
            })
            .optional()?;

        Ok(result)
    }

    pub fn list_conversation_messages(&self, conversation_id: &str) -> Result<Vec<Message>> {
        let mut stmt = self.conn.prepare(
            r#"
            SELECT id, conversation_id, role, content, created_at, updated_at, deleted_at
            FROM messages
            WHERE conversation_id = ?1 AND deleted_at IS NULL
            ORDER BY created_at ASC
            "#,
        )?;

        let messages = stmt
            .query_map(params![conversation_id], |row| {
                Ok(Message {
                    id: row.get(0)?,
                    conversation_id: row.get(1)?,
                    role: parse_json_column(row, 2)?,
                    content: row.get(3)?,
                    created_at: row.get(4)?,
                    updated_at: row.get(5)?,
                    deleted_at: row.get(6)?,
                })
            })?
            .collect::<std::result::Result<Vec<_>, _>>()?;

        Ok(messages)
    }

    pub(super) fn list_all_messages(&self) -> Result<Vec<Message>> {
        let mut stmt = self.conn.prepare(
            r#"
            SELECT id, conversation_id, role, content, created_at, updated_at, deleted_at
            FROM messages
            ORDER BY created_at ASC, id ASC
            "#,
        )?;
        let messages = stmt
            .query_map([], |row| {
                Ok(Message {
                    id: row.get(0)?,
                    conversation_id: row.get(1)?,
                    role: parse_json_column(row, 2)?,
                    content: row.get(3)?,
                    created_at: row.get(4)?,
                    updated_at: row.get(5)?,
                    deleted_at: row.get(6)?,
                })
            })?
            .collect::<std::result::Result<Vec<_>, _>>()?;
        Ok(messages)
    }

    /// Delta-sync slice: rows whose merge clock `COALESCE(deleted_at,
    /// updated_at, created_at)` (floored at `created_at`) is strictly newer
    /// than `since_clock_ms`. `max(a, b) > c` decomposes to `a > c OR b > c`,
    /// matching [`super::sync`] Rust-side clock and reusing the 0004
    /// `idx_messages_updated_at` index.
    pub(super) fn list_messages_since(&self, since_clock_ms: i64) -> Result<Vec<Message>> {
        let mut stmt = self.conn.prepare(
            r#"
            SELECT id, conversation_id, role, content, created_at, updated_at, deleted_at
            FROM messages
            WHERE COALESCE(deleted_at, updated_at, created_at) > ?1 OR created_at > ?1
            "#,
        )?;
        let messages = stmt
            .query_map(params![since_clock_ms], |row| {
                Ok(Message {
                    id: row.get(0)?,
                    conversation_id: row.get(1)?,
                    role: parse_json_column(row, 2)?,
                    content: row.get(3)?,
                    created_at: row.get(4)?,
                    updated_at: row.get(5)?,
                    deleted_at: row.get(6)?,
                })
            })?
            .collect::<std::result::Result<Vec<_>, _>>()?;
        Ok(messages)
    }

    pub fn update_message(&self, id: &str, patch: &MessagePatch) -> Result<Message> {
        let existing = self
            .get_message(id)?
            .ok_or_else(|| Error::NotFound("message".to_string(), id.to_string()))?;

        let updated = Message {
            id: existing.id,
            conversation_id: existing.conversation_id,
            role: existing.role,
            content: patch.content.clone().unwrap_or(existing.content),
            created_at: existing.created_at,
            updated_at: Some(
                patch
                    .updated_at
                    .unwrap_or_else(|| chrono::Utc::now().timestamp_millis()),
            ),
            deleted_at: apply_nullable_patch(&patch.deleted_at, existing.deleted_at),
        };

        self.insert_message(&updated)?;
        Ok(updated)
    }

    pub fn soft_delete_message(&self, id: &str, deleted_at: i64) -> Result<()> {
        let existing = self
            .get_message(id)?
            .ok_or_else(|| Error::NotFound("message".to_string(), id.to_string()))?;

        let updated = Message {
            id: existing.id,
            conversation_id: existing.conversation_id,
            role: existing.role,
            content: existing.content,
            created_at: existing.created_at,
            updated_at: Some(deleted_at),
            deleted_at: Some(deleted_at),
        };

        self.insert_message(&updated)?;
        Ok(())
    }
}

fn apply_nullable_patch<T: Clone>(patch: &NullablePatch<T>, existing: Option<T>) -> Option<T> {
    match patch {
        NullablePatch::Unset => existing,
        NullablePatch::Null => None,
        NullablePatch::Value(value) => Some(value.clone()),
    }
}
