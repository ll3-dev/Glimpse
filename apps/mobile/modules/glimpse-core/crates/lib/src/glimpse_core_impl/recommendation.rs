use anyhow::{anyhow, Result};

use super::{parse_json, parse_recommendation_status, to_i64, to_json, GlimpseCore};

impl GlimpseCore {
    pub(crate) fn save_recommendations_json(&mut self, payload_json: &str) -> Result<()> {
        let recommendations: Vec<glimpse_core_rs::Recommendation> = parse_json(payload_json)?;
        glimpse_core_rs::db::save_recommendations(&self.conn, &recommendations)
            .map_err(|error| anyhow!("Failed to save recommendations: {error}"))?;
        Ok(())
    }

    pub(crate) fn list_recommendations_json(&mut self) -> Result<String> {
        let items = glimpse_core_rs::db::list_recommendations(&self.conn)
            .map_err(|error| anyhow!("Failed to list recommendations: {error}"))?;
        to_json(&items)
    }

    pub(crate) fn list_pending_recommendations_json(&mut self) -> Result<String> {
        let items = glimpse_core_rs::db::list_pending_recommendations(&self.conn)
            .map_err(|error| anyhow!("Failed to list pending recommendations: {error}"))?;
        to_json(&items)
    }

    pub(crate) fn list_recent_feedback_events_json(&mut self, limit: f64) -> Result<String> {
        let items = glimpse_core_rs::db::list_recent_feedback_events(&self.conn, to_i64(limit))
            .map_err(|error| anyhow!("Failed to list feedback events: {error}"))?;
        to_json(&items)
    }

    pub(crate) fn log_recommendation_feedback_json(&mut self, payload_json: &str) -> Result<String> {
        let event: glimpse_core_rs::FeedbackEvent = parse_json(payload_json)?;
        let item = glimpse_core_rs::db::log_recommendation_feedback(&self.conn, &event)
            .map_err(|error| anyhow!("Failed to log recommendation feedback: {error}"))?;
        to_json(&item)
    }

    pub(crate) fn respond_to_recommendation_json(
        &mut self,
        recommendation_id: &str,
        status: &str,
        event_json: &str,
    ) -> Result<()> {
        let event: glimpse_core_rs::FeedbackEvent = parse_json(event_json)?;
        glimpse_core_rs::db::respond_to_recommendation(
            &self.conn,
            recommendation_id,
            parse_recommendation_status(status)?,
            &event,
        )
        .map_err(|error| anyhow!("Failed to respond to recommendation: {error}"))?;
        Ok(())
    }
}
