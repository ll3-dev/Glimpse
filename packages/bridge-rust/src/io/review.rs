//! Review scheduling input/output wire mirrors.
//!
//! These wrap glimpse-core's pure calculation models; write paths reject
//! unknown `feedbackType` enum strings.

use glimpse_core::{
    CalculateNextReviewInput, CalculateNextReviewOutput, CalculateTagOverlapInput,
    CoreKnowledgeItemLike, InitializeReviewScheduleInput, InitializeReviewScheduleOutput,
};
use rustra::RustraError;
use serde::{Deserialize, Serialize};

use super::parse_enum;

#[derive(Debug, Clone, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct CoreKnowledgeItemLikeIo {
    pub tags: Option<Vec<String>>,
    pub last_reviewed_at: Option<i64>,
    pub next_review_at: Option<i64>,
    pub created_at: Option<i64>,
}

impl From<CoreKnowledgeItemLikeIo> for CoreKnowledgeItemLike {
    fn from(value: CoreKnowledgeItemLikeIo) -> Self {
        Self {
            tags: value.tags,
            last_reviewed_at: value.last_reviewed_at,
            next_review_at: value.next_review_at,
            created_at: value.created_at,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct CalculateTagOverlapInputIo {
    pub left: CoreKnowledgeItemLikeIo,
    pub right: CoreKnowledgeItemLikeIo,
}

impl From<CalculateTagOverlapInputIo> for CalculateTagOverlapInput {
    fn from(value: CalculateTagOverlapInputIo) -> Self {
        Self {
            left: value.left.into(),
            right: value.right.into(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct CalculateNextReviewInputIo {
    pub last_reviewed_at: Option<i64>,
    pub next_review_at: Option<i64>,
    pub feedback_type: String,
    pub now: i64,
}

impl TryFrom<CalculateNextReviewInputIo> for CalculateNextReviewInput {
    type Error = RustraError;

    fn try_from(value: CalculateNextReviewInputIo) -> Result<Self, RustraError> {
        Ok(Self {
            last_reviewed_at: value.last_reviewed_at,
            next_review_at: value.next_review_at,
            feedback_type: parse_enum("feedbackType", value.feedback_type)?,
            now: value.now,
        })
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct CalculateNextReviewOutputIo {
    pub interval_ms: i64,
    pub next_review_at: i64,
}

impl From<CalculateNextReviewOutput> for CalculateNextReviewOutputIo {
    fn from(value: CalculateNextReviewOutput) -> Self {
        Self {
            interval_ms: value.interval_ms,
            next_review_at: value.next_review_at,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct InitializeReviewScheduleInputIo {
    pub created_at: i64,
    pub interval_ms: Option<i64>,
}

impl From<InitializeReviewScheduleInputIo> for InitializeReviewScheduleInput {
    fn from(value: InitializeReviewScheduleInputIo) -> Self {
        Self {
            created_at: value.created_at,
            interval_ms: value.interval_ms,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct InitializeReviewScheduleOutputIo {
    pub next_review_at: i64,
    pub stability: Option<f64>,
    pub difficulty: Option<f64>,
    pub last_reviewed_at: Option<i64>,
}

impl From<InitializeReviewScheduleOutput> for InitializeReviewScheduleOutputIo {
    fn from(value: InitializeReviewScheduleOutput) -> Self {
        Self {
            next_review_at: value.next_review_at,
            stability: value.stability,
            difficulty: value.difficulty,
            last_reviewed_at: value.last_reviewed_at,
        }
    }
}
