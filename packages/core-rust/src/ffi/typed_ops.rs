//! Typed FFI functions - structured transport between C++ and Rust.

use super::{
    CoreClientHandle, FfiCalculateNextReviewOutput, FfiConversation, FfiConversationArray,
    FfiConversationPatch, FfiErrorCode, FfiFeedbackEvent, FfiFeedbackEventArray,
    FfiInitializeReviewScheduleOutput, FfiKnowledgeItem, FfiKnowledgeItemArray,
    FfiKnowledgeItemPatch, FfiMessage, FfiMessageArray, FfiMessagePatch, FfiNullableNumberPatchField,
    FfiNullableString, FfiNullableStringArray, FfiNullableStringArrayPatchField,
    FfiNullableStringPatchField, FfiOptionalI64, FfiRecommendation,
    FfiRecommendationArray, FfiStringPatchField,
};
use crate::models::{
    CalculateNextReviewInput, Conversation, ConversationPatch, FeedbackActionType, FeedbackEvent,
    InitializeReviewScheduleInput, KnowledgeItem, KnowledgeItemPatch, KnowledgeItemLabelSource,
    KnowledgeItemLabelStatus, KnowledgeItemType, Message, MessagePatch, MessageRole, Recommendation,
    RecommendationStatus, ReviewFeedbackType,
};
use std::ffi::{c_char, c_int, CStr, CString};
use std::ptr;

unsafe fn c_str_to_string(s: *const c_char) -> Result<String, FfiErrorCode> {
    if s.is_null() {
        return Err(FfiErrorCode::InvalidInput);
    }
    CStr::from_ptr(s)
        .to_str()
        .map(|value| value.to_string())
        .map_err(|_| FfiErrorCode::InvalidInput)
}

fn string_to_c_char(s: String) -> *mut c_char {
    CString::new(s).expect("string should not contain null bytes").into_raw()
}

unsafe fn nullable_string_to_option(input: FfiNullableString) -> Result<Option<String>, FfiErrorCode> {
    if input.value.is_null() {
        Ok(None)
    } else {
        c_str_to_string(input.value.cast_const()).map(Some)
    }
}

fn option_string_to_nullable(value: Option<String>) -> FfiNullableString {
    FfiNullableString {
        value: value.map(string_to_c_char).unwrap_or(ptr::null_mut()),
    }
}

unsafe fn string_array_to_option(
    input: FfiNullableStringArray,
) -> Result<Option<Vec<String>>, FfiErrorCode> {
    if input.is_null {
        return Ok(None);
    }
    if input.len == 0 {
        return Ok(Some(Vec::new()));
    }
    if input.data.is_null() {
        return Err(FfiErrorCode::InvalidInput);
    }

    let mut items = Vec::with_capacity(input.len as usize);
    for index in 0..input.len {
        let ptr = *input.data.add(index as usize);
        items.push(c_str_to_string(ptr.cast_const())?);
    }
    Ok(Some(items))
}

fn option_string_array_to_ffi(value: Option<Vec<String>>) -> FfiNullableStringArray {
    match value {
        None => FfiNullableStringArray {
            is_null: true,
            data: ptr::null_mut(),
            len: 0,
        },
        Some(items) => {
            let mut raw_items = items.into_iter().map(string_to_c_char).collect::<Vec<_>>();
            let len = raw_items.len() as c_int;
            let data = raw_items.as_mut_ptr();
            std::mem::forget(raw_items);
            FfiNullableStringArray {
                is_null: false,
                data,
                len,
            }
        }
    }
}

unsafe fn patch_string_to_option(field: FfiStringPatchField) -> Result<Option<String>, FfiErrorCode> {
    if !field.has_value {
        return Ok(None);
    }
    c_str_to_string(field.value).map(Some)
}

unsafe fn patch_nullable_string_to_option(
    field: FfiNullableStringPatchField,
) -> Result<Option<Option<String>>, FfiErrorCode> {
    if !field.has_value {
        return Ok(None);
    }
    if field.is_null {
        return Ok(Some(None));
    }
    c_str_to_string(field.value).map(|value| Some(Some(value)))
}

fn patch_nullable_number_to_option(field: FfiNullableNumberPatchField) -> Option<Option<f64>> {
    if !field.has_value {
        None
    } else if field.is_null {
        Some(None)
    } else {
        Some(Some(field.value))
    }
}

unsafe fn patch_nullable_string_array_to_option(
    field: FfiNullableStringArrayPatchField,
) -> Result<Option<Option<Vec<String>>>, FfiErrorCode> {
    if !field.has_value {
        return Ok(None);
    }
    if field.is_null {
        return Ok(Some(None));
    }

    if field.len == 0 {
        return Ok(Some(Some(Vec::new())));
    }
    if field.data.is_null() {
        return Err(FfiErrorCode::InvalidInput);
    }

    let mut items = Vec::with_capacity(field.len as usize);
    for index in 0..field.len {
        let ptr = *field.data.add(index as usize);
        items.push(c_str_to_string(ptr)?);
    }
    Ok(Some(Some(items)))
}

fn parse_knowledge_item_type(value: String) -> Result<KnowledgeItemType, FfiErrorCode> {
    match value.as_str() {
        "note" => Ok(KnowledgeItemType::Note),
        "link" => Ok(KnowledgeItemType::Link),
        "highlight" => Ok(KnowledgeItemType::Highlight),
        "screenshot" => Ok(KnowledgeItemType::Screenshot),
        "share" => Ok(KnowledgeItemType::Share),
        _ => Err(FfiErrorCode::InvalidInput),
    }
}

fn parse_label_status(value: String) -> Result<KnowledgeItemLabelStatus, FfiErrorCode> {
    match value.as_str() {
        "idle" => Ok(KnowledgeItemLabelStatus::Idle),
        "pending" => Ok(KnowledgeItemLabelStatus::Pending),
        "provisional" => Ok(KnowledgeItemLabelStatus::Provisional),
        "final" => Ok(KnowledgeItemLabelStatus::Final),
        "failed" => Ok(KnowledgeItemLabelStatus::Failed),
        _ => Err(FfiErrorCode::InvalidInput),
    }
}

fn parse_label_source(value: String) -> Result<KnowledgeItemLabelSource, FfiErrorCode> {
    match value.as_str() {
        "none" => Ok(KnowledgeItemLabelSource::None),
        "rules" => Ok(KnowledgeItemLabelSource::Rules),
        "apple" => Ok(KnowledgeItemLabelSource::Apple),
        "local_small" => Ok(KnowledgeItemLabelSource::LocalSmall),
        "local_full" => Ok(KnowledgeItemLabelSource::LocalFull),
        "stub" => Ok(KnowledgeItemLabelSource::Stub),
        "byok" => Ok(KnowledgeItemLabelSource::Byok),
        _ => Err(FfiErrorCode::InvalidInput),
    }
}

fn parse_message_role(value: String) -> Result<MessageRole, FfiErrorCode> {
    match value.as_str() {
        "user" => Ok(MessageRole::User),
        "assistant" => Ok(MessageRole::Assistant),
        _ => Err(FfiErrorCode::InvalidInput),
    }
}

fn parse_recommendation_status(value: String) -> Result<RecommendationStatus, FfiErrorCode> {
    match value.as_str() {
        "pending" => Ok(RecommendationStatus::Pending),
        "accepted" => Ok(RecommendationStatus::Accepted),
        "ignored" => Ok(RecommendationStatus::Ignored),
        "dismissed" => Ok(RecommendationStatus::Dismissed),
        _ => Err(FfiErrorCode::InvalidInput),
    }
}

fn parse_feedback_action(value: String) -> Result<FeedbackActionType, FfiErrorCode> {
    match value.as_str() {
        "accept" => Ok(FeedbackActionType::Accept),
        "ignore" => Ok(FeedbackActionType::Ignore),
        "dismiss" => Ok(FeedbackActionType::Dismiss),
        _ => Err(FfiErrorCode::InvalidInput),
    }
}

unsafe fn ffi_to_knowledge_item(input: *const FfiKnowledgeItem) -> Result<KnowledgeItem, FfiErrorCode> {
    let item = &*input;
    Ok(KnowledgeItem {
        id: c_str_to_string(item.id.cast_const())?,
        item_type: parse_knowledge_item_type(c_str_to_string(item.item_type.cast_const())?)?,
        title: nullable_string_to_option(item.title)?,
        body: nullable_string_to_option(item.body)?,
        url: nullable_string_to_option(item.url)?,
        summary: nullable_string_to_option(item.summary)?,
        tags: string_array_to_option(item.tags)?,
        labels: string_array_to_option(item.labels)?,
        provisional_labels: string_array_to_option(item.provisional_labels)?,
        label_status: match nullable_string_to_option(item.label_status)? {
            Some(value) => Some(parse_label_status(value)?),
            None => None,
        },
        label_source: match nullable_string_to_option(item.label_source)? {
            Some(value) => Some(parse_label_source(value)?),
            None => None,
        },
        label_version: nullable_string_to_option(item.label_version)?,
        label_score: item.label_score.into(),
        label_requested_at: item.label_requested_at.into(),
        label_completed_at: item.label_completed_at.into(),
        label_error: nullable_string_to_option(item.label_error)?,
        created_at: item.created_at,
        updated_at: item.updated_at,
        stability: item.stability.into(),
        difficulty: item.difficulty.into(),
        last_reviewed_at: item.last_reviewed_at.into(),
        next_review_at: item.next_review_at.into(),
    })
}

fn knowledge_item_to_ffi(item: KnowledgeItem) -> FfiKnowledgeItem {
    FfiKnowledgeItem {
        id: string_to_c_char(item.id),
        item_type: string_to_c_char(format_knowledge_item_type(item.item_type)),
        title: option_string_to_nullable(item.title),
        body: option_string_to_nullable(item.body),
        url: option_string_to_nullable(item.url),
        summary: option_string_to_nullable(item.summary),
        tags: option_string_array_to_ffi(item.tags),
        labels: option_string_array_to_ffi(item.labels),
        provisional_labels: option_string_array_to_ffi(item.provisional_labels),
        label_status: option_string_to_nullable(item.label_status.map(format_label_status)),
        label_source: option_string_to_nullable(item.label_source.map(format_label_source)),
        label_version: option_string_to_nullable(item.label_version),
        label_score: item.label_score.into(),
        label_requested_at: item.label_requested_at.into(),
        label_completed_at: item.label_completed_at.into(),
        label_error: option_string_to_nullable(item.label_error),
        created_at: item.created_at,
        updated_at: item.updated_at,
        stability: item.stability.into(),
        difficulty: item.difficulty.into(),
        last_reviewed_at: item.last_reviewed_at.into(),
        next_review_at: item.next_review_at.into(),
    }
}

unsafe fn ffi_to_conversation(input: *const FfiConversation) -> Result<Conversation, FfiErrorCode> {
    let conversation = &*input;
    Ok(Conversation {
        id: c_str_to_string(conversation.id.cast_const())?,
        title: nullable_string_to_option(conversation.title)?,
        icon: nullable_string_to_option(conversation.icon)?,
        context_item_id: nullable_string_to_option(conversation.context_item_id)?,
        created_at: conversation.created_at,
        updated_at: conversation.updated_at,
        deleted_at: conversation.deleted_at.into(),
    })
}

fn conversation_to_ffi(conversation: Conversation) -> FfiConversation {
    FfiConversation {
        id: string_to_c_char(conversation.id),
        title: option_string_to_nullable(conversation.title),
        icon: option_string_to_nullable(conversation.icon),
        context_item_id: option_string_to_nullable(conversation.context_item_id),
        created_at: conversation.created_at,
        updated_at: conversation.updated_at,
        deleted_at: conversation.deleted_at.into(),
    }
}

unsafe fn ffi_to_message(input: *const FfiMessage) -> Result<Message, FfiErrorCode> {
    let message = &*input;
    Ok(Message {
        id: c_str_to_string(message.id.cast_const())?,
        conversation_id: c_str_to_string(message.conversation_id.cast_const())?,
        role: parse_message_role(c_str_to_string(message.role.cast_const())?)?,
        content: c_str_to_string(message.content.cast_const())?,
        created_at: message.created_at,
        updated_at: message.updated_at.into(),
        deleted_at: message.deleted_at.into(),
    })
}

fn message_to_ffi(message: Message) -> FfiMessage {
    FfiMessage {
        id: string_to_c_char(message.id),
        conversation_id: string_to_c_char(message.conversation_id),
        role: string_to_c_char(format_message_role(message.role)),
        content: string_to_c_char(message.content),
        created_at: message.created_at,
        updated_at: message.updated_at.into(),
        deleted_at: message.deleted_at.into(),
    }
}

unsafe fn ffi_to_recommendation(input: *const FfiRecommendation) -> Result<Recommendation, FfiErrorCode> {
    let recommendation = &*input;
    Ok(Recommendation {
        id: c_str_to_string(recommendation.id.cast_const())?,
        item_a_id: c_str_to_string(recommendation.item_a_id.cast_const())?,
        item_b_id: c_str_to_string(recommendation.item_b_id.cast_const())?,
        reason: nullable_string_to_option(recommendation.reason)?,
        status: parse_recommendation_status(c_str_to_string(recommendation.status.cast_const())?)?,
        created_at: recommendation.created_at,
        responded_at: recommendation.responded_at.into(),
    })
}

fn recommendation_to_ffi(recommendation: Recommendation) -> FfiRecommendation {
    FfiRecommendation {
        id: string_to_c_char(recommendation.id),
        item_a_id: string_to_c_char(recommendation.item_a_id),
        item_b_id: string_to_c_char(recommendation.item_b_id),
        reason: option_string_to_nullable(recommendation.reason),
        status: string_to_c_char(format_recommendation_status(recommendation.status)),
        created_at: recommendation.created_at,
        responded_at: recommendation.responded_at.into(),
    }
}

unsafe fn ffi_to_feedback_event(input: *const FfiFeedbackEvent) -> Result<FeedbackEvent, FfiErrorCode> {
    let event = &*input;
    Ok(FeedbackEvent {
        id: c_str_to_string(event.id.cast_const())?,
        recommendation_id: c_str_to_string(event.recommendation_id.cast_const())?,
        action: parse_feedback_action(c_str_to_string(event.action.cast_const())?)?,
        created_at: event.created_at,
    })
}

fn feedback_event_to_ffi(event: FeedbackEvent) -> FfiFeedbackEvent {
    FfiFeedbackEvent {
        id: string_to_c_char(event.id),
        recommendation_id: string_to_c_char(event.recommendation_id),
        action: string_to_c_char(format_feedback_action(event.action)),
        created_at: event.created_at,
    }
}

unsafe fn ffi_to_knowledge_item_patch(
    patch: *const FfiKnowledgeItemPatch,
) -> Result<KnowledgeItemPatch, FfiErrorCode> {
    let patch = &*patch;
    Ok(KnowledgeItemPatch {
        item_type: match patch_string_to_option(patch.item_type)? {
            Some(value) => Some(parse_knowledge_item_type(value)?),
            None => None,
        },
        title: match patch_nullable_string_to_option(patch.title)? {
            Some(Some(value)) => Some(value),
            _ => None,
        },
        body: match patch_nullable_string_to_option(patch.body)? {
            Some(Some(value)) => Some(value),
            _ => None,
        },
        url: match patch_nullable_string_to_option(patch.url)? {
            Some(Some(value)) => Some(value),
            _ => None,
        },
        summary: match patch_nullable_string_to_option(patch.summary)? {
            Some(Some(value)) => Some(value),
            _ => None,
        },
        tags: match patch_nullable_string_array_to_option(patch.tags)? {
            Some(Some(value)) => Some(value),
            _ => None,
        },
        labels: match patch_nullable_string_array_to_option(patch.labels)? {
            Some(Some(value)) => Some(value),
            _ => None,
        },
        provisional_labels: match patch_nullable_string_array_to_option(patch.provisional_labels)? {
            Some(Some(value)) => Some(value),
            _ => None,
        },
        label_status: match patch_nullable_string_to_option(patch.label_status)? {
            Some(Some(value)) => Some(parse_label_status(value)?),
            None => None,
            Some(None) => None,
        },
        label_source: match patch_nullable_string_to_option(patch.label_source)? {
            Some(Some(value)) => Some(parse_label_source(value)?),
            None => None,
            Some(None) => None,
        },
        label_version: match patch_nullable_string_to_option(patch.label_version)? {
            Some(Some(value)) => Some(value),
            _ => None,
        },
        label_score: match patch_nullable_number_to_option(patch.label_score) {
            Some(Some(value)) => Some(value),
            _ => None,
        },
        label_requested_at: match patch_nullable_number_to_option(patch.label_requested_at) {
            Some(Some(value)) => Some(value as i64),
            _ => None,
        },
        label_completed_at: match patch_nullable_number_to_option(patch.label_completed_at) {
            Some(Some(value)) => Some(value as i64),
            _ => None,
        },
        label_error: match patch_nullable_string_to_option(patch.label_error)? {
            Some(Some(value)) => Some(value),
            _ => None,
        },
        updated_at: if patch.updated_at.has_value {
            Some(patch.updated_at.value as i64)
        } else {
            None
        },
        stability: match patch_nullable_number_to_option(patch.stability) {
            Some(Some(value)) => Some(value),
            _ => None,
        },
        difficulty: match patch_nullable_number_to_option(patch.difficulty) {
            Some(Some(value)) => Some(value),
            _ => None,
        },
        last_reviewed_at: match patch_nullable_number_to_option(patch.last_reviewed_at) {
            Some(Some(value)) => Some(value as i64),
            _ => None,
        },
        next_review_at: match patch_nullable_number_to_option(patch.next_review_at) {
            Some(Some(value)) => Some(value as i64),
            _ => None,
        },
    })
}

unsafe fn ffi_to_conversation_patch(
    patch: *const FfiConversationPatch,
) -> Result<ConversationPatch, FfiErrorCode> {
    let patch = &*patch;
    Ok(ConversationPatch {
        title: match patch_nullable_string_to_option(patch.title)? {
            Some(Some(value)) => Some(value),
            _ => None,
        },
        icon: match patch_nullable_string_to_option(patch.icon)? {
            Some(Some(value)) => Some(value),
            _ => None,
        },
        context_item_id: match patch_nullable_string_to_option(patch.context_item_id)? {
            Some(Some(value)) => Some(value),
            _ => None,
        },
        updated_at: if patch.updated_at.has_value {
            Some(patch.updated_at.value as i64)
        } else {
            None
        },
        deleted_at: match patch_nullable_number_to_option(patch.deleted_at) {
            Some(Some(value)) => Some(value as i64),
            _ => None,
        },
    })
}

unsafe fn ffi_to_message_patch(patch: *const FfiMessagePatch) -> Result<MessagePatch, FfiErrorCode> {
    let patch = &*patch;
    Ok(MessagePatch {
        content: patch_string_to_option(patch.content)?,
        updated_at: match patch_nullable_number_to_option(patch.updated_at) {
            Some(Some(value)) => Some(value as i64),
            _ => None,
        },
        deleted_at: match patch_nullable_number_to_option(patch.deleted_at) {
            Some(Some(value)) => Some(value as i64),
            _ => None,
        },
    })
}

fn format_knowledge_item_type(value: KnowledgeItemType) -> String {
    match value {
        KnowledgeItemType::Note => "note",
        KnowledgeItemType::Link => "link",
        KnowledgeItemType::Highlight => "highlight",
        KnowledgeItemType::Screenshot => "screenshot",
        KnowledgeItemType::Share => "share",
    }
    .to_string()
}

fn format_label_status(value: KnowledgeItemLabelStatus) -> String {
    match value {
        KnowledgeItemLabelStatus::Idle => "idle",
        KnowledgeItemLabelStatus::Pending => "pending",
        KnowledgeItemLabelStatus::Provisional => "provisional",
        KnowledgeItemLabelStatus::Final => "final",
        KnowledgeItemLabelStatus::Failed => "failed",
    }
    .to_string()
}

fn format_label_source(value: KnowledgeItemLabelSource) -> String {
    match value {
        KnowledgeItemLabelSource::None => "none",
        KnowledgeItemLabelSource::Rules => "rules",
        KnowledgeItemLabelSource::Apple => "apple",
        KnowledgeItemLabelSource::LocalSmall => "local_small",
        KnowledgeItemLabelSource::LocalFull => "local_full",
        KnowledgeItemLabelSource::Stub => "stub",
        KnowledgeItemLabelSource::Byok => "byok",
    }
    .to_string()
}

fn format_message_role(value: MessageRole) -> String {
    match value {
        MessageRole::User => "user",
        MessageRole::Assistant => "assistant",
    }
    .to_string()
}

fn format_recommendation_status(value: RecommendationStatus) -> String {
    match value {
        RecommendationStatus::Pending => "pending",
        RecommendationStatus::Accepted => "accepted",
        RecommendationStatus::Ignored => "ignored",
        RecommendationStatus::Dismissed => "dismissed",
    }
    .to_string()
}

fn format_feedback_action(value: FeedbackActionType) -> String {
    match value {
        FeedbackActionType::Accept => "accept",
        FeedbackActionType::Ignore => "ignore",
        FeedbackActionType::Dismiss => "dismiss",
    }
    .to_string()
}

unsafe fn fill_ffi_array<T, F>(items: Vec<T>, out_data: *mut *mut F, out_len: *mut c_int, map: impl Fn(T) -> F) {
    let mut ffi_items = items.into_iter().map(map).collect::<Vec<_>>();
    *out_len = ffi_items.len() as c_int;
    *out_data = ffi_items.as_mut_ptr();
    std::mem::forget(ffi_items);
}

#[no_mangle]
pub unsafe extern "C" fn core_client_calculate_next_review_typed(
    handle: CoreClientHandle,
    last_reviewed_at: FfiOptionalI64,
    next_review_at: FfiOptionalI64,
    feedback_type: i8,
    now: i64,
    out: *mut FfiCalculateNextReviewOutput,
) -> FfiErrorCode {
    if handle.is_null() || out.is_null() {
        return FfiErrorCode::InvalidInput;
    }

    let client = &*handle;
    let input = CalculateNextReviewInput {
        last_reviewed_at: last_reviewed_at.into(),
        next_review_at: next_review_at.into(),
        feedback_type: if feedback_type == 0 {
            ReviewFeedbackType::Remembered
        } else {
            ReviewFeedbackType::Postponed
        },
        now,
    };
    let result = client.calculate_next_review(&input);
    (*out).interval_ms = result.interval_ms;
    (*out).next_review_at = result.next_review_at;
    FfiErrorCode::Ok
}

#[no_mangle]
pub unsafe extern "C" fn core_client_initialize_review_schedule_typed(
    handle: CoreClientHandle,
    created_at: i64,
    interval_ms: FfiOptionalI64,
    out: *mut FfiInitializeReviewScheduleOutput,
) -> FfiErrorCode {
    if handle.is_null() || out.is_null() {
        return FfiErrorCode::InvalidInput;
    }
    let client = &*handle;
    let result = client.initialize_review_schedule(&InitializeReviewScheduleInput {
        created_at,
        interval_ms: interval_ms.into(),
    });
    (*out).next_review_at = result.next_review_at;
    (*out).stability = result.stability.into();
    (*out).difficulty = result.difficulty.into();
    (*out).last_reviewed_at = result.last_reviewed_at.into();
    FfiErrorCode::Ok
}

#[no_mangle]
pub unsafe extern "C" fn core_client_save_knowledge_item_typed(
    handle: CoreClientHandle,
    item: *const FfiKnowledgeItem,
    out_item: *mut FfiKnowledgeItem,
) -> FfiErrorCode {
    if handle.is_null() || item.is_null() || out_item.is_null() {
        return FfiErrorCode::InvalidInput;
    }
    let input = match ffi_to_knowledge_item(item) {
        Ok(value) => value,
        Err(err) => return err,
    };
    let client = &*handle;
    match client.save_knowledge_item(&input) {
        Ok(saved) => {
            *out_item = knowledge_item_to_ffi(saved);
            FfiErrorCode::Ok
        }
        Err(err) => FfiErrorCode::from(&err),
    }
}

#[no_mangle]
pub unsafe extern "C" fn core_client_list_knowledge_items_typed(
    handle: CoreClientHandle,
    out_items: *mut FfiKnowledgeItemArray,
) -> FfiErrorCode {
    if handle.is_null() || out_items.is_null() {
        return FfiErrorCode::InvalidInput;
    }
    let client = &*handle;
    match client.list_knowledge_items() {
        Ok(items) => {
            fill_ffi_array(items, &mut (*out_items).data, &mut (*out_items).len, knowledge_item_to_ffi);
            FfiErrorCode::Ok
        }
        Err(err) => FfiErrorCode::from(&err),
    }
}

#[no_mangle]
pub unsafe extern "C" fn core_client_get_knowledge_item_by_id_typed(
    handle: CoreClientHandle,
    item_id: *const c_char,
    out_item: *mut FfiKnowledgeItem,
    out_found: *mut bool,
) -> FfiErrorCode {
    if handle.is_null() || item_id.is_null() || out_item.is_null() || out_found.is_null() {
        return FfiErrorCode::InvalidInput;
    }
    let client = &*handle;
    let id = match c_str_to_string(item_id) {
        Ok(value) => value,
        Err(err) => return err,
    };
    match client.get_knowledge_item_by_id(&id) {
        Ok(Some(item)) => {
            *out_found = true;
            *out_item = knowledge_item_to_ffi(item);
            FfiErrorCode::Ok
        }
        Ok(None) => {
            *out_found = false;
            FfiErrorCode::Ok
        }
        Err(err) => FfiErrorCode::from(&err),
    }
}

#[no_mangle]
pub unsafe extern "C" fn core_client_update_knowledge_item_typed(
    handle: CoreClientHandle,
    item_id: *const c_char,
    patch: *const FfiKnowledgeItemPatch,
    out_item: *mut FfiKnowledgeItem,
) -> FfiErrorCode {
    if handle.is_null() || item_id.is_null() || patch.is_null() || out_item.is_null() {
        return FfiErrorCode::InvalidInput;
    }
    let client = &*handle;
    let id = match c_str_to_string(item_id) {
        Ok(value) => value,
        Err(err) => return err,
    };
    let patch = match ffi_to_knowledge_item_patch(patch) {
        Ok(value) => value,
        Err(err) => return err,
    };
    match client.update_knowledge_item(&id, &patch) {
        Ok(item) => {
            *out_item = knowledge_item_to_ffi(item);
            FfiErrorCode::Ok
        }
        Err(err) => FfiErrorCode::from(&err),
    }
}

#[no_mangle]
pub unsafe extern "C" fn core_client_create_conversation_typed(
    handle: CoreClientHandle,
    conversation: *const FfiConversation,
    out_conversation: *mut FfiConversation,
) -> FfiErrorCode {
    if handle.is_null() || conversation.is_null() || out_conversation.is_null() {
        return FfiErrorCode::InvalidInput;
    }
    let client = &*handle;
    let conversation = match ffi_to_conversation(conversation) {
        Ok(value) => value,
        Err(err) => return err,
    };
    match client.create_conversation(&conversation) {
        Ok(saved) => {
            *out_conversation = conversation_to_ffi(saved);
            FfiErrorCode::Ok
        }
        Err(err) => FfiErrorCode::from(&err),
    }
}

#[no_mangle]
pub unsafe extern "C" fn core_client_list_conversations_typed(
    handle: CoreClientHandle,
    out_conversations: *mut FfiConversationArray,
) -> FfiErrorCode {
    if handle.is_null() || out_conversations.is_null() {
        return FfiErrorCode::InvalidInput;
    }
    let client = &*handle;
    match client.list_conversations() {
        Ok(conversations) => {
            fill_ffi_array(
                conversations,
                &mut (*out_conversations).data,
                &mut (*out_conversations).len,
                conversation_to_ffi,
            );
            FfiErrorCode::Ok
        }
        Err(err) => FfiErrorCode::from(&err),
    }
}

#[no_mangle]
pub unsafe extern "C" fn core_client_update_conversation_typed(
    handle: CoreClientHandle,
    conversation_id: *const c_char,
    patch: *const FfiConversationPatch,
    out_conversation: *mut FfiConversation,
) -> FfiErrorCode {
    if handle.is_null() || conversation_id.is_null() || patch.is_null() || out_conversation.is_null() {
        return FfiErrorCode::InvalidInput;
    }
    let client = &*handle;
    let id = match c_str_to_string(conversation_id) {
        Ok(value) => value,
        Err(err) => return err,
    };
    let patch = match ffi_to_conversation_patch(patch) {
        Ok(value) => value,
        Err(err) => return err,
    };
    match client.update_conversation(&id, &patch) {
        Ok(conversation) => {
            *out_conversation = conversation_to_ffi(conversation);
            FfiErrorCode::Ok
        }
        Err(err) => FfiErrorCode::from(&err),
    }
}

#[no_mangle]
pub unsafe extern "C" fn core_client_list_conversation_messages_typed(
    handle: CoreClientHandle,
    conversation_id: *const c_char,
    out_messages: *mut FfiMessageArray,
) -> FfiErrorCode {
    if handle.is_null() || conversation_id.is_null() || out_messages.is_null() {
        return FfiErrorCode::InvalidInput;
    }
    let client = &*handle;
    let id = match c_str_to_string(conversation_id) {
        Ok(value) => value,
        Err(err) => return err,
    };
    match client.list_conversation_messages(&id) {
        Ok(messages) => {
            fill_ffi_array(messages, &mut (*out_messages).data, &mut (*out_messages).len, message_to_ffi);
            FfiErrorCode::Ok
        }
        Err(err) => FfiErrorCode::from(&err),
    }
}

#[no_mangle]
pub unsafe extern "C" fn core_client_add_message_typed(
    handle: CoreClientHandle,
    message: *const FfiMessage,
    out_message: *mut FfiMessage,
) -> FfiErrorCode {
    if handle.is_null() || message.is_null() || out_message.is_null() {
        return FfiErrorCode::InvalidInput;
    }
    let client = &*handle;
    let message = match ffi_to_message(message) {
        Ok(value) => value,
        Err(err) => return err,
    };
    match client.add_message(&message) {
        Ok(saved) => {
            *out_message = message_to_ffi(saved);
            FfiErrorCode::Ok
        }
        Err(err) => FfiErrorCode::from(&err),
    }
}

#[no_mangle]
pub unsafe extern "C" fn core_client_update_message_typed(
    handle: CoreClientHandle,
    message_id: *const c_char,
    patch: *const FfiMessagePatch,
    out_message: *mut FfiMessage,
) -> FfiErrorCode {
    if handle.is_null() || message_id.is_null() || patch.is_null() || out_message.is_null() {
        return FfiErrorCode::InvalidInput;
    }
    let client = &*handle;
    let id = match c_str_to_string(message_id) {
        Ok(value) => value,
        Err(err) => return err,
    };
    let patch = match ffi_to_message_patch(patch) {
        Ok(value) => value,
        Err(err) => return err,
    };
    match client.update_message(&id, &patch) {
        Ok(message) => {
            *out_message = message_to_ffi(message);
            FfiErrorCode::Ok
        }
        Err(err) => FfiErrorCode::from(&err),
    }
}

#[no_mangle]
pub unsafe extern "C" fn core_client_save_recommendations_typed(
    handle: CoreClientHandle,
    recommendations: *const FfiRecommendation,
    recommendations_len: c_int,
) -> FfiErrorCode {
    if handle.is_null() {
        return FfiErrorCode::InvalidInput;
    }
    let client = &*handle;
    let mut items = Vec::with_capacity(recommendations_len.max(0) as usize);
    for index in 0..recommendations_len {
        items.push(match ffi_to_recommendation(recommendations.add(index as usize)) {
            Ok(value) => value,
            Err(err) => return err,
        });
    }
    match client.save_recommendations(&items) {
        Ok(()) => FfiErrorCode::Ok,
        Err(err) => FfiErrorCode::from(&err),
    }
}

#[no_mangle]
pub unsafe extern "C" fn core_client_list_recommendations_typed(
    handle: CoreClientHandle,
    out_recommendations: *mut FfiRecommendationArray,
) -> FfiErrorCode {
    if handle.is_null() || out_recommendations.is_null() {
        return FfiErrorCode::InvalidInput;
    }
    let client = &*handle;
    match client.list_recommendations() {
        Ok(items) => {
            fill_ffi_array(
                items,
                &mut (*out_recommendations).data,
                &mut (*out_recommendations).len,
                recommendation_to_ffi,
            );
            FfiErrorCode::Ok
        }
        Err(err) => FfiErrorCode::from(&err),
    }
}

#[no_mangle]
pub unsafe extern "C" fn core_client_list_pending_recommendations_typed(
    handle: CoreClientHandle,
    out_recommendations: *mut FfiRecommendationArray,
) -> FfiErrorCode {
    if handle.is_null() || out_recommendations.is_null() {
        return FfiErrorCode::InvalidInput;
    }
    let client = &*handle;
    match client.list_pending_recommendations() {
        Ok(items) => {
            fill_ffi_array(
                items,
                &mut (*out_recommendations).data,
                &mut (*out_recommendations).len,
                recommendation_to_ffi,
            );
            FfiErrorCode::Ok
        }
        Err(err) => FfiErrorCode::from(&err),
    }
}

#[no_mangle]
pub unsafe extern "C" fn core_client_respond_to_recommendation_typed(
    handle: CoreClientHandle,
    recommendation_id: *const c_char,
    status: *const c_char,
    feedback_event: *const FfiFeedbackEvent,
) -> FfiErrorCode {
    if handle.is_null() || recommendation_id.is_null() || status.is_null() || feedback_event.is_null() {
        return FfiErrorCode::InvalidInput;
    }
    let client = &*handle;
    let recommendation_id = match c_str_to_string(recommendation_id) {
        Ok(value) => value,
        Err(err) => return err,
    };
    let status = match c_str_to_string(status) {
        Ok(value) => value,
        Err(err) => return err,
    };
    let status = match parse_recommendation_status(status) {
        Ok(value) => value,
        Err(err) => return err,
    };
    let feedback_event = match ffi_to_feedback_event(feedback_event) {
        Ok(value) => value,
        Err(err) => return err,
    };
    match client.respond_to_recommendation(&recommendation_id, status, &feedback_event) {
        Ok(()) => FfiErrorCode::Ok,
        Err(err) => FfiErrorCode::from(&err),
    }
}

#[no_mangle]
pub unsafe extern "C" fn core_client_list_recent_feedback_events_typed(
    handle: CoreClientHandle,
    limit: c_int,
    out_events: *mut FfiFeedbackEventArray,
) -> FfiErrorCode {
    if handle.is_null() || out_events.is_null() {
        return FfiErrorCode::InvalidInput;
    }
    let client = &*handle;
    match client.list_recent_feedback_events(limit as usize) {
        Ok(events) => {
            fill_ffi_array(events, &mut (*out_events).data, &mut (*out_events).len, feedback_event_to_ffi);
            FfiErrorCode::Ok
        }
        Err(err) => FfiErrorCode::from(&err),
    }
}

#[no_mangle]
pub unsafe extern "C" fn core_client_log_recommendation_feedback_typed(
    handle: CoreClientHandle,
    event: *const FfiFeedbackEvent,
    out_event: *mut FfiFeedbackEvent,
) -> FfiErrorCode {
    if handle.is_null() || event.is_null() || out_event.is_null() {
        return FfiErrorCode::InvalidInput;
    }
    let client = &*handle;
    let event = match ffi_to_feedback_event(event) {
        Ok(value) => value,
        Err(err) => return err,
    };
    match client.log_recommendation_feedback(&event) {
        Ok(saved) => {
            *out_event = feedback_event_to_ffi(saved);
            FfiErrorCode::Ok
        }
        Err(err) => FfiErrorCode::from(&err),
    }
}

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
    if !item.id.is_null() { drop(CString::from_raw(item.id)); }
    if !item.item_type.is_null() { drop(CString::from_raw(item.item_type)); }
    if !item.title.value.is_null() { drop(CString::from_raw(item.title.value)); }
    if !item.body.value.is_null() { drop(CString::from_raw(item.body.value)); }
    if !item.url.value.is_null() { drop(CString::from_raw(item.url.value)); }
    if !item.summary.value.is_null() { drop(CString::from_raw(item.summary.value)); }
    free_nullable_string_array(item.tags);
    free_nullable_string_array(item.labels);
    free_nullable_string_array(item.provisional_labels);
    if !item.label_status.value.is_null() { drop(CString::from_raw(item.label_status.value)); }
    if !item.label_source.value.is_null() { drop(CString::from_raw(item.label_source.value)); }
    if !item.label_version.value.is_null() { drop(CString::from_raw(item.label_version.value)); }
    if !item.label_error.value.is_null() { drop(CString::from_raw(item.label_error.value)); }
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
    if !conversation.id.is_null() { drop(CString::from_raw(conversation.id)); }
    if !conversation.title.value.is_null() { drop(CString::from_raw(conversation.title.value)); }
    if !conversation.icon.value.is_null() { drop(CString::from_raw(conversation.icon.value)); }
    if !conversation.context_item_id.value.is_null() { drop(CString::from_raw(conversation.context_item_id.value)); }
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
    if !message.id.is_null() { drop(CString::from_raw(message.id)); }
    if !message.conversation_id.is_null() { drop(CString::from_raw(message.conversation_id)); }
    if !message.role.is_null() { drop(CString::from_raw(message.role)); }
    if !message.content.is_null() { drop(CString::from_raw(message.content)); }
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
    if !recommendation.id.is_null() { drop(CString::from_raw(recommendation.id)); }
    if !recommendation.item_a_id.is_null() { drop(CString::from_raw(recommendation.item_a_id)); }
    if !recommendation.item_b_id.is_null() { drop(CString::from_raw(recommendation.item_b_id)); }
    if !recommendation.reason.value.is_null() { drop(CString::from_raw(recommendation.reason.value)); }
    if !recommendation.status.is_null() { drop(CString::from_raw(recommendation.status)); }
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
    if !event.id.is_null() { drop(CString::from_raw(event.id)); }
    if !event.recommendation_id.is_null() { drop(CString::from_raw(event.recommendation_id)); }
    if !event.action.is_null() { drop(CString::from_raw(event.action)); }
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
