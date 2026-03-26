//! FFI (Foreign Function Interface) layer for C++ bridge.
//!
//! This module contains FFI-safe types and functions that can be called from C++.
//! All types here are `#[repr(C)]` and use C-compatible layouts.

mod async_ops;
mod error;
mod sync;
#[cfg(test)]
mod tests;
mod typed_ops;
mod types;

pub use async_ops::*;
pub use error::*;
pub use sync::*;
pub use typed_ops::*;
pub use types::*;

use crate::CoreClientImpl;
use std::ffi::{c_char, c_int, CStr};
use std::ptr;

/// Opaque handle to a CoreClient instance.
/// C++ holds this and passes it back to FFI calls.
pub type CoreClientHandle = *mut CoreClientImpl;

/// Creates a new CoreClient with SQLite storage at the given path.
/// Returns null on error.
///
/// # Safety
/// - db_path must be a valid null-terminated UTF-8 string
/// - Caller must eventually call core_client_destroy to free the handle
#[no_mangle]
pub unsafe extern "C" fn core_client_create(db_path: *const c_char) -> CoreClientHandle {
    let path = match CStr::from_ptr(db_path).to_str() {
        Ok(s) => s,
        Err(_) => return ptr::null_mut(),
    };

    match crate::storage::sqlite::SqliteStorage::new(path) {
        Ok(storage) => {
            let client = Box::new(CoreClientImpl::new(storage));
            Box::into_raw(client)
        }
        Err(_) => ptr::null_mut(),
    }
}

/// Destroys a CoreClient handle.
///
/// # Safety
/// - handle must be a valid pointer returned by core_client_create
/// - handle must not be used after this call
#[no_mangle]
pub unsafe extern "C" fn core_client_destroy(handle: CoreClientHandle) {
    if !handle.is_null() {
        drop(Box::from_raw(handle));
    }
}

/**
Returns the last error message for the current thread.
Used for debugging when FFI calls return error codes.

# Safety
- buffer must be valid for buffer_len bytes
- Returns the number of bytes written (excluding null terminator)
*/
#[no_mangle]
pub unsafe extern "C" fn core_client_get_last_error(_buffer: *mut c_char, _buffer_len: c_int) -> c_int {
    // TODO: Implement thread-local error storage for better error messages
    0
}
