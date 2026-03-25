//! FFI-safe type definitions for bridge transport.

use std::ffi::{c_char, c_int};

/// FFI-safe optional i64 value.
#[repr(C)]
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

/// FFI-safe string pointer with length.
/// Caller owns the allocation and must free it with ffi_string_free.
#[repr(C)]
pub struct FfiString {
    pub data: *mut c_char,
    pub len: c_int,
}

/// FFI-safe string array.
#[repr(C)]
pub struct FfiStringArray {
    pub data: *mut *mut c_char,
    pub len: c_int,
}

/// FFI-safe result type for operations that return an item or null.
#[repr(C)]
pub struct FfiNullableItem {
    pub found: bool,
    pub error_code: c_int,
}

/// FFI error codes matching CoreBridgeError codes.
#[repr(C)]
#[derive(Clone, Copy)]
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
