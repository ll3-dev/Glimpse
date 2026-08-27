//! Conversation storage operations.

use rusqlite::{params, OptionalExtension};

use crate::error::{Error, Result};
use crate::models::{Conversation, ConversationPatch, NullablePatch};

use super::SqliteStorage;

impl SqliteStorage {
    // ========================================================================
    // Conversations
    // ========================================================================

    pub fn insert_conversation(&self, conversation: &Conversation) -> Result<()> {
        self.conn.execute(
            r#"
            INSERT OR REPLACE INTO conversations (
                id, title, icon, context_item_id, created_at, updated_at, deleted_at
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
            "#,
            params![
                conversation.id,
                conversation.title,
                conversation.icon,
                conversation.context_item_id,
                conversation.created_at,
                conversation.updated_at,
                conversation.deleted_at,
            ],
        )?;
        Ok(())
    }

    pub fn get_conversation(&self, id: &str) -> Result<Option<Conversation>> {
        let mut stmt = self.conn.prepare(
            r#"
            SELECT id, title, icon, context_item_id, created_at, updated_at, deleted_at
            FROM conversations WHERE id = ?1
            "#,
        )?;

        let result = stmt
            .query_row(params![id], |row| {
                Ok(Conversation {
                    id: row.get(0)?,
                    title: row.get(1)?,
                    icon: row.get(2)?,
                    context_item_id: row.get(3)?,
                    created_at: row.get(4)?,
                    updated_at: row.get(5)?,
                    deleted_at: row.get(6)?,
                })
            })
            .optional()?;

        Ok(result)
    }

    pub fn list_conversations(&self) -> Result<Vec<Conversation>> {
        let mut stmt = self.conn.prepare(
            r#"
            SELECT id, title, icon, context_item_id, created_at, updated_at, deleted_at
            FROM conversations
            WHERE deleted_at IS NULL
            ORDER BY updated_at DESC
            "#,
        )?;

        let conversations = stmt
            .query_map([], |row| {
                Ok(Conversation {
                    id: row.get(0)?,
                    title: row.get(1)?,
                    icon: row.get(2)?,
                    context_item_id: row.get(3)?,
                    created_at: row.get(4)?,
                    updated_at: row.get(5)?,
                    deleted_at: row.get(6)?,
                })
            })?
            .collect::<std::result::Result<Vec<_>, _>>()?;

        Ok(conversations)
    }

    pub(super) fn list_all_conversations(&self) -> Result<Vec<Conversation>> {
        let mut stmt = self.conn.prepare(
            r#"
            SELECT id, title, icon, context_item_id, created_at, updated_at, deleted_at
            FROM conversations
            ORDER BY created_at ASC, id ASC
            "#,
        )?;
        let conversations = stmt
            .query_map([], |row| {
                Ok(Conversation {
                    id: row.get(0)?,
                    title: row.get(1)?,
                    icon: row.get(2)?,
                    context_item_id: row.get(3)?,
                    created_at: row.get(4)?,
                    updated_at: row.get(5)?,
                    deleted_at: row.get(6)?,
                })
            })?
            .collect::<std::result::Result<Vec<_>, _>>()?;
        Ok(conversations)
    }

    /// Delta-sync slice: rows whose merge clock `max(COALESCE(deleted_at,
    /// updated_at), updated_at)` is strictly newer than `since_clock_ms`.
    /// `max(a, b) > c` decomposes to `a > c OR b > c`, matching
    /// [`super::sync`] Rust-side clock and reusing the
    /// `idx_conversations_updated_at` index.
    pub(super) fn list_conversations_since(&self, since_clock_ms: i64) -> Result<Vec<Conversation>> {
        let mut stmt = self.conn.prepare(
            r#"
            SELECT id, title, icon, context_item_id, created_at, updated_at, deleted_at
            FROM conversations
            WHERE COALESCE(deleted_at, updated_at) > ?1 OR updated_at > ?1
            "#,
        )?;
        let conversations = stmt
            .query_map(params![since_clock_ms], |row| {
                Ok(Conversation {
                    id: row.get(0)?,
                    title: row.get(1)?,
                    icon: row.get(2)?,
                    context_item_id: row.get(3)?,
                    created_at: row.get(4)?,
                    updated_at: row.get(5)?,
                    deleted_at: row.get(6)?,
                })
            })?
            .collect::<std::result::Result<Vec<_>, _>>()?;
        Ok(conversations)
    }

    pub fn update_conversation(&self, id: &str, patch: &ConversationPatch) -> Result<Conversation> {
        let existing = self
            .get_conversation(id)?
            .ok_or_else(|| Error::NotFound("conversation".to_string(), id.to_string()))?;

        let updated = Conversation {
            id: existing.id,
            title: apply_nullable_patch(&patch.title, existing.title),
            icon: apply_nullable_patch(&patch.icon, existing.icon),
            context_item_id: apply_nullable_patch(&patch.context_item_id, existing.context_item_id),
            created_at: existing.created_at,
            updated_at: patch
                .updated_at
                .unwrap_or_else(|| chrono::Utc::now().timestamp_millis()),
            deleted_at: apply_nullable_patch(&patch.deleted_at, existing.deleted_at),
        };

        self.insert_conversation(&updated)?;
        Ok(updated)
    }

    pub fn soft_delete_conversation(&self, id: &str, deleted_at: i64) -> Result<()> {
        let existing = self
            .get_conversation(id)?
            .ok_or_else(|| Error::NotFound("conversation".to_string(), id.to_string()))?;

        let updated = Conversation {
            id: existing.id,
            title: existing.title,
            icon: existing.icon,
            context_item_id: existing.context_item_id,
            created_at: existing.created_at,
            updated_at: deleted_at,
            deleted_at: Some(deleted_at),
        };

        self.insert_conversation(&updated)?;

        // Also soft-delete all messages in this conversation
        self.conn.execute(
            "UPDATE messages SET deleted_at = ?1 WHERE conversation_id = ?2",
            params![deleted_at, id],
        )?;

        Ok(())
    }

    pub fn update_conversation_updated_at(
        &self,
        conversation_id: &str,
        updated_at: i64,
    ) -> Result<()> {
        self.conn.execute(
            "UPDATE conversations SET updated_at = ?1 WHERE id = ?2",
            params![updated_at, conversation_id],
        )?;
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
