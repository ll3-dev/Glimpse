use crate::error::Result;
use crate::models::{FeedbackEvent, Recommendation, RecommendationStatus};

use super::SharedCore;

impl SharedCore {
    pub fn save_recommendations(&self, recommendations: &[Recommendation]) -> Result<()> {
        self.client().save_recommendations(recommendations)
    }

    pub fn list_recommendations(&self) -> Result<Vec<Recommendation>> {
        self.client().list_recommendations()
    }

    pub fn list_pending_recommendations(&self) -> Result<Vec<Recommendation>> {
        self.client().list_pending_recommendations()
    }

    pub fn respond_to_recommendation(
        &self,
        recommendation_id: &str,
        status: RecommendationStatus,
        feedback_event: &FeedbackEvent,
    ) -> Result<()> {
        self.client()
            .respond_to_recommendation(recommendation_id, status, feedback_event)
    }
}
