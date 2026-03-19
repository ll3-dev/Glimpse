use glimpse_core_rs::review::{
    calculate_initial_review_at, calculate_next_review, DEFAULT_INITIAL_INTERVAL_MS,
    ReviewFeedbackType,
};

#[test]
fn initial_review_uses_default_interval() {
    assert_eq!(
        calculate_initial_review_at(1_000, None),
        1_000 + DEFAULT_INITIAL_INTERVAL_MS
    );
}

#[test]
fn remembered_feedback_doubles_the_interval() {
    let result = calculate_next_review(Some(1_000), Some(1_000 + DEFAULT_INITIAL_INTERVAL_MS), ReviewFeedbackType::Remembered, 2_000);

    assert_eq!(result.interval_ms, DEFAULT_INITIAL_INTERVAL_MS * 2);
    assert_eq!(result.next_review_at, 2_000 + (DEFAULT_INITIAL_INTERVAL_MS * 2));
}
