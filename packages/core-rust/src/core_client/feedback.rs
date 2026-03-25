//! FeedbackEvent operations for CoreClient.

use crate::error::Result;
use crate::models::FeedbackEvent;

use super::CoreClientImpl;

impl CoreClientImpl {
    pub fn list_recent_feedback_events(&self, limit: usize) -> Result<Vec<FeedbackEvent>> {
        self.storage.list_recent_feedback_events(limit)
    }

    pub fn log_recommendation_feedback(&self, event: &FeedbackEvent) -> Result<FeedbackEvent> {
        self.storage.insert_feedback_event(event)?;
        Ok(event.clone())
    }
}
