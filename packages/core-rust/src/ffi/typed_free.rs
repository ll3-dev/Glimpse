//! Typed FFI free helpers for heap-allocated C-compatible values.

use super::{
    FfiConversation, FfiFeedbackEvent, FfiKnowledgeItem, FfiMessage, FfiNullableStringArray,
    FfiRecommendation,
};
use std::ffi::{c_char, c_int, CString};

#[no_mangle]
pub unsafe extern "C" fn ffi_string_array_free(data: *mut *mut c_char, len: c_int) {
    if data.is_null() {
        return;
    }
    let items = Vec::from_raw_parts(data, len as usize, len as usize);
    for item in items {
        if !item.is_null() {
            drop(CString::from_raw(item));
        }
    }
}

unsafe fn free_nullable_string_array(array: FfiNullableStringArray) {
    if !array.data.is_null() {
        ffi_string_array_free(array.data, array.len);
    }
}

#[no_mangle]
pub unsafe extern "C" fn ffi_knowledge_item_free(item: *mut FfiKnowledgeItem) {
    if item.is_null() {
        return;
    }
    let item = &mut *item;
    if !item.id.is_null() {
        drop(CString::from_raw(item.id));
    }
    if !item.item_type.is_null() {
        drop(CString::from_raw(item.item_type));
    }
    if !item.title.value.is_null() {
        drop(CString::from_raw(item.title.value));
    }
    if !item.body.value.is_null() {
        drop(CString::from_raw(item.body.value));
    }
    if !item.url.value.is_null() {
        drop(CString::from_raw(item.url.value));
    }
    if !item.summary.value.is_null() {
        drop(CString::from_raw(item.summary.value));
    }
    free_nullable_string_array(item.tags);
    free_nullable_string_array(item.labels);
    free_nullable_string_array(item.provisional_labels);
    if !item.label_status.value.is_null() {
        drop(CString::from_raw(item.label_status.value));
    }
    if !item.label_source.value.is_null() {
        drop(CString::from_raw(item.label_source.value));
    }
    if !item.label_version.value.is_null() {
        drop(CString::from_raw(item.label_version.value));
    }
    if !item.label_error.value.is_null() {
        drop(CString::from_raw(item.label_error.value));
    }
    *item = FfiKnowledgeItem::default();
}

#[no_mangle]
pub unsafe extern "C" fn ffi_knowledge_item_array_free(data: *mut FfiKnowledgeItem, len: c_int) {
    if data.is_null() {
        return;
    }
    let items = Vec::from_raw_parts(data, len as usize, len as usize);
    for mut item in items {
        ffi_knowledge_item_free(&mut item);
    }
}

#[no_mangle]
pub unsafe extern "C" fn ffi_conversation_free(conversation: *mut FfiConversation) {
    if conversation.is_null() {
        return;
    }
    let conversation = &mut *conversation;
    if !conversation.id.is_null() {
        drop(CString::from_raw(conversation.id));
    }
    if !conversation.title.value.is_null() {
        drop(CString::from_raw(conversation.title.value));
    }
    if !conversation.icon.value.is_null() {
        drop(CString::from_raw(conversation.icon.value));
    }
    if !conversation.context_item_id.value.is_null() {
        drop(CString::from_raw(conversation.context_item_id.value));
    }
    *conversation = FfiConversation::default();
}

#[no_mangle]
pub unsafe extern "C" fn ffi_conversation_array_free(data: *mut FfiConversation, len: c_int) {
    if data.is_null() {
        return;
    }
    let items = Vec::from_raw_parts(data, len as usize, len as usize);
    for mut item in items {
        ffi_conversation_free(&mut item);
    }
}

#[no_mangle]
pub unsafe extern "C" fn ffi_message_free(message: *mut FfiMessage) {
    if message.is_null() {
        return;
    }
    let message = &mut *message;
    if !message.id.is_null() {
        drop(CString::from_raw(message.id));
    }
    if !message.conversation_id.is_null() {
        drop(CString::from_raw(message.conversation_id));
    }
    if !message.role.is_null() {
        drop(CString::from_raw(message.role));
    }
    if !message.content.is_null() {
        drop(CString::from_raw(message.content));
    }
    *message = FfiMessage::default();
}

#[no_mangle]
pub unsafe extern "C" fn ffi_message_array_free(data: *mut FfiMessage, len: c_int) {
    if data.is_null() {
        return;
    }
    let items = Vec::from_raw_parts(data, len as usize, len as usize);
    for mut item in items {
        ffi_message_free(&mut item);
    }
}

#[no_mangle]
pub unsafe extern "C" fn ffi_recommendation_free(recommendation: *mut FfiRecommendation) {
    if recommendation.is_null() {
        return;
    }
    let recommendation = &mut *recommendation;
    if !recommendation.id.is_null() {
        drop(CString::from_raw(recommendation.id));
    }
    if !recommendation.item_a_id.is_null() {
        drop(CString::from_raw(recommendation.item_a_id));
    }
    if !recommendation.item_b_id.is_null() {
        drop(CString::from_raw(recommendation.item_b_id));
    }
    if !recommendation.reason.value.is_null() {
        drop(CString::from_raw(recommendation.reason.value));
    }
    if !recommendation.status.is_null() {
        drop(CString::from_raw(recommendation.status));
    }
    *recommendation = FfiRecommendation::default();
}

#[no_mangle]
pub unsafe extern "C" fn ffi_recommendation_array_free(data: *mut FfiRecommendation, len: c_int) {
    if data.is_null() {
        return;
    }
    let items = Vec::from_raw_parts(data, len as usize, len as usize);
    for mut item in items {
        ffi_recommendation_free(&mut item);
    }
}

#[no_mangle]
pub unsafe extern "C" fn ffi_feedback_event_free(event: *mut FfiFeedbackEvent) {
    if event.is_null() {
        return;
    }
    let event = &mut *event;
    if !event.id.is_null() {
        drop(CString::from_raw(event.id));
    }
    if !event.recommendation_id.is_null() {
        drop(CString::from_raw(event.recommendation_id));
    }
    if !event.action.is_null() {
        drop(CString::from_raw(event.action));
    }
    *event = FfiFeedbackEvent::default();
}

#[no_mangle]
pub unsafe extern "C" fn ffi_feedback_event_array_free(data: *mut FfiFeedbackEvent, len: c_int) {
    if data.is_null() {
        return;
    }
    let items = Vec::from_raw_parts(data, len as usize, len as usize);
    for mut item in items {
        ffi_feedback_event_free(&mut item);
    }
}
