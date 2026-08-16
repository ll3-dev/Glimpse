//! Feedback domain rustra commands over `SharedCore`.

use rustra::prelude::*;

use crate::io::FeedbackEventIo;

#[derive(Debug, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct ListRecentFeedbackEventsInput {
    pub limit: usize,
}

#[derive(Debug, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct ListRecentFeedbackEventsOutput {
    pub events: Vec<FeedbackEventIo>,
}

#[command]
pub fn list_recent_feedback_events(
    input: ListRecentFeedbackEventsInput,
) -> Result<ListRecentFeedbackEventsOutput> {
    let core = crate::state::core_state();
    let events = core
        .list_recent_feedback_events(input.limit)
        .map_err(crate::error::to_rustra_err)?;
    Ok(ListRecentFeedbackEventsOutput {
        events: events.into_iter().map(Into::into).collect(),
    })
}

#[derive(Debug, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct LogRecommendationFeedbackInput {
    pub event: FeedbackEventIo,
}

#[derive(Debug, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct LogRecommendationFeedbackOutput {
    pub event: FeedbackEventIo,
}

#[command]
pub fn log_recommendation_feedback(
    input: LogRecommendationFeedbackInput,
) -> Result<LogRecommendationFeedbackOutput> {
    let core = crate::state::core_state();
    let event: glimpse_core::FeedbackEvent = input.event.into();
    let event = core
        .log_recommendation_feedback(&event)
        .map_err(crate::error::to_rustra_err)?;
    Ok(LogRecommendationFeedbackOutput {
        event: event.into(),
    })
}

/// Assembles the `glimpse.feedback` package with all feedback commands.
pub fn feedback_package() -> rustra::Package {
    static CACHED: std::sync::OnceLock<rustra::Package> = std::sync::OnceLock::new();
    CACHED
        .get_or_init(|| {
            rustra::register!(
                rustra::Package::builder("glimpse.feedback"),
                list_recent_feedback_events,
                log_recommendation_feedback
            )
            .build()
        })
        .clone()
}
