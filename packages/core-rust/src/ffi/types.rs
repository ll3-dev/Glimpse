//! FFI-safe type definitions for bridge transport.

use std::ffi::{c_char, c_int};

/// FFI-safe optional i64 value.
#[repr(C)]
#[derive(Clone, Copy, Debug, Default)]
pub struct FfiOptionalI64 {
    pub has_value: bool,
    pub value: i64,
}

impl From<Option<i64>> for FfiOptionalI64 {
    fn from(opt: Option<i64>) -> Self {
        match opt {
            Some(v) => Self { has_value: true, value: v },
            None => Self { has_value: false, value: 0 },
        }
    }
}

impl From<FfiOptionalI64> for Option<i64> {
    fn from(ffi: FfiOptionalI64) -> Self {
        if ffi.has_value { Some(ffi.value) } else { None }
    }
}

/// FFI-safe optional f64 value.
#[repr(C)]
#[derive(Clone, Copy, Debug, Default)]
pub struct FfiOptionalF64 {
    pub has_value: bool,
    pub value: f64,
}

impl From<Option<f64>> for FfiOptionalF64 {
    fn from(opt: Option<f64>) -> Self {
        match opt {
            Some(v) => Self { has_value: true, value: v },
            None => Self { has_value: false, value: 0.0 },
        }
    }
}

impl From<FfiOptionalF64> for Option<f64> {
    fn from(ffi: FfiOptionalF64) -> Self {
        if ffi.has_value { Some(ffi.value) } else { None }
    }
}

/// FFI-safe nullable string pointer.
/// Null `value` means null.
#[repr(C)]
#[derive(Clone, Copy, Debug, Default)]
pub struct FfiNullableString {
    pub value: *mut c_char,
}

/// FFI-safe nullable string array with null/empty distinction.
#[repr(C)]
#[derive(Clone, Copy, Debug, Default)]
pub struct FfiNullableStringArray {
    pub is_null: bool,
    pub data: *mut *mut c_char,
    pub len: c_int,
}

/// FFI-safe string patch field.
#[repr(C)]
#[derive(Clone, Copy, Debug, Default)]
pub struct FfiStringPatchField {
    pub has_value: bool,
    pub value: *const c_char,
}

/// FFI-safe nullable string patch field.
#[repr(C)]
#[derive(Clone, Copy, Debug, Default)]
pub struct FfiNullableStringPatchField {
    pub has_value: bool,
    pub is_null: bool,
    pub value: *const c_char,
}

/// FFI-safe number patch field.
#[repr(C)]
#[derive(Clone, Copy, Debug, Default)]
pub struct FfiNumberPatchField {
    pub has_value: bool,
    pub value: f64,
}

/// FFI-safe nullable number patch field.
#[repr(C)]
#[derive(Clone, Copy, Debug, Default)]
pub struct FfiNullableNumberPatchField {
    pub has_value: bool,
    pub is_null: bool,
    pub value: f64,
}

/// FFI-safe nullable string array patch field.
#[repr(C)]
#[derive(Clone, Copy, Debug, Default)]
pub struct FfiNullableStringArrayPatchField {
    pub has_value: bool,
    pub is_null: bool,
    pub data: *const *const c_char,
    pub len: c_int,
}

#[repr(C)]
#[derive(Clone, Copy, Debug, Default)]
pub struct FfiCalculateNextReviewOutput {
    pub interval_ms: i64,
    pub next_review_at: i64,
}

#[repr(C)]
#[derive(Clone, Copy, Debug, Default)]
pub struct FfiInitializeReviewScheduleOutput {
    pub next_review_at: i64,
    pub stability: FfiOptionalF64,
    pub difficulty: FfiOptionalF64,
    pub last_reviewed_at: FfiOptionalI64,
}

#[repr(C)]
#[derive(Clone, Copy, Debug, Default)]
pub struct FfiKnowledgeItem {
    pub id: *mut c_char,
    pub item_type: *mut c_char,
    pub title: FfiNullableString,
    pub body: FfiNullableString,
    pub url: FfiNullableString,
    pub summary: FfiNullableString,
    pub tags: FfiNullableStringArray,
    pub labels: FfiNullableStringArray,
    pub provisional_labels: FfiNullableStringArray,
    pub label_status: FfiNullableString,
    pub label_source: FfiNullableString,
    pub label_version: FfiNullableString,
    pub label_score: FfiOptionalF64,
    pub label_requested_at: FfiOptionalI64,
    pub label_completed_at: FfiOptionalI64,
    pub label_error: FfiNullableString,
    pub created_at: i64,
    pub updated_at: i64,
    pub stability: FfiOptionalF64,
    pub difficulty: FfiOptionalF64,
    pub last_reviewed_at: FfiOptionalI64,
    pub next_review_at: FfiOptionalI64,
}

#[repr(C)]
#[derive(Clone, Copy, Debug, Default)]
pub struct FfiKnowledgeItemArray {
    pub data: *mut FfiKnowledgeItem,
    pub len: c_int,
}

#[repr(C)]
#[derive(Clone, Copy, Debug, Default)]
pub struct FfiKnowledgeItemPatch {
    pub item_type: FfiStringPatchField,
    pub title: FfiNullableStringPatchField,
    pub body: FfiNullableStringPatchField,
    pub url: FfiNullableStringPatchField,
    pub summary: FfiNullableStringPatchField,
    pub tags: FfiNullableStringArrayPatchField,
    pub labels: FfiNullableStringArrayPatchField,
    pub provisional_labels: FfiNullableStringArrayPatchField,
    pub label_status: FfiNullableStringPatchField,
    pub label_source: FfiNullableStringPatchField,
    pub label_version: FfiNullableStringPatchField,
    pub label_score: FfiNullableNumberPatchField,
    pub label_requested_at: FfiNullableNumberPatchField,
    pub label_completed_at: FfiNullableNumberPatchField,
    pub label_error: FfiNullableStringPatchField,
    pub updated_at: FfiNumberPatchField,
    pub stability: FfiNullableNumberPatchField,
    pub difficulty: FfiNullableNumberPatchField,
    pub last_reviewed_at: FfiNullableNumberPatchField,
    pub next_review_at: FfiNullableNumberPatchField,
}

#[repr(C)]
#[derive(Clone, Copy, Debug, Default)]
pub struct FfiConversation {
    pub id: *mut c_char,
    pub title: FfiNullableString,
    pub icon: FfiNullableString,
    pub context_item_id: FfiNullableString,
    pub created_at: i64,
    pub updated_at: i64,
    pub deleted_at: FfiOptionalI64,
}

#[repr(C)]
#[derive(Clone, Copy, Debug, Default)]
pub struct FfiConversationArray {
    pub data: *mut FfiConversation,
    pub len: c_int,
}

#[repr(C)]
#[derive(Clone, Copy, Debug, Default)]
pub struct FfiConversationPatch {
    pub title: FfiNullableStringPatchField,
    pub icon: FfiNullableStringPatchField,
    pub context_item_id: FfiNullableStringPatchField,
    pub updated_at: FfiNumberPatchField,
    pub deleted_at: FfiNullableNumberPatchField,
}

#[repr(C)]
#[derive(Clone, Copy, Debug, Default)]
pub struct FfiMessage {
    pub id: *mut c_char,
    pub conversation_id: *mut c_char,
    pub role: *mut c_char,
    pub content: *mut c_char,
    pub created_at: i64,
    pub updated_at: FfiOptionalI64,
    pub deleted_at: FfiOptionalI64,
}

#[repr(C)]
#[derive(Clone, Copy, Debug, Default)]
pub struct FfiMessageArray {
    pub data: *mut FfiMessage,
    pub len: c_int,
}

#[repr(C)]
#[derive(Clone, Copy, Debug, Default)]
pub struct FfiMessagePatch {
    pub content: FfiStringPatchField,
    pub updated_at: FfiNullableNumberPatchField,
    pub deleted_at: FfiNullableNumberPatchField,
}

#[repr(C)]
#[derive(Clone, Copy, Debug, Default)]
pub struct FfiRecommendation {
    pub id: *mut c_char,
    pub item_a_id: *mut c_char,
    pub item_b_id: *mut c_char,
    pub reason: FfiNullableString,
    pub status: *mut c_char,
    pub created_at: i64,
    pub responded_at: FfiOptionalI64,
}

#[repr(C)]
#[derive(Clone, Copy, Debug, Default)]
pub struct FfiRecommendationArray {
    pub data: *mut FfiRecommendation,
    pub len: c_int,
}

#[repr(C)]
#[derive(Clone, Copy, Debug, Default)]
pub struct FfiFeedbackEvent {
    pub id: *mut c_char,
    pub recommendation_id: *mut c_char,
    pub action: *mut c_char,
    pub created_at: i64,
}

#[repr(C)]
#[derive(Clone, Copy, Debug, Default)]
pub struct FfiFeedbackEventArray {
    pub data: *mut FfiFeedbackEvent,
    pub len: c_int,
}

/// FFI error codes matching CoreBridgeError codes.
#[repr(C)]
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum FfiErrorCode {
    Ok = 0,
    InvalidInput = 1,
    NotFound = 2,
    Conflict = 3,
    Database = 4,
    Timeout = 5,
    Cancelled = 6,
    Internal = 7,
}

impl From<&crate::Error> for FfiErrorCode {
    fn from(err: &crate::Error) -> Self {
        match err {
            crate::Error::InvalidInput(_) => Self::InvalidInput,
            crate::Error::NotFound(_, _) => Self::NotFound,
            crate::Error::Database(_) => Self::Database,
            crate::Error::Serialization(_) => Self::Internal,
        }
    }
}
