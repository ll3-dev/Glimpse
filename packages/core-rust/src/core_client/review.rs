//! Review schedule initialization — FSRS-lite spaced repetition bootstrap.
//!
//! Next-interval scheduling from feedback lives in the shared TS package
//! (`packages/features/src/review`); the core only seeds a new item's
//! schedule and memory state.

use std::collections::HashSet;

use crate::models::{
    CalculateTagOverlapInput, InitializeReviewScheduleInput, InitializeReviewScheduleOutput,
};

/// Initial interval for a fresh item's review schedule. Interval clamping
/// itself happens in the shared TS scheduler (`@glimpse/features`).
pub const DEFAULT_INITIAL_REVIEW_INTERVAL_MS: i64 = 10 * 60 * 1000; // 10 minutes

/// Default FSRS-style memory state for a fresh item (in days for stability,
/// 1..=10 scale for difficulty).
const INITIAL_STABILITY_DAYS: f64 = 0.5;
const INITIAL_DIFFICULTY: f64 = 5.0;

use super::CoreClientImpl;

impl CoreClientImpl {
    /// Calculates the number of overlapping tags between two items.
    pub fn calculate_tag_overlap(&self, input: &CalculateTagOverlapInput) -> i32 {
        let left_tags: HashSet<&String> = input
            .left
            .tags
            .as_ref()
            .map(|t| t.iter().collect())
            .unwrap_or_default();

        let right_tags: HashSet<&String> = input
            .right
            .tags
            .as_ref()
            .map(|t| t.iter().collect())
            .unwrap_or_default();

        left_tags.intersection(&right_tags).count() as i32
    }

    /// Initializes the review schedule for a new item.
    pub fn initialize_review_schedule(
        &self,
        input: &InitializeReviewScheduleInput,
    ) -> InitializeReviewScheduleOutput {
        let interval_ms = input
            .interval_ms
            .unwrap_or(DEFAULT_INITIAL_REVIEW_INTERVAL_MS);

        InitializeReviewScheduleOutput {
            next_review_at: input.created_at + interval_ms,
            stability: Some(INITIAL_STABILITY_DAYS),
            difficulty: Some(INITIAL_DIFFICULTY),
            last_reviewed_at: None,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::CoreKnowledgeItemLike;

    fn client() -> CoreClientImpl {
        CoreClientImpl::in_memory().expect("in-memory core client")
    }

    #[test]
    fn tag_overlap_counts_shared_tags() {
        let input = CalculateTagOverlapInput {
            left: CoreKnowledgeItemLike {
                tags: Some(vec!["rust".to_string(), "react".to_string()]),
                ..Default::default()
            },
            right: CoreKnowledgeItemLike {
                tags: Some(vec!["rust".to_string(), "vue".to_string()]),
                ..Default::default()
            },
        };
        assert_eq!(client().calculate_tag_overlap(&input), 1);
    }

    #[test]
    fn initialize_seeds_default_stability_and_difficulty() {
        let created_at = 1_000_000;
        let output = client().initialize_review_schedule(&InitializeReviewScheduleInput {
            created_at,
            interval_ms: None,
        });
        assert_eq!(
            output.next_review_at,
            created_at + DEFAULT_INITIAL_REVIEW_INTERVAL_MS
        );
        assert_eq!(output.stability, Some(0.5));
        assert_eq!(output.difficulty, Some(5.0));
        assert!(output.last_reviewed_at.is_none());
    }
}
