use anyhow::Result;
use glimpse_core_rs::review::{calculate_initial_review_at, calculate_next_review};

use crate::ffi::bridging::{
    GlimpseCalculateNextReviewOutput, GlimpseInitializeReviewScheduleOutput, NullableNumber,
    NullableStringArray,
};

use super::{parse_feedback_type, to_i64, to_nullable_number, to_optional_i64, GlimpseCore};

impl GlimpseCore {
    pub(crate) fn calculate_next_review(
        &mut self,
        last_reviewed_at: NullableNumber,
        next_review_at: NullableNumber,
        feedback_type: &str,
        now: f64,
    ) -> Result<GlimpseCalculateNextReviewOutput> {
        let next_review = calculate_next_review(
            to_optional_i64(last_reviewed_at),
            to_optional_i64(next_review_at),
            parse_feedback_type(feedback_type)?,
            to_i64(now),
        );

        Ok(GlimpseCalculateNextReviewOutput {
            interval_ms: next_review.interval_ms as f64,
            next_review_at: next_review.next_review_at as f64,
        })
    }

    pub(crate) fn calculate_tag_overlap(
        &mut self,
        left_tags: NullableStringArray,
        right_tags: NullableStringArray,
    ) -> Result<f64> {
        Ok(super::support::calculate_tag_overlap_for_tags(
            left_tags, right_tags,
        ))
    }

    pub(crate) fn initialize_review_schedule(
        &mut self,
        created_at: f64,
        interval_ms: NullableNumber,
    ) -> Result<GlimpseInitializeReviewScheduleOutput> {
        Ok(GlimpseInitializeReviewScheduleOutput {
            next_review_at: calculate_initial_review_at(
                to_i64(created_at),
                to_optional_i64(interval_ms),
            ) as f64,
            stability: Option::<f64>::None.into(),
            difficulty: Option::<f64>::None.into(),
            last_reviewed_at: to_nullable_number(None),
        })
    }
}
