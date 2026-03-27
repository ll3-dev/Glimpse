use crate::error::Result;
use crate::models::FeedbackEvent;

use super::SharedCore;

impl SharedCore {
    pub fn list_recent_feedback_events(&self, limit: usize) -> Result<Vec<FeedbackEvent>> {
        self.client().list_recent_feedback_events(limit)
    }

    pub fn log_recommendation_feedback(&self, event: &FeedbackEvent) -> Result<FeedbackEvent> {
        self.client().log_recommendation_feedback(event)
    }
}
