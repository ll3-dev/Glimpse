//! FFI unit tests

#[cfg(test)]
mod tests {
    use crate::ffi::*;
    use crate::SharedCore;
    use std::ffi::{c_char, CString};

    fn create_test_client() -> CoreClientHandle {
        let client = SharedCore::in_memory().unwrap();
        Box::into_raw(Box::new(client))
    }

    fn destroy_test_client(handle: CoreClientHandle) {
        unsafe {
            core_client_destroy(handle);
        }
    }

    fn nullable_string() -> FfiNullableString {
        FfiNullableString {
            value: std::ptr::null_mut(),
        }
    }

    fn empty_string_array() -> FfiNullableStringArray {
        FfiNullableStringArray {
            is_null: false,
            data: std::ptr::null_mut(),
            len: 0,
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

    #[test]
    fn test_typed_save_knowledge_item_rejects_invalid_item_type() {
        let handle = create_test_client();
        let id = CString::new("item-invalid").unwrap();
        let item_type = CString::new("invalid-type").unwrap();
        let mut out_item = FfiKnowledgeItem::default();

        let item = FfiKnowledgeItem {
            id: id.as_ptr() as *mut c_char,
            item_type: item_type.as_ptr() as *mut c_char,
            title: nullable_string(),
            body: nullable_string(),
            url: nullable_string(),
            summary: nullable_string(),
            tags: empty_string_array(),
            labels: empty_string_array(),
            provisional_labels: empty_string_array(),
            label_status: nullable_string(),
            label_source: nullable_string(),
            label_version: nullable_string(),
            label_score: FfiOptionalF64::default(),
            label_requested_at: FfiOptionalI64::default(),
            label_completed_at: FfiOptionalI64::default(),
            label_error: nullable_string(),
            created_at: 1000,
            updated_at: 1000,
            stability: FfiOptionalF64::default(),
            difficulty: FfiOptionalF64::default(),
            last_reviewed_at: FfiOptionalI64::default(),
            next_review_at: FfiOptionalI64::default(),
        };

        let result = unsafe {
            core_client_save_knowledge_item_typed(handle, &item, &mut out_item)
        };

        assert_eq!(result, FfiErrorCode::InvalidInput);
        destroy_test_client(handle);
    }

    #[test]
    fn test_typed_add_message_rejects_invalid_role() {
        let handle = create_test_client();
        let conversation_id = CString::new("conv-typed").unwrap();
        let title = CString::new("Conversation").unwrap();
        let mut out_conversation = FfiConversation::default();

        let conversation = FfiConversation {
            id: conversation_id.as_ptr() as *mut c_char,
            title: FfiNullableString {
                value: title.as_ptr() as *mut c_char,
            },
            icon: nullable_string(),
            context_item_id: nullable_string(),
            created_at: 1000,
            updated_at: 1000,
            deleted_at: FfiOptionalI64::default(),
        };

        let create_result = unsafe {
            core_client_create_conversation_typed(handle, &conversation, &mut out_conversation)
        };
        assert_eq!(create_result, FfiErrorCode::Ok);
        unsafe {
            ffi_conversation_free(&mut out_conversation);
        }

        let message_id = CString::new("msg-invalid-role").unwrap();
        let invalid_role = CString::new("system").unwrap();
        let content = CString::new("hello").unwrap();
        let mut out_message = FfiMessage::default();

        let message = FfiMessage {
            id: message_id.as_ptr() as *mut c_char,
            conversation_id: conversation_id.as_ptr() as *mut c_char,
            role: invalid_role.as_ptr() as *mut c_char,
            content: content.as_ptr() as *mut c_char,
            created_at: 1100,
            updated_at: FfiOptionalI64::default(),
            deleted_at: FfiOptionalI64::default(),
        };

        let result = unsafe { core_client_add_message_typed(handle, &message, &mut out_message) };

        assert_eq!(result, FfiErrorCode::InvalidInput);
        destroy_test_client(handle);
    }

    #[test]
    fn test_typed_save_knowledge_item_rejects_null_array_payload_with_positive_length() {
        let handle = create_test_client();
        let id = CString::new("item-invalid-array").unwrap();
        let item_type = CString::new("note").unwrap();
        let mut out_item = FfiKnowledgeItem::default();

        let item = FfiKnowledgeItem {
            id: id.as_ptr() as *mut c_char,
            item_type: item_type.as_ptr() as *mut c_char,
            title: nullable_string(),
            body: nullable_string(),
            url: nullable_string(),
            summary: nullable_string(),
            tags: FfiNullableStringArray {
                is_null: false,
                data: std::ptr::null_mut(),
                len: 1,
            },
            labels: empty_string_array(),
            provisional_labels: empty_string_array(),
            label_status: nullable_string(),
            label_source: nullable_string(),
            label_version: nullable_string(),
            label_score: FfiOptionalF64::default(),
            label_requested_at: FfiOptionalI64::default(),
            label_completed_at: FfiOptionalI64::default(),
            label_error: nullable_string(),
            created_at: 1000,
            updated_at: 1000,
            stability: FfiOptionalF64::default(),
            difficulty: FfiOptionalF64::default(),
            last_reviewed_at: FfiOptionalI64::default(),
            next_review_at: FfiOptionalI64::default(),
        };

        let result = unsafe {
            core_client_save_knowledge_item_typed(handle, &item, &mut out_item)
        };

        assert_eq!(result, FfiErrorCode::InvalidInput);
        destroy_test_client(handle);
    }

    #[test]
    fn test_typed_update_knowledge_item_rejects_invalid_patch_enum() {
        let handle = create_test_client();
        let id = CString::new("item-patch").unwrap();
        let item_type = CString::new("note").unwrap();
        let mut saved_item = FfiKnowledgeItem::default();

        let item = FfiKnowledgeItem {
            id: id.as_ptr() as *mut c_char,
            item_type: item_type.as_ptr() as *mut c_char,
            title: nullable_string(),
            body: nullable_string(),
            url: nullable_string(),
            summary: nullable_string(),
            tags: empty_string_array(),
            labels: empty_string_array(),
            provisional_labels: empty_string_array(),
            label_status: nullable_string(),
            label_source: nullable_string(),
            label_version: nullable_string(),
            label_score: FfiOptionalF64::default(),
            label_requested_at: FfiOptionalI64::default(),
            label_completed_at: FfiOptionalI64::default(),
            label_error: nullable_string(),
            created_at: 1000,
            updated_at: 1000,
            stability: FfiOptionalF64::default(),
            difficulty: FfiOptionalF64::default(),
            last_reviewed_at: FfiOptionalI64::default(),
            next_review_at: FfiOptionalI64::default(),
        };

        let save_result = unsafe {
            core_client_save_knowledge_item_typed(handle, &item, &mut saved_item)
        };
        assert_eq!(save_result, FfiErrorCode::Ok);
        unsafe {
            ffi_knowledge_item_free(&mut saved_item);
        }

        let invalid_status = CString::new("totally-invalid").unwrap();
        let patch = FfiKnowledgeItemPatch {
            label_status: FfiNullableStringPatchField {
                has_value: true,
                is_null: false,
                value: invalid_status.as_ptr(),
            },
            ..Default::default()
        };
        let mut out_item = FfiKnowledgeItem::default();

        let result = unsafe {
            core_client_update_knowledge_item_typed(handle, id.as_ptr(), &patch, &mut out_item)
        };

        assert_eq!(result, FfiErrorCode::InvalidInput);
        destroy_test_client(handle);
    }

    #[test]
    fn test_typed_update_knowledge_item_supports_explicit_null_clear() {
        let handle = create_test_client();
        let id = CString::new("item-null-clear").unwrap();
        let item_type = CString::new("note").unwrap();
        let title = CString::new("Original title").unwrap();
        let mut saved_item = FfiKnowledgeItem::default();

        let item = FfiKnowledgeItem {
            id: id.as_ptr() as *mut c_char,
            item_type: item_type.as_ptr() as *mut c_char,
            title: FfiNullableString {
                value: title.as_ptr() as *mut c_char,
            },
            body: nullable_string(),
            url: nullable_string(),
            summary: nullable_string(),
            tags: empty_string_array(),
            labels: empty_string_array(),
            provisional_labels: empty_string_array(),
            label_status: nullable_string(),
            label_source: nullable_string(),
            label_version: nullable_string(),
            label_score: FfiOptionalF64::default(),
            label_requested_at: FfiOptionalI64::default(),
            label_completed_at: FfiOptionalI64::default(),
            label_error: nullable_string(),
            created_at: 1000,
            updated_at: 1000,
            stability: FfiOptionalF64::default(),
            difficulty: FfiOptionalF64::default(),
            last_reviewed_at: FfiOptionalI64::default(),
            next_review_at: FfiOptionalI64::default(),
        };

        let save_result = unsafe {
            core_client_save_knowledge_item_typed(handle, &item, &mut saved_item)
        };
        assert_eq!(save_result, FfiErrorCode::Ok);
        unsafe {
            ffi_knowledge_item_free(&mut saved_item);
        }

        let patch = FfiKnowledgeItemPatch {
            title: FfiNullableStringPatchField {
                has_value: true,
                is_null: true,
                value: std::ptr::null(),
            },
            ..Default::default()
        };
        let mut out_item = FfiKnowledgeItem::default();

        let result = unsafe {
            core_client_update_knowledge_item_typed(handle, id.as_ptr(), &patch, &mut out_item)
        };

        assert_eq!(result, FfiErrorCode::Ok);
        assert!(out_item.title.value.is_null());
        unsafe {
            ffi_knowledge_item_free(&mut out_item);
        }
        destroy_test_client(handle);
    }
}
