pub const MIN_INTERVAL_MS: i64 = 24 * 60 * 60 * 1000;
pub const MAX_INTERVAL_MS: i64 = 30 * 24 * 60 * 60 * 1000;
pub const DEFAULT_INITIAL_INTERVAL_MS: i64 = 24 * 60 * 60 * 1000;

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ReviewFeedbackType {
    Remembered,
    Postponed,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct NextReview {
    pub interval_ms: i64,
    pub next_review_at: i64,
}

pub fn calculate_initial_review_at(created_at: i64, interval_ms: Option<i64>) -> i64 {
    created_at + interval_ms.unwrap_or(DEFAULT_INITIAL_INTERVAL_MS)
}

pub fn calculate_current_interval(last_reviewed_at: Option<i64>, next_review_at: Option<i64>) -> i64 {
    match (last_reviewed_at, next_review_at) {
        (Some(last_reviewed_at), Some(next_review_at)) => next_review_at - last_reviewed_at,
        _ => DEFAULT_INITIAL_INTERVAL_MS,
    }
}

pub fn clamp_interval(interval_ms: i64) -> i64 {
    interval_ms.clamp(MIN_INTERVAL_MS, MAX_INTERVAL_MS)
}

pub fn calculate_adjusted_interval(current_interval_ms: i64, feedback_type: ReviewFeedbackType) -> i64 {
    let next_interval = match feedback_type {
        ReviewFeedbackType::Remembered => current_interval_ms * 2,
        ReviewFeedbackType::Postponed => current_interval_ms,
    };

    clamp_interval(next_interval)
}

pub fn calculate_next_review(
    last_reviewed_at: Option<i64>,
    next_review_at: Option<i64>,
    feedback_type: ReviewFeedbackType,
    now: i64,
) -> NextReview {
    let current_interval = calculate_current_interval(last_reviewed_at, next_review_at);
    let adjusted_interval = calculate_adjusted_interval(current_interval, feedback_type);

    NextReview {
        interval_ms: adjusted_interval,
        next_review_at: now + adjusted_interval,
    }
}
