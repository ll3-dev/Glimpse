//! Recommendation storage operations.

use rusqlite::params;

use crate::error::Result;
use crate::models::{Recommendation, RecommendationStatus};

use super::{parse_json_column, SqliteStorage};

impl SqliteStorage {
    // ========================================================================
    // Recommendations
    // ========================================================================

    pub fn insert_recommendation(&self, recommendation: &Recommendation) -> Result<()> {
        let status_str = Self::recommendation_status_to_str(&recommendation.status);
        let (item_a_id, item_b_id) = if recommendation.item_a_id < recommendation.item_b_id {
            (&recommendation.item_a_id, &recommendation.item_b_id)
        } else {
            (&recommendation.item_b_id, &recommendation.item_a_id)
        };

        self.conn.execute(
            r#"
            INSERT INTO recommendations (
                id, item_a_id, item_b_id, reason, status, created_at, responded_at
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
            ON CONFLICT(item_a_id, item_b_id) DO NOTHING
            "#,
            params![
                recommendation.id,
                item_a_id,
                item_b_id,
                recommendation.reason,
                status_str,
                recommendation.created_at,
                recommendation.responded_at,
            ],
        )?;
        Ok(())
    }

    pub fn insert_recommendations(&self, recommendations: &[Recommendation]) -> Result<()> {
        for recommendation in recommendations {
            self.insert_recommendation(recommendation)?;
        }
        Ok(())
    }

    pub fn list_recommendations(&self) -> Result<Vec<Recommendation>> {
        let mut stmt = self.conn.prepare(
            r#"
            SELECT id, item_a_id, item_b_id, reason, status, created_at, responded_at
            FROM recommendations
            ORDER BY created_at DESC
            "#,
        )?;

        let recommendations = stmt
            .query_map([], |row| {
                Ok(Recommendation {
                    id: row.get(0)?,
                    item_a_id: row.get(1)?,
                    item_b_id: row.get(2)?,
                    reason: row.get(3)?,
                    status: parse_json_column(row, 4)?,
                    created_at: row.get(5)?,
                    responded_at: row.get(6)?,
                })
            })?
            .collect::<std::result::Result<Vec<_>, _>>()?;

        Ok(recommendations)
    }

    pub fn list_pending_recommendations(&self) -> Result<Vec<Recommendation>> {
        let mut stmt = self.conn.prepare(
            r#"
            SELECT id, item_a_id, item_b_id, reason, status, created_at, responded_at
            FROM recommendations
            WHERE status = 'pending'
            ORDER BY created_at DESC
            "#,
        )?;

        let recommendations = stmt
            .query_map([], |row| {
                Ok(Recommendation {
                    id: row.get(0)?,
                    item_a_id: row.get(1)?,
                    item_b_id: row.get(2)?,
                    reason: row.get(3)?,
                    status: parse_json_column(row, 4)?,
                    created_at: row.get(5)?,
                    responded_at: row.get(6)?,
                })
            })?
            .collect::<std::result::Result<Vec<_>, _>>()?;

        Ok(recommendations)
    }

    pub fn update_recommendation_status(
        &self,
        id: &str,
        status: RecommendationStatus,
        responded_at: i64,
    ) -> Result<()> {
        let status_str = Self::recommendation_status_to_str(&status);

        self.conn.execute(
            "UPDATE recommendations SET status = ?1, responded_at = ?2 WHERE id = ?3",
            params![status_str, responded_at, id],
        )?;
        Ok(())
    }

    // Helper functions for RecommendationStatus conversion
    pub(super) fn recommendation_status_to_str(status: &RecommendationStatus) -> &'static str {
        match status {
            RecommendationStatus::Pending => "pending",
            RecommendationStatus::Accepted => "accepted",
            RecommendationStatus::Ignored => "ignored",
            RecommendationStatus::Dismissed => "dismissed",
        }
    }
}
