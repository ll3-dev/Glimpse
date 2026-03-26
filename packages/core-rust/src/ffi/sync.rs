//! Synchronous FFI functions - pure calculations, no SQLite access.

use super::{CoreClientHandle, FfiErrorCode, FfiOptionalF64, FfiOptionalI64};
use std::ffi::{c_char, c_int, CStr};

/// Output for next review calculation.
#[repr(C)]
pub struct FfiNextReviewOutput {
    pub interval_ms: i64,
    pub next_review_at: i64,
}

/// Output for initialize review schedule.
#[repr(C)]
pub struct FfiInitReviewOutput {
    pub next_review_at: i64,
    pub stability: FfiOptionalF64,
    pub difficulty: FfiOptionalF64,
    pub last_reviewed_at: FfiOptionalI64,
}

/// Calculates tag overlap between two sets of tags.
/// Returns the count of overlapping tags.
///
/// # Safety
/// - handle must be a valid CoreClientHandle
/// - left_tags and right_tags must be valid arrays of null-terminated strings
#[no_mangle]
pub unsafe extern "C" fn core_client_calculate_tag_overlap(
    _handle: CoreClientHandle,
    left_tags: *const *const c_char,
    left_tags_len: c_int,
    right_tags: *const *const c_char,
    right_tags_len: c_int,
) -> c_int {
    if left_tags.is_null() || right_tags.is_null() {
        return 0;
    }

    let left: std::collections::HashSet<String> = (0..left_tags_len)
        .filter_map(|i| {
            let ptr = *left_tags.offset(i as isize);
            if ptr.is_null() { return None; }
            CStr::from_ptr(ptr).to_str().ok().map(|s| s.to_string())
        })
        .collect();

    let right: std::collections::HashSet<String> = (0..right_tags_len)
        .filter_map(|i| {
            let ptr = *right_tags.offset(i as isize);
            if ptr.is_null() { return None; }
            CStr::from_ptr(ptr).to_str().ok().map(|s| s.to_string())
        })
        .collect();

    left.intersection(&right).count() as c_int
}

/// Calculates the next review time based on feedback.
/// These are pure calculations that don't fail - always returns Ok.
///
/// # Safety
/// - handle must be a valid CoreClientHandle
/// - out must be a valid pointer to FfiNextReviewOutput
#[no_mangle]
pub unsafe extern "C" fn core_client_calculate_next_review(
    handle: CoreClientHandle,
    last_reviewed_at: FfiOptionalI64,
    next_review_at: FfiOptionalI64,
    feedback_type: i8,  // 0 = remembered, 1 = postponed
    now: i64,
    out: *mut FfiNextReviewOutput,
) -> FfiErrorCode {
    if handle.is_null() || out.is_null() {
        return FfiErrorCode::InvalidInput;
    }

    let client = &*handle;
    let input = crate::models::CalculateNextReviewInput {
        last_reviewed_at: last_reviewed_at.into(),
        next_review_at: next_review_at.into(),
        feedback_type: if feedback_type == 0 {
            crate::models::ReviewFeedbackType::Remembered
        } else {
            crate::models::ReviewFeedbackType::Postponed
        },
        now,
    };

    let result = client.calculate_next_review(&input);
    (*out).interval_ms = result.interval_ms;
    (*out).next_review_at = result.next_review_at;
    FfiErrorCode::Ok
}

/// Initializes a review schedule for a new item.
/// These are pure calculations that don't fail - always returns Ok.
///
/// # Safety
/// - handle must be a valid CoreClientHandle
/// - out must be a valid pointer to FfiInitReviewOutput
#[no_mangle]
pub unsafe extern "C" fn core_client_initialize_review_schedule(
    handle: CoreClientHandle,
    created_at: i64,
    interval_ms: FfiOptionalI64,
    out: *mut FfiInitReviewOutput,
) -> FfiErrorCode {
    if handle.is_null() || out.is_null() {
        return FfiErrorCode::InvalidInput;
    }

    let client = &*handle;
    let input = crate::models::InitializeReviewScheduleInput {
        created_at,
        interval_ms: interval_ms.into(),
    };

    let result = client.initialize_review_schedule(&input);
    (*out).next_review_at = result.next_review_at;
    (*out).stability = result.stability.into();
    (*out).difficulty = result.difficulty.into();
    (*out).last_reviewed_at = result.last_reviewed_at.into();
    FfiErrorCode::Ok
}
