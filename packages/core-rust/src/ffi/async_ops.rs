//! Async FFI functions - database operations that return JSON strings.

use super::{CoreClientHandle, FfiErrorCode};
use crate::models::{
    Conversation, ConversationPatch, FeedbackEvent, KnowledgeItem, KnowledgeItemPatch,
    Message, MessagePatch, Recommendation, RecommendationStatus,
};
use std::ffi::{c_char, c_int, CStr, CString};
use std::ptr;

/// Helper to convert C string to Rust string.
unsafe fn c_str_to_string(s: *const c_char) -> Option<String> {
    if s.is_null() {
        return None;
    }
    CStr::from_ptr(s).to_str().ok().map(|s| s.to_string())
}

/// Helper to convert Rust string to C string (caller must free).
fn string_to_c_string(s: String) -> *mut c_char {
    match CString::new(s) {
        Ok(cstr) => cstr.into_raw(),
        Err(_) => ptr::null_mut(),
    }
}

// ============================================================================
// Knowledge Items
// ============================================================================

/// Saves a knowledge item. Returns JSON string of the saved item.
/// Caller must free the returned string with ffi_string_free.
///
/// # Safety
/// - handle must be a valid CoreClientHandle
/// - item_json must be a valid null-terminated UTF-8 string
/// - out_json must be a valid pointer to receive the result
#[no_mangle]
pub unsafe extern "C" fn core_client_save_knowledge_item(
    handle: CoreClientHandle,
    item_json: *const c_char,
    out_json: *mut *mut c_char,
) -> FfiErrorCode {
    if handle.is_null() || item_json.is_null() || out_json.is_null() {
        return FfiErrorCode::InvalidInput;
    }

    let json = match c_str_to_string(item_json) {
        Some(s) => s,
        None => return FfiErrorCode::InvalidInput,
    };

    let item: KnowledgeItem = match serde_json::from_str(&json) {
        Ok(i) => i,
        Err(_) => return FfiErrorCode::InvalidInput,
    };

    let client = &*handle;
    match client.save_knowledge_item(&item) {
        Ok(saved) => {
            match serde_json::to_string(&saved) {
                Ok(json) => {
                    *out_json = string_to_c_string(json);
                    FfiErrorCode::Ok
                }
                Err(_) => FfiErrorCode::Internal,
            }
        }
        Err(e) => FfiErrorCode::from(&e),
    }
}

/// Lists all knowledge items. Returns JSON array string.
/// Caller must free the returned string with ffi_string_free.
#[no_mangle]
pub unsafe extern "C" fn core_client_list_knowledge_items(
    handle: CoreClientHandle,
    out_json: *mut *mut c_char,
) -> FfiErrorCode {
    if handle.is_null() || out_json.is_null() {
        return FfiErrorCode::InvalidInput;
    }

    let client = &*handle;
    match client.list_knowledge_items() {
        Ok(items) => {
            match serde_json::to_string(&items) {
                Ok(json) => {
                    *out_json = string_to_c_string(json);
                    FfiErrorCode::Ok
                }
                Err(_) => FfiErrorCode::Internal,
            }
        }
        Err(e) => FfiErrorCode::from(&e),
    }
}

/// Gets a knowledge item by ID. Returns JSON string or null if not found.
/// Caller must free the returned string with ffi_string_free.
#[no_mangle]
pub unsafe extern "C" fn core_client_get_knowledge_item_by_id(
    handle: CoreClientHandle,
    item_id: *const c_char,
    out_json: *mut *mut c_char,
    out_found: *mut bool,
) -> FfiErrorCode {
    if handle.is_null() || item_id.is_null() || out_json.is_null() || out_found.is_null() {
        return FfiErrorCode::InvalidInput;
    }

    let id = match c_str_to_string(item_id) {
        Some(s) => s,
        None => return FfiErrorCode::InvalidInput,
    };

    let client = &*handle;
    match client.get_knowledge_item_by_id(&id) {
        Ok(Some(item)) => {
            *out_found = true;
            match serde_json::to_string(&item) {
                Ok(json) => {
                    *out_json = string_to_c_string(json);
                    FfiErrorCode::Ok
                }
                Err(_) => FfiErrorCode::Internal,
            }
        }
        Ok(None) => {
            *out_found = false;
            *out_json = ptr::null_mut();
            FfiErrorCode::Ok
        }
        Err(e) => FfiErrorCode::from(&e),
    }
}

/// Updates a knowledge item. Returns JSON string of the updated item.
/// Caller must free the returned string with ffi_string_free.
#[no_mangle]
pub unsafe extern "C" fn core_client_update_knowledge_item(
    handle: CoreClientHandle,
    item_id: *const c_char,
    patch_json: *const c_char,
    out_json: *mut *mut c_char,
) -> FfiErrorCode {
    if handle.is_null() || item_id.is_null() || patch_json.is_null() || out_json.is_null() {
        return FfiErrorCode::InvalidInput;
    }

    let id = match c_str_to_string(item_id) {
        Some(s) => s,
        None => return FfiErrorCode::InvalidInput,
    };

    let json = match c_str_to_string(patch_json) {
        Some(s) => s,
        None => return FfiErrorCode::InvalidInput,
    };

    let patch: KnowledgeItemPatch = match serde_json::from_str(&json) {
        Ok(p) => p,
        Err(_) => return FfiErrorCode::InvalidInput,
    };

    let client = &*handle;
    match client.update_knowledge_item(&id, &patch) {
        Ok(updated) => {
            match serde_json::to_string(&updated) {
                Ok(json) => {
                    *out_json = string_to_c_string(json);
                    FfiErrorCode::Ok
                }
                Err(_) => FfiErrorCode::Internal,
            }
        }
        Err(e) => FfiErrorCode::from(&e),
    }
}

// ============================================================================
// Conversations
// ============================================================================

/// Creates a conversation. Returns JSON string of the created conversation.
#[no_mangle]
pub unsafe extern "C" fn core_client_create_conversation(
    handle: CoreClientHandle,
    conversation_json: *const c_char,
    out_json: *mut *mut c_char,
) -> FfiErrorCode {
    if handle.is_null() || conversation_json.is_null() || out_json.is_null() {
        return FfiErrorCode::InvalidInput;
    }

    let json = match c_str_to_string(conversation_json) {
        Some(s) => s,
        None => return FfiErrorCode::InvalidInput,
    };

    let conversation: Conversation = match serde_json::from_str(&json) {
        Ok(c) => c,
        Err(_) => return FfiErrorCode::InvalidInput,
    };

    let client = &*handle;
    match client.create_conversation(&conversation) {
        Ok(created) => {
            match serde_json::to_string(&created) {
                Ok(json) => {
                    *out_json = string_to_c_string(json);
                    FfiErrorCode::Ok
                }
                Err(_) => FfiErrorCode::Internal,
            }
        }
        Err(e) => FfiErrorCode::from(&e),
    }
}

/// Lists all conversations. Returns JSON array string.
#[no_mangle]
pub unsafe extern "C" fn core_client_list_conversations(
    handle: CoreClientHandle,
    out_json: *mut *mut c_char,
) -> FfiErrorCode {
    if handle.is_null() || out_json.is_null() {
        return FfiErrorCode::InvalidInput;
    }

    let client = &*handle;
    match client.list_conversations() {
        Ok(conversations) => {
            match serde_json::to_string(&conversations) {
                Ok(json) => {
                    *out_json = string_to_c_string(json);
                    FfiErrorCode::Ok
                }
                Err(_) => FfiErrorCode::Internal,
            }
        }
        Err(e) => FfiErrorCode::from(&e),
    }
}

/// Updates a conversation. Returns JSON string of the updated conversation.
#[no_mangle]
pub unsafe extern "C" fn core_client_update_conversation(
    handle: CoreClientHandle,
    conversation_id: *const c_char,
    patch_json: *const c_char,
    out_json: *mut *mut c_char,
) -> FfiErrorCode {
    if handle.is_null() || conversation_id.is_null() || patch_json.is_null() || out_json.is_null()
    {
        return FfiErrorCode::InvalidInput;
    }

    let id = match c_str_to_string(conversation_id) {
        Some(s) => s,
        None => return FfiErrorCode::InvalidInput,
    };

    let json = match c_str_to_string(patch_json) {
        Some(s) => s,
        None => return FfiErrorCode::InvalidInput,
    };

    let patch: ConversationPatch = match serde_json::from_str(&json) {
        Ok(p) => p,
        Err(_) => return FfiErrorCode::InvalidInput,
    };

    let client = &*handle;
    match client.update_conversation(&id, &patch) {
        Ok(updated) => {
            match serde_json::to_string(&updated) {
                Ok(json) => {
                    *out_json = string_to_c_string(json);
                    FfiErrorCode::Ok
                }
                Err(_) => FfiErrorCode::Internal,
            }
        }
        Err(e) => FfiErrorCode::from(&e),
    }
}

/// Deletes a conversation (soft delete).
#[no_mangle]
pub unsafe extern "C" fn core_client_delete_conversation(
    handle: CoreClientHandle,
    conversation_id: *const c_char,
    deleted_at: i64,
) -> FfiErrorCode {
    if handle.is_null() || conversation_id.is_null() {
        return FfiErrorCode::InvalidInput;
    }

    let id = match c_str_to_string(conversation_id) {
        Some(s) => s,
        None => return FfiErrorCode::InvalidInput,
    };

    let client = &*handle;
    match client.delete_conversation(&id, deleted_at) {
        Ok(()) => FfiErrorCode::Ok,
        Err(e) => FfiErrorCode::from(&e),
    }
}

// ============================================================================
// Messages
// ============================================================================

/// Lists messages for a conversation. Returns JSON array string.
#[no_mangle]
pub unsafe extern "C" fn core_client_list_conversation_messages(
    handle: CoreClientHandle,
    conversation_id: *const c_char,
    out_json: *mut *mut c_char,
) -> FfiErrorCode {
    if handle.is_null() || conversation_id.is_null() || out_json.is_null() {
        return FfiErrorCode::InvalidInput;
    }

    let id = match c_str_to_string(conversation_id) {
        Some(s) => s,
        None => return FfiErrorCode::InvalidInput,
    };

    let client = &*handle;
    match client.list_conversation_messages(&id) {
        Ok(messages) => {
            match serde_json::to_string(&messages) {
                Ok(json) => {
                    *out_json = string_to_c_string(json);
                    FfiErrorCode::Ok
                }
                Err(_) => FfiErrorCode::Internal,
            }
        }
        Err(e) => FfiErrorCode::from(&e),
    }
}

/// Adds a message. Returns JSON string of the created message.
#[no_mangle]
pub unsafe extern "C" fn core_client_add_message(
    handle: CoreClientHandle,
    message_json: *const c_char,
    out_json: *mut *mut c_char,
) -> FfiErrorCode {
    if handle.is_null() || message_json.is_null() || out_json.is_null() {
        return FfiErrorCode::InvalidInput;
    }

    let json = match c_str_to_string(message_json) {
        Some(s) => s,
        None => return FfiErrorCode::InvalidInput,
    };

    let message: Message = match serde_json::from_str(&json) {
        Ok(m) => m,
        Err(_) => return FfiErrorCode::InvalidInput,
    };

    let client = &*handle;
    match client.add_message(&message) {
        Ok(created) => {
            match serde_json::to_string(&created) {
                Ok(json) => {
                    *out_json = string_to_c_string(json);
                    FfiErrorCode::Ok
                }
                Err(_) => FfiErrorCode::Internal,
            }
        }
        Err(e) => FfiErrorCode::from(&e),
    }
}

/// Updates a message. Returns JSON string of the updated message.
#[no_mangle]
pub unsafe extern "C" fn core_client_update_message(
    handle: CoreClientHandle,
    message_id: *const c_char,
    patch_json: *const c_char,
    out_json: *mut *mut c_char,
) -> FfiErrorCode {
    if handle.is_null() || message_id.is_null() || patch_json.is_null() || out_json.is_null() {
        return FfiErrorCode::InvalidInput;
    }

    let id = match c_str_to_string(message_id) {
        Some(s) => s,
        None => return FfiErrorCode::InvalidInput,
    };

    let json = match c_str_to_string(patch_json) {
        Some(s) => s,
        None => return FfiErrorCode::InvalidInput,
    };

    let patch: MessagePatch = match serde_json::from_str(&json) {
        Ok(p) => p,
        Err(_) => return FfiErrorCode::InvalidInput,
    };

    let client = &*handle;
    match client.update_message(&id, &patch) {
        Ok(updated) => {
            match serde_json::to_string(&updated) {
                Ok(json) => {
                    *out_json = string_to_c_string(json);
                    FfiErrorCode::Ok
                }
                Err(_) => FfiErrorCode::Internal,
            }
        }
        Err(e) => FfiErrorCode::from(&e),
    }
}

/// Deletes a message (soft delete).
#[no_mangle]
pub unsafe extern "C" fn core_client_delete_message(
    handle: CoreClientHandle,
    message_id: *const c_char,
    deleted_at: i64,
) -> FfiErrorCode {
    if handle.is_null() || message_id.is_null() {
        return FfiErrorCode::InvalidInput;
    }

    let id = match c_str_to_string(message_id) {
        Some(s) => s,
        None => return FfiErrorCode::InvalidInput,
    };

    let client = &*handle;
    match client.delete_message(&id, deleted_at) {
        Ok(()) => FfiErrorCode::Ok,
        Err(e) => FfiErrorCode::from(&e),
    }
}

// ============================================================================
// Recommendations
// ============================================================================

/// Saves recommendations (batch). Takes JSON array string.
#[no_mangle]
pub unsafe extern "C" fn core_client_save_recommendations(
    handle: CoreClientHandle,
    recommendations_json: *const c_char,
) -> FfiErrorCode {
    if handle.is_null() || recommendations_json.is_null() {
        return FfiErrorCode::InvalidInput;
    }

    let json = match c_str_to_string(recommendations_json) {
        Some(s) => s,
        None => return FfiErrorCode::InvalidInput,
    };

    let recommendations: Vec<Recommendation> = match serde_json::from_str(&json) {
        Ok(r) => r,
        Err(_) => return FfiErrorCode::InvalidInput,
    };

    let client = &*handle;
    match client.save_recommendations(&recommendations) {
        Ok(()) => FfiErrorCode::Ok,
        Err(e) => FfiErrorCode::from(&e),
    }
}

/// Lists all recommendations. Returns JSON array string.
#[no_mangle]
pub unsafe extern "C" fn core_client_list_recommendations(
    handle: CoreClientHandle,
    out_json: *mut *mut c_char,
) -> FfiErrorCode {
    if handle.is_null() || out_json.is_null() {
        return FfiErrorCode::InvalidInput;
    }

    let client = &*handle;
    match client.list_recommendations() {
        Ok(recommendations) => {
            match serde_json::to_string(&recommendations) {
                Ok(json) => {
                    *out_json = string_to_c_string(json);
                    FfiErrorCode::Ok
                }
                Err(_) => FfiErrorCode::Internal,
            }
        }
        Err(e) => FfiErrorCode::from(&e),
    }
}

/// Lists pending recommendations. Returns JSON array string.
#[no_mangle]
pub unsafe extern "C" fn core_client_list_pending_recommendations(
    handle: CoreClientHandle,
    out_json: *mut *mut c_char,
) -> FfiErrorCode {
    if handle.is_null() || out_json.is_null() {
        return FfiErrorCode::InvalidInput;
    }

    let client = &*handle;
    match client.list_pending_recommendations() {
        Ok(recommendations) => {
            match serde_json::to_string(&recommendations) {
                Ok(json) => {
                    *out_json = string_to_c_string(json);
                    FfiErrorCode::Ok
                }
                Err(_) => FfiErrorCode::Internal,
            }
        }
        Err(e) => FfiErrorCode::from(&e),
    }
}

/// Responds to a recommendation.
#[no_mangle]
pub unsafe extern "C" fn core_client_respond_to_recommendation(
    handle: CoreClientHandle,
    recommendation_id: *const c_char,
    status: *const c_char,
    feedback_event_json: *const c_char,
) -> FfiErrorCode {
    if handle.is_null()
        || recommendation_id.is_null()
        || status.is_null()
        || feedback_event_json.is_null()
    {
        return FfiErrorCode::InvalidInput;
    }

    let id = match c_str_to_string(recommendation_id) {
        Some(s) => s,
        None => return FfiErrorCode::InvalidInput,
    };

    let status_str = match c_str_to_string(status) {
        Some(s) => s,
        None => return FfiErrorCode::InvalidInput,
    };

    let status = match status_str.as_str() {
        "accepted" => RecommendationStatus::Accepted,
        "ignored" => RecommendationStatus::Ignored,
        "dismissed" => RecommendationStatus::Dismissed,
        _ => return FfiErrorCode::InvalidInput,
    };

    let json = match c_str_to_string(feedback_event_json) {
        Some(s) => s,
        None => return FfiErrorCode::InvalidInput,
    };

    let event: FeedbackEvent = match serde_json::from_str(&json) {
        Ok(e) => e,
        Err(_) => return FfiErrorCode::InvalidInput,
    };

    let client = &*handle;
    match client.respond_to_recommendation(&id, status, &event) {
        Ok(()) => FfiErrorCode::Ok,
        Err(e) => FfiErrorCode::from(&e),
    }
}

// ============================================================================
// Feedback Events
// ============================================================================

/// Lists recent feedback events. Returns JSON array string.
#[no_mangle]
pub unsafe extern "C" fn core_client_list_recent_feedback_events(
    handle: CoreClientHandle,
    limit: c_int,
    out_json: *mut *mut c_char,
) -> FfiErrorCode {
    if handle.is_null() || out_json.is_null() {
        return FfiErrorCode::InvalidInput;
    }

    let client = &*handle;
    match client.list_recent_feedback_events(limit as usize) {
        Ok(events) => {
            match serde_json::to_string(&events) {
                Ok(json) => {
                    *out_json = string_to_c_string(json);
                    FfiErrorCode::Ok
                }
                Err(_) => FfiErrorCode::Internal,
            }
        }
        Err(e) => FfiErrorCode::from(&e),
    }
}

/// Logs recommendation feedback. Returns JSON string of the created event.
#[no_mangle]
pub unsafe extern "C" fn core_client_log_recommendation_feedback(
    handle: CoreClientHandle,
    event_json: *const c_char,
    out_json: *mut *mut c_char,
) -> FfiErrorCode {
    if handle.is_null() || event_json.is_null() || out_json.is_null() {
        return FfiErrorCode::InvalidInput;
    }

    let json = match c_str_to_string(event_json) {
        Some(s) => s,
        None => return FfiErrorCode::InvalidInput,
    };

    let event: FeedbackEvent = match serde_json::from_str(&json) {
        Ok(e) => e,
        Err(_) => return FfiErrorCode::InvalidInput,
    };

    let client = &*handle;
    match client.log_recommendation_feedback(&event) {
        Ok(created) => {
            match serde_json::to_string(&created) {
                Ok(json) => {
                    *out_json = string_to_c_string(json);
                    FfiErrorCode::Ok
                }
                Err(_) => FfiErrorCode::Internal,
            }
        }
        Err(e) => FfiErrorCode::from(&e),
    }
}

// ============================================================================
// Memory Management
// ============================================================================

/// Frees a string allocated by FFI functions.
#[no_mangle]
pub unsafe extern "C" fn ffi_string_free(s: *mut c_char) {
    if !s.is_null() {
        drop(CString::from_raw(s));
    }
}
