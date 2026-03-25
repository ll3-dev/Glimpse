//! FFI error handling utilities.

use super::FfiErrorCode;
use std::ffi::c_int;

/// Converts a Rust Result to FFI error code.
pub fn result_to_ffi_code<T, E: std::fmt::Display>(result: &Result<T, E>) -> (FfiErrorCode, c_int) {
    match result {
        Ok(_) => (FfiErrorCode::Ok, 0),
        Err(e) => {
            let code = match e.to_string().as_str() {
                s if s.contains("InvalidInput") => FfiErrorCode::InvalidInput,
                s if s.contains("NotFound") => FfiErrorCode::NotFound,
                s if s.contains("Database") => FfiErrorCode::Database,
                _ => FfiErrorCode::Internal,
            };
            (code, code as c_int)
        }
    }
}
