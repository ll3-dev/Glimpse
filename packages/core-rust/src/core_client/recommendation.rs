//! Recommendation operations for CoreClient.

use crate::error::Result;
use crate::models::{Recommendation, RecommendationStatus};

use super::CoreClientImpl;

impl CoreClientImpl {
    pub fn save_recommendations(&self, recommendations: &[Recommendation]) -> Result<()> {
        self.storage.insert_recommendations(recommendations)
    }

    pub fn list_recommendations(&self) -> Result<Vec<Recommendation>> {
        self.storage.list_recommendations()
    }

    pub fn list_pending_recommendations(&self) -> Result<Vec<Recommendation>> {
        self.storage.list_pending_recommendations()
    }

    pub fn respond_to_recommendation(
        &self,
        recommendation_id: &str,
        status: RecommendationStatus,
        event: &crate::models::FeedbackEvent,
    ) -> Result<()> {
        self.storage.update_recommendation_status(
            recommendation_id,
            status,
            event.created_at,
        )?;
        self.storage.insert_feedback_event(event)?;
        Ok(())
    }
}
