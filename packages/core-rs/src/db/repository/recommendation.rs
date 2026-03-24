use anyhow::Result;
use rusqlite::{params, Connection};

use crate::models::{FeedbackEvent, Recommendation, RecommendationStatus};

use crate::db::rows::{
    collect_rows, map_feedback_event_row, map_recommendation_row, to_feedback_action,
    to_recommendation_status,
};

pub fn save_recommendations(conn: &Connection, recommendations: &[Recommendation]) -> Result<()> {
    if recommendations.is_empty() {
        return Ok(());
    }
    let transaction = conn.unchecked_transaction()?;
    for recommendation in recommendations {
        transaction.execute(
            "INSERT INTO recommendations (id, item_a_id, item_b_id, reason, status, created_at, responded_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7);",
            params![
                recommendation.id,
                recommendation.item_a_id,
                recommendation.item_b_id,
                recommendation.reason,
                to_recommendation_status(&recommendation.status),
                recommendation.created_at as f64,
                recommendation.responded_at.map(|value| value as f64),
            ],
        )?;
    }
    transaction.commit()?;
    Ok(())
}

pub fn list_recommendations(conn: &Connection) -> Result<Vec<Recommendation>> {
    let mut statement = conn.prepare(
        "SELECT id, item_a_id, item_b_id, reason, status, created_at, responded_at
         FROM recommendations;",
    )?;
    let rows = statement.query_map([], map_recommendation_row)?;
    collect_rows(rows)
}

pub fn list_pending_recommendations(conn: &Connection) -> Result<Vec<Recommendation>> {
    let mut statement = conn.prepare(
        "SELECT id, item_a_id, item_b_id, reason, status, created_at, responded_at
         FROM recommendations WHERE status = 'pending';",
    )?;
    let rows = statement.query_map([], map_recommendation_row)?;
    collect_rows(rows)
}

pub fn list_recent_feedback_events(conn: &Connection, limit: i64) -> Result<Vec<FeedbackEvent>> {
    let mut statement = conn.prepare(
        "SELECT id, recommendation_id, action, created_at
         FROM feedback_events ORDER BY created_at DESC LIMIT ?1;",
    )?;
    let rows = statement.query_map([limit as f64], map_feedback_event_row)?;
    collect_rows(rows)
}

pub fn log_recommendation_feedback(conn: &Connection, event: &FeedbackEvent) -> Result<FeedbackEvent> {
    conn.execute(
        "INSERT INTO feedback_events (id, recommendation_id, action, created_at)
         VALUES (?1, ?2, ?3, ?4);",
        params![
            event.id,
            event.recommendation_id,
            to_feedback_action(&event.action),
            event.created_at as f64,
        ],
    )?;
    Ok(event.clone())
}

pub fn respond_to_recommendation(
    conn: &Connection,
    recommendation_id: &str,
    status: RecommendationStatus,
    event: &FeedbackEvent,
) -> Result<()> {
    let transaction = conn.unchecked_transaction()?;
    transaction.execute(
        "UPDATE recommendations SET status = ?1, responded_at = ?2 WHERE id = ?3;",
        params![
            to_recommendation_status(&status),
            event.created_at as f64,
            recommendation_id
        ],
    )?;
    transaction.execute(
        "INSERT INTO feedback_events (id, recommendation_id, action, created_at)
         VALUES (?1, ?2, ?3, ?4);",
        params![
            event.id,
            event.recommendation_id,
            to_feedback_action(&event.action),
            event.created_at as f64,
        ],
    )?;
    transaction.commit()?;
    Ok(())
}
