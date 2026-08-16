//! Recommendation and FeedbackEvent wire mirrors.

use glimpse_core::{FeedbackEvent, Recommendation, RecommendationStatus};
use rustra::RustraError;
use serde::{Deserialize, Serialize};

use super::{enum_to_value, parse_enum};

#[derive(Debug, Clone, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct RecommendationIo {
    pub id: String,
    // camelCase rename_all would produce `itemAId`; the `@glimpse/shared`
    // contract uses `itemA_id`/`itemB_id`, so pin the wire names explicitly.
    #[serde(rename = "itemA_id")]
    pub item_a_id: String,
    #[serde(rename = "itemB_id")]
    pub item_b_id: String,
    pub reason: Option<String>,
    pub status: String,
    pub created_at: i64,
    pub responded_at: Option<i64>,
}

impl From<Recommendation> for RecommendationIo {
    fn from(recommendation: Recommendation) -> Self {
        Self {
            id: recommendation.id,
            item_a_id: recommendation.item_a_id,
            item_b_id: recommendation.item_b_id,
            reason: recommendation.reason,
            status: enum_to_value(recommendation.status)
                .as_str()
                .unwrap_or("pending")
                .to_string(),
            created_at: recommendation.created_at,
            responded_at: recommendation.responded_at,
        }
    }
}

impl TryFrom<RecommendationIo> for Recommendation {
    type Error = RustraError;

    fn try_from(recommendation: RecommendationIo) -> Result<Self, RustraError> {
        Ok(Self {
            id: recommendation.id,
            item_a_id: recommendation.item_a_id,
            item_b_id: recommendation.item_b_id,
            reason: recommendation.reason,
            status: parse_enum("status", recommendation.status)?,
            created_at: recommendation.created_at,
            responded_at: recommendation.responded_at,
        })
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct FeedbackEventIo {
    pub id: String,
    pub recommendation_id: String,
    pub action: String,
    pub created_at: i64,
}

impl From<FeedbackEvent> for FeedbackEventIo {
    fn from(event: FeedbackEvent) -> Self {
        Self {
            id: event.id,
            recommendation_id: event.recommendation_id,
            action: enum_to_value(event.action)
                .as_str()
                .unwrap_or("accept")
                .to_string(),
            created_at: event.created_at,
        }
    }
}

impl TryFrom<FeedbackEventIo> for FeedbackEvent {
    type Error = RustraError;

    fn try_from(event: FeedbackEventIo) -> Result<Self, RustraError> {
        Ok(Self {
            id: event.id,
            recommendation_id: event.recommendation_id,
            action: parse_enum("action", event.action)?,
            created_at: event.created_at,
        })
    }
}

/// Parses a wire status string into a core [`RecommendationStatus`].
///
/// Used by the recommendation domain's `respondToRecommendation` command;
/// unknown status strings are rejected as `invalid_args` rather than written
/// back as a fallback status.
pub(crate) fn recommendation_status_from_wire(
    value: String,
) -> Result<RecommendationStatus, RustraError> {
    parse_enum("status", value)
}
