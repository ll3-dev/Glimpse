//! Review schedule calculation logic.

use std::collections::HashSet;

use crate::models::{
    CalculateNextReviewInput, CalculateNextReviewOutput, CalculateTagOverlapInput,
    CoreKnowledgeItemLike, InitializeReviewScheduleInput, InitializeReviewScheduleOutput,
    ReviewFeedbackType,
};

// Review schedule constants (matching TypeScript implementation)
pub const DEFAULT_INITIAL_REVIEW_INTERVAL_MS: i64 = 24 * 60 * 60 * 1000; // 1 day
pub const MIN_REVIEW_INTERVAL_MS: i64 = 24 * 60 * 60 * 1000; // 1 day
pub const MAX_REVIEW_INTERVAL_MS: i64 = 30 * 24 * 60 * 60 * 1000; // 30 days

const FEEDBACK_MULTIPLIER_REMEMBERED: i64 = 2;
const FEEDBACK_MULTIPLIER_POSTPONED: i64 = 1;

use super::CoreClientImpl;

impl CoreClientImpl {
    /// Calculates the number of overlapping tags between two items.
    pub fn calculate_tag_overlap(&self, input: &CalculateTagOverlapInput) -> i32 {
        let left_tags: HashSet<&String> = input.left.tags.as_ref()
            .map(|t| t.iter().collect())
            .unwrap_or_default();

        let right_tags: HashSet<&String> = input.right.tags.as_ref()
            .map(|t| t.iter().collect())
            .unwrap_or_default();

        left_tags.intersection(&right_tags).count() as i32
    }

    /// Calculates the next review time based on feedback.
    pub fn calculate_next_review(&self, input: &CalculateNextReviewInput) -> CalculateNextReviewOutput {
        let current_interval = calculate_current_interval(
            input.last_reviewed_at,
            input.next_review_at,
        );

        let adjusted_interval = calculate_adjusted_interval(current_interval, input.feedback_type);
        let next_review_at = input.now + adjusted_interval;

        CalculateNextReviewOutput {
            interval_ms: adjusted_interval,
            next_review_at,
        }
    }

    /// Initializes the review schedule for a new item.
    pub fn initialize_review_schedule(&self, input: &InitializeReviewScheduleInput) -> InitializeReviewScheduleOutput {
        let interval_ms = input.interval_ms.unwrap_or(DEFAULT_INITIAL_REVIEW_INTERVAL_MS);

        InitializeReviewScheduleOutput {
            next_review_at: input.created_at + interval_ms,
            stability: None,
            difficulty: None,
            last_reviewed_at: None,
        }
    }
}

fn calculate_current_interval(last_reviewed_at: Option<i64>, next_review_at: Option<i64>) -> i64 {
    match (last_reviewed_at, next_review_at) {
        (Some(last), Some(next)) => next - last,
        _ => DEFAULT_INITIAL_REVIEW_INTERVAL_MS,
    }
}

fn clamp_interval(interval_ms: i64) -> i64 {
    interval_ms.clamp(MIN_REVIEW_INTERVAL_MS, MAX_REVIEW_INTERVAL_MS)
}

fn calculate_adjusted_interval(current_interval_ms: i64, feedback_type: ReviewFeedbackType) -> i64 {
    let multiplier = match feedback_type {
        ReviewFeedbackType::Remembered => FEEDBACK_MULTIPLIER_REMEMBERED,
        ReviewFeedbackType::Postponed => FEEDBACK_MULTIPLIER_POSTPONED,
    };
    clamp_interval(current_interval_ms * multiplier)
}
