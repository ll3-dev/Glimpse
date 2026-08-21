//! FeedbackEvent storage operations.

use rusqlite::params;

use crate::error::Result;
use crate::models::FeedbackEvent;

use super::{parse_json_column, SqliteStorage};

impl SqliteStorage {
    // ========================================================================
    // Feedback Events
    // ========================================================================

    pub fn insert_feedback_event(&self, event: &FeedbackEvent) -> Result<()> {
        self.conn.execute(
            r#"
            INSERT OR REPLACE INTO feedback_events (
                id, recommendation_id, action, created_at
            ) VALUES (?1, ?2, ?3, ?4)
            "#,
            params![
                event.id,
                event.recommendation_id,
                serde_json::to_string(&event.action)?,
                event.created_at,
            ],
        )?;
        Ok(())
    }

    pub fn list_recent_feedback_events(&self, limit: usize) -> Result<Vec<FeedbackEvent>> {
        let mut stmt = self.conn.prepare(
            r#"
            SELECT id, recommendation_id, action, created_at
            FROM feedback_events
            ORDER BY created_at DESC
            LIMIT ?1
            "#,
        )?;

        let events = stmt
            .query_map(params![limit as i64], |row| {
                Ok(FeedbackEvent {
                    id: row.get(0)?,
                    recommendation_id: row.get(1)?,
                    action: parse_json_column(row, 2)?,
                    created_at: row.get(3)?,
                })
            })?
            .collect::<std::result::Result<Vec<_>, _>>()?;

        Ok(events)
    }

    pub(super) fn list_all_feedback_events(&self) -> Result<Vec<FeedbackEvent>> {
        let mut stmt = self.conn.prepare(
            r#"
            SELECT id, recommendation_id, action, created_at
            FROM feedback_events
            ORDER BY created_at ASC, id ASC
            "#,
        )?;
        let events = stmt
            .query_map([], |row| {
                Ok(FeedbackEvent {
                    id: row.get(0)?,
                    recommendation_id: row.get(1)?,
                    action: parse_json_column(row, 2)?,
                    created_at: row.get(3)?,
                })
            })?
            .collect::<std::result::Result<Vec<_>, _>>()?;
        Ok(events)
    }
}
