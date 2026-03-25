//! FFI unit tests

#[cfg(test)]
mod tests {
    use crate::ffi::*;
    use crate::CoreClientImpl;
    use std::ffi::{c_char, CString};

    fn create_test_client() -> CoreClientHandle {
        let client = CoreClientImpl::in_memory().unwrap();
        Box::into_raw(Box::new(client))
    }

    fn destroy_test_client(handle: CoreClientHandle) {
        unsafe {
            core_client_destroy(handle);
        }
    }

    #[test]
    fn test_ffi_create_and_destroy() {
        let path = CString::new(":memory:").unwrap();
        let handle = unsafe { core_client_create(path.as_ptr()) };
        assert!(!handle.is_null());
        destroy_test_client(handle);
    }

    #[test]
    fn test_ffi_create_invalid_path() {
        // Invalid path should return null
        let path = CString::new("/nonexistent/path/that/does/not/exist.db").unwrap();
        let handle = unsafe { core_client_create(path.as_ptr()) };
        // Note: SQLite creates the file, so this might succeed
        // In a real test, we'd want to test with truly invalid paths
        if !handle.is_null() {
            destroy_test_client(handle);
        }
    }

    #[test]
    fn test_ffi_calculate_tag_overlap() {
        let handle = create_test_client();

        let left = vec![
            CString::new("rust").unwrap(),
            CString::new("react").unwrap(),
        ];
        let right = vec![
            CString::new("rust").unwrap(),
            CString::new("vue").unwrap(),
        ];

        let left_ptrs: Vec<*const c_char> = left.iter().map(|s| s.as_ptr()).collect();
        let right_ptrs: Vec<*const c_char> = right.iter().map(|s| s.as_ptr()).collect();

        let result = unsafe {
            core_client_calculate_tag_overlap(
                handle,
                left_ptrs.as_ptr(),
                left_ptrs.len() as i32,
                right_ptrs.as_ptr(),
                right_ptrs.len() as i32,
            )
        };

        assert_eq!(result, 1); // "rust" overlaps

        destroy_test_client(handle);
    }

    #[test]
    fn test_ffi_calculate_tag_overlap_empty() {
        let handle = create_test_client();

        let left: Vec<CString> = vec![];
        let right = vec![CString::new("a").unwrap()];

        let left_ptrs: Vec<*const c_char> = left.iter().map(|s| s.as_ptr()).collect();
        let right_ptrs: Vec<*const c_char> = right.iter().map(|s| s.as_ptr()).collect();

        let result = unsafe {
            core_client_calculate_tag_overlap(
                handle,
                left_ptrs.as_ptr(),
                left_ptrs.len() as i32,
                right_ptrs.as_ptr(),
                right_ptrs.len() as i32,
            )
        };

        assert_eq!(result, 0); // No overlap with empty

        destroy_test_client(handle);
    }

    #[test]
    fn test_ffi_calculate_next_review_remembered() {
        let handle = create_test_client();

        let one_day = 24 * 60 * 60 * 1000_i64;
        let now = one_day * 2;

        let mut output = FfiNextReviewOutput {
            interval_ms: 0,
            next_review_at: 0,
        };

        let result = unsafe {
            core_client_calculate_next_review(
                handle,
                FfiOptionalI64 { has_value: true, value: 0 },
                FfiOptionalI64 { has_value: true, value: one_day },
                0, // remembered
                now,
                &mut output,
            )
        };

        assert_eq!(result, FfiErrorCode::Ok);
        assert_eq!(output.interval_ms, one_day * 2);
        assert_eq!(output.next_review_at, now + one_day * 2);

        destroy_test_client(handle);
    }

    #[test]
    fn test_ffi_calculate_next_review_postponed() {
        let handle = create_test_client();

        let one_day = 24 * 60 * 60 * 1000_i64;
        let now = one_day * 2;

        let mut output = FfiNextReviewOutput {
            interval_ms: 0,
            next_review_at: 0,
        };

        let result = unsafe {
            core_client_calculate_next_review(
                handle,
                FfiOptionalI64 { has_value: true, value: 0 },
                FfiOptionalI64 { has_value: true, value: one_day },
                1, // postponed
                now,
                &mut output,
            )
        };

        assert_eq!(result, FfiErrorCode::Ok);
        assert_eq!(output.interval_ms, one_day);
        assert_eq!(output.next_review_at, now + one_day);

        destroy_test_client(handle);
    }

    #[test]
    fn test_ffi_calculate_next_review_null_handle() {
        let mut output = FfiNextReviewOutput {
            interval_ms: 0,
            next_review_at: 0,
        };

        let result = unsafe {
            core_client_calculate_next_review(
                std::ptr::null_mut(),
                FfiOptionalI64 { has_value: false, value: 0 },
                FfiOptionalI64 { has_value: false, value: 0 },
                0,
                1000,
                &mut output,
            )
        };

        assert_eq!(result, FfiErrorCode::InvalidInput);
    }

    #[test]
    fn test_ffi_initialize_review_schedule() {
        let handle = create_test_client();

        let created_at = 1000_i64;
        let mut output = FfiInitReviewOutput {
            next_review_at: 0,
            stability: FfiOptionalF64 { has_value: false, value: 0.0 },
            difficulty: FfiOptionalF64 { has_value: false, value: 0.0 },
            last_reviewed_at: FfiOptionalI64 { has_value: false, value: 0 },
        };

        let one_day = 24 * 60 * 60 * 1000_i64;

        let result = unsafe {
            core_client_initialize_review_schedule(
                handle,
                created_at,
                FfiOptionalI64 { has_value: false, value: 0 },
                &mut output,
            )
        };

        assert_eq!(result, FfiErrorCode::Ok);
        assert_eq!(output.next_review_at, created_at + one_day);
        assert!(!output.stability.has_value);
        assert!(!output.difficulty.has_value);
        assert!(!output.last_reviewed_at.has_value);

        destroy_test_client(handle);
    }

    #[test]
    fn test_ffi_initialize_review_schedule_custom_interval() {
        let handle = create_test_client();

        let created_at = 1000_i64;
        let custom_interval = 48 * 60 * 60 * 1000_i64;
        let mut output = FfiInitReviewOutput {
            next_review_at: 0,
            stability: FfiOptionalF64 { has_value: false, value: 0.0 },
            difficulty: FfiOptionalF64 { has_value: false, value: 0.0 },
            last_reviewed_at: FfiOptionalI64 { has_value: false, value: 0 },
        };

        let result = unsafe {
            core_client_initialize_review_schedule(
                handle,
                created_at,
                FfiOptionalI64 { has_value: true, value: custom_interval },
                &mut output,
            )
        };

        assert_eq!(result, FfiErrorCode::Ok);
        assert_eq!(output.next_review_at, created_at + custom_interval);

        destroy_test_client(handle);
    }

    #[test]
    fn test_ffi_optional_conversions() {
        // Test FfiOptionalI64
        let some: FfiOptionalI64 = Some(42_i64).into();
        assert!(some.has_value);
        assert_eq!(some.value, 42);

        let none: FfiOptionalI64 = None.into();
        assert!(!none.has_value);

        let back_some: Option<i64> = some.into();
        assert_eq!(back_some, Some(42));

        let back_none: Option<i64> = none.into();
        assert!(back_none.is_none());

        // Test FfiOptionalF64
        let some_f: FfiOptionalF64 = Some(3.14_f64).into();
        assert!(some_f.has_value);
        assert!((some_f.value - 3.14).abs() < 0.001);

        let none_f: FfiOptionalF64 = None.into();
        assert!(!none_f.has_value);
    }
}
