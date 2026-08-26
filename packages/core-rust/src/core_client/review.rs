//! Review schedule calculation logic — FSRS-lite spaced repetition.

use std::collections::HashSet;

use crate::models::{
    CalculateNextReviewInput, CalculateNextReviewOutput, CalculateTagOverlapInput,
    InitializeReviewScheduleInput, InitializeReviewScheduleOutput, ReviewFeedbackType,
};

// Review schedule constants (matching TypeScript implementation)
pub const DEFAULT_INITIAL_REVIEW_INTERVAL_MS: i64 = 10 * 60 * 1000; // 10 minutes
pub const MIN_REVIEW_INTERVAL_MS: i64 = 10 * 60 * 1000; // 10 minutes
pub const MAX_REVIEW_INTERVAL_MS: i64 = 365 * 24 * 60 * 60 * 1000; // 1 year

/// Default FSRS-style memory state for a fresh item (in days for stability,
/// 1..=10 scale for difficulty).
const INITIAL_STABILITY_DAYS: f64 = 0.5;
const INITIAL_DIFFICULTY: f64 = 5.0;
const MIN_DIFFICULTY: f64 = 1.0;
const MAX_DIFFICULTY: f64 = 10.0;
const DAY_MS: f64 = 24.0 * 60.0 * 60.0 * 1000.0;

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

    /// Calculates the next review time and memory state from feedback.
    pub fn calculate_next_review(
        &self,
        input: &CalculateNextReviewInput,
    ) -> CalculateNextReviewOutput {
        let state = next_memory_state(
            MemoryState {
                stability_days: input.stability.unwrap_or(INITIAL_STABILITY_DAYS),
                difficulty: input.difficulty.unwrap_or(INITIAL_DIFFICULTY),
                interval_ms: 0,
            },
            input.last_reviewed_at,
            input.next_review_at,
            input.feedback_type,
            input.now,
        );
        CalculateNextReviewOutput {
            interval_ms: state.interval_ms,
            next_review_at: input.now + state.interval_ms,
            stability: state.stability_days,
            difficulty: state.difficulty,
        }
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

struct MemoryState {
    stability_days: f64,
    difficulty: f64,
    interval_ms: i64,
}

/// Ebbinghaus-curve scheduler: stability is how long the memory lasts (in
/// days) at ~90% recall; each outcome moves both stability and difficulty.
/// Remembered -> stability grows (retention-weighted), difficulty eases.
/// Forgotten  -> stability contracts, difficulty rises.
/// Postponed  -> the user deferred without grading recall: keep the state and
/// push the same interval forward, so a postponed item does not silently
/// repeat forever nor grow as if it had been recalled.
fn next_memory_state(
    current: MemoryState,
    last_reviewed_at: Option<i64>,
    next_review_at: Option<i64>,
    feedback_type: ReviewFeedbackType,
    now: i64,
) -> MemoryState {
    // How much of the scheduled interval actually elapsed before this review.
    let elapsed_ms = match (last_reviewed_at, next_review_at) {
        (Some(last), Some(next)) => (now - last).max(0).min((next - last).max(1)),
        _ => 0,
    };
    let elapsed_days = elapsed_ms as f64 / DAY_MS;

    match feedback_type {
        ReviewFeedbackType::Postponed => {
            let interval_ms = current_interval_ms(last_reviewed_at, next_review_at)
                .max(DEFAULT_INITIAL_REVIEW_INTERVAL_MS);
            MemoryState {
                stability_days: current.stability_days,
                difficulty: current.difficulty,
                interval_ms: clamp_interval(interval_ms),
            }
        }
        ReviewFeedbackType::Remembered => {
            // Real elapsed time strengthens memory more than a cram review:
            // growth is anchored on max(elapsed, current stability).
            let base_days = elapsed_days.max(current.stability_days).max(0.5);
            let difficulty_penalty = 1.0 + (current.difficulty - 5.0) / 20.0;
            let stability_days = (base_days * 1.9 * difficulty_penalty.max(0.3))
                .max(current.stability_days)
                .max(0.5);
            let difficulty = (current.difficulty - 0.5).max(MIN_DIFFICULTY);
            MemoryState {
                interval_ms: clamp_interval((stability_days * DAY_MS) as i64),
                stability_days,
                difficulty,
            }
        }
        ReviewFeedbackType::Forgotten => {
            // A lapse resets stability to a fraction of its prior value,
            // weighted by how established the memory was.
            let stability_days =
                (current.stability_days * 0.35).max(INITIAL_STABILITY_DAYS * 0.6);
            let difficulty = (current.difficulty + 1.5).min(MAX_DIFFICULTY);
            MemoryState {
                interval_ms: clamp_interval((stability_days * DAY_MS) as i64),
                stability_days,
                difficulty,
            }
        }
    }
}

fn current_interval_ms(last_reviewed_at: Option<i64>, next_review_at: Option<i64>) -> i64 {
    match (last_reviewed_at, next_review_at) {
        (Some(last), Some(next)) => (next - last).max(0),
        _ => DEFAULT_INITIAL_REVIEW_INTERVAL_MS,
    }
}

fn clamp_interval(interval_ms: i64) -> i64 {
    interval_ms.clamp(MIN_REVIEW_INTERVAL_MS, MAX_REVIEW_INTERVAL_MS)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn client() -> CoreClientImpl {
        CoreClientImpl::in_memory().expect("in-memory core client")
    }

    fn input(
        feedback: ReviewFeedbackType,
        stability: Option<f64>,
        difficulty: Option<f64>,
    ) -> CalculateNextReviewInput {
        CalculateNextReviewInput {
            last_reviewed_at: Some(1_000_000),
            next_review_at: Some(1_000_000 + 24 * 60 * 60 * 1000),
            feedback_type: feedback,
            now: 1_000_000 + 24 * 60 * 60 * 1000,
            stability,
            difficulty,
        }
    }

    #[test]
    fn remembered_grows_stability_and_eases_difficulty() {
        let output = client().calculate_next_review(&input(
            ReviewFeedbackType::Remembered,
            Some(3.0),
            Some(6.0),
        ));
        assert!(output.stability > 3.0, "stability should grow");
        assert!(output.difficulty < 6.0, "difficulty should ease");
        assert!(output.interval_ms > (3.0 * DAY_MS) as i64);
    }

    #[test]
    fn forgotten_shrinks_stability_and_raises_difficulty() {
        let output = client().calculate_next_review(&input(
            ReviewFeedbackType::Forgotten,
            Some(10.0),
            Some(3.0),
        ));
        assert!(output.stability < 10.0, "stability should contract");
        assert!(output.difficulty > 3.0, "difficulty should rise");
        assert!(output.interval_ms < (10.0 * DAY_MS) as i64);
    }

    #[test]
    fn postponed_keeps_state_and_pushes_same_interval() {
        let output = client().calculate_next_review(&input(
            ReviewFeedbackType::Postponed,
            Some(4.0),
            Some(5.0),
        ));
        assert_eq!(output.stability, 4.0);
        assert_eq!(output.difficulty, 5.0);
        // Same 1-day interval pushed forward from now.
        assert_eq!(output.interval_ms, 24 * 60 * 60 * 1000);
    }

    #[test]
    fn intervals_monotonically_extend_for_consecutive_recall() {
        // Simulate a user remembering the same item repeatedly: each cycle's
        // interval must be strictly longer than the previous one.
        let mut stability = 0.5_f64;
        let mut last_interval = 0_i64;
        for _ in 0..6 {
            let output = next_memory_state(
                MemoryState {
                    stability_days: stability,
                    difficulty: 5.0,
                    interval_ms: 0,
                },
                Some(0),
                Some(last_interval.max(DEFAULT_INITIAL_REVIEW_INTERVAL_MS)),
                ReviewFeedbackType::Remembered,
                last_interval.max(DEFAULT_INITIAL_REVIEW_INTERVAL_MS),
            );
            assert!(
                output.interval_ms > last_interval,
                "interval must grow (got {} after {})",
                output.interval_ms,
                last_interval
            );
            last_interval = output.interval_ms;
            stability = output.stability_days;
        }
    }
}
