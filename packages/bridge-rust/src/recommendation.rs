//! Recommendation domain rustra commands over `SharedCore`.

use rustra::prelude::*;

use crate::io::{recommendation_status_from_wire, FeedbackEventIo, RecommendationIo};

#[derive(Debug, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct SaveRecommendationsInput {
    pub recommendations: Vec<RecommendationIo>,
}

#[derive(Debug, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct SaveRecommendationsOutput {}

#[command]
pub fn save_recommendations(input: SaveRecommendationsInput) -> Result<SaveRecommendationsOutput> {
    let core = crate::state::core_state();
    let recommendations: Vec<glimpse_core::Recommendation> =
        input.recommendations.into_iter().map(Into::into).collect();
    core.save_recommendations(&recommendations)
        .map_err(crate::error::to_rustra_err)?;
    Ok(SaveRecommendationsOutput {})
}

#[derive(Debug, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct ListRecommendationsInput {}

#[derive(Debug, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct ListRecommendationsOutput {
    pub recommendations: Vec<RecommendationIo>,
}

#[command]
pub fn list_recommendations(_input: ListRecommendationsInput) -> Result<ListRecommendationsOutput> {
    let core = crate::state::core_state();
    let recommendations = core
        .list_recommendations()
        .map_err(crate::error::to_rustra_err)?;
    Ok(ListRecommendationsOutput {
        recommendations: recommendations.into_iter().map(Into::into).collect(),
    })
}

#[derive(Debug, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct ListPendingRecommendationsInput {}

#[derive(Debug, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct ListPendingRecommendationsOutput {
    pub recommendations: Vec<RecommendationIo>,
}

#[command]
pub fn list_pending_recommendations(
    _input: ListPendingRecommendationsInput,
) -> Result<ListPendingRecommendationsOutput> {
    let core = crate::state::core_state();
    let recommendations = core
        .list_pending_recommendations()
        .map_err(crate::error::to_rustra_err)?;
    Ok(ListPendingRecommendationsOutput {
        recommendations: recommendations.into_iter().map(Into::into).collect(),
    })
}

#[derive(Debug, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct RespondToRecommendationInput {
    pub recommendation_id: String,
    pub status: String,
    pub feedback_event: FeedbackEventIo,
}

#[derive(Debug, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct RespondToRecommendationOutput {}

#[command]
pub fn respond_to_recommendation(
    input: RespondToRecommendationInput,
) -> Result<RespondToRecommendationOutput> {
    let core = crate::state::core_state();
    let status = recommendation_status_from_wire(input.status);
    let feedback_event: glimpse_core::FeedbackEvent = input.feedback_event.into();
    core.respond_to_recommendation(&input.recommendation_id, status, &feedback_event)
        .map_err(crate::error::to_rustra_err)?;
    Ok(RespondToRecommendationOutput {})
}

/// Assembles the `glimpse.recommendation` package with all recommendation commands.
pub fn recommendation_package() -> rustra::Package {
    static CACHED: std::sync::OnceLock<rustra::Package> = std::sync::OnceLock::new();
    CACHED
        .get_or_init(|| {
            rustra::register!(
                rustra::Package::builder("glimpse.recommendation"),
                save_recommendations,
                list_recommendations,
                list_pending_recommendations,
                respond_to_recommendation
            )
            .build()
        })
        .clone()
}
