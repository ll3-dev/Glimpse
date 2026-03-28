#pragma once

struct SharedCore;

#ifndef GLIMPSE_CORE_FFI_H
#define GLIMPSE_CORE_FFI_H

#pragma once

#include <cstdarg>
#include <cstddef>
#include <cstdint>
#include <cstdlib>
#include <ostream>
#include <new>

/// FFI error codes matching CoreBridgeError codes.
enum class FfiErrorCode {
  FfiErrorCode_Ok = 0,
  FfiErrorCode_InvalidInput = 1,
  FfiErrorCode_NotFound = 2,
  FfiErrorCode_Conflict = 3,
  FfiErrorCode_Database = 4,
  FfiErrorCode_Timeout = 5,
  FfiErrorCode_Cancelled = 6,
  FfiErrorCode_Internal = 7,
};

/// Opaque handle to a CoreClient instance.
/// C++ holds this and passes it back to FFI calls.
using CoreClientHandle = SharedCore*;

/// FFI-safe optional i64 value.
struct FfiOptionalI64 {
  bool has_value;
  int64_t value;
};

/// Output for next review calculation.
struct FfiNextReviewOutput {
  int64_t interval_ms;
  int64_t next_review_at;
};

/// FFI-safe optional f64 value.
struct FfiOptionalF64 {
  bool has_value;
  double value;
};

/// Output for initialize review schedule.
struct FfiInitReviewOutput {
  int64_t next_review_at;
  FfiOptionalF64 stability;
  FfiOptionalF64 difficulty;
  FfiOptionalI64 last_reviewed_at;
};

/// FFI-safe nullable string pointer.
/// Null `value` means null.
struct FfiNullableString {
  char *value;
};

/// FFI-safe nullable string array with null/empty distinction.
struct FfiNullableStringArray {
  bool is_null;
  char **data;
  int len;
};

struct FfiKnowledgeItem {
  char *id;
  char *item_type;
  FfiNullableString title;
  FfiNullableString body;
  FfiNullableString url;
  FfiNullableString summary;
  FfiNullableStringArray tags;
  FfiNullableStringArray labels;
  FfiNullableStringArray provisional_labels;
  FfiNullableString label_status;
  FfiNullableString label_source;
  FfiNullableString label_version;
  FfiOptionalF64 label_score;
  FfiOptionalI64 label_requested_at;
  FfiOptionalI64 label_completed_at;
  FfiNullableString label_error;
  int64_t created_at;
  int64_t updated_at;
  FfiOptionalF64 stability;
  FfiOptionalF64 difficulty;
  FfiOptionalI64 last_reviewed_at;
  FfiOptionalI64 next_review_at;
};

struct FfiConversation {
  char *id;
  FfiNullableString title;
  FfiNullableString icon;
  FfiNullableString context_item_id;
  int64_t created_at;
  int64_t updated_at;
  FfiOptionalI64 deleted_at;
};

struct FfiMessage {
  char *id;
  char *conversation_id;
  char *role;
  char *content;
  int64_t created_at;
  FfiOptionalI64 updated_at;
  FfiOptionalI64 deleted_at;
};

struct FfiRecommendation {
  char *id;
  char *item_a_id;
  char *item_b_id;
  FfiNullableString reason;
  char *status;
  int64_t created_at;
  FfiOptionalI64 responded_at;
};

struct FfiFeedbackEvent {
  char *id;
  char *recommendation_id;
  char *action;
  int64_t created_at;
};

struct FfiCalculateNextReviewOutput {
  int64_t interval_ms;
  int64_t next_review_at;
};

struct FfiInitializeReviewScheduleOutput {
  int64_t next_review_at;
  FfiOptionalF64 stability;
  FfiOptionalF64 difficulty;
  FfiOptionalI64 last_reviewed_at;
};

struct FfiKnowledgeItemArray {
  FfiKnowledgeItem *data;
  int len;
};

/// FFI-safe string patch field.
struct FfiStringPatchField {
  bool has_value;
  const char *value;
};

/// FFI-safe nullable string patch field.
struct FfiNullableStringPatchField {
  bool has_value;
  bool is_null;
  const char *value;
};

/// FFI-safe nullable string array patch field.
struct FfiNullableStringArrayPatchField {
  bool has_value;
  bool is_null;
  const char *const *data;
  int len;
};

/// FFI-safe nullable number patch field.
struct FfiNullableNumberPatchField {
  bool has_value;
  bool is_null;
  double value;
};

/// FFI-safe number patch field.
struct FfiNumberPatchField {
  bool has_value;
  double value;
};

struct FfiKnowledgeItemPatch {
  FfiStringPatchField item_type;
  FfiNullableStringPatchField title;
  FfiNullableStringPatchField body;
  FfiNullableStringPatchField url;
  FfiNullableStringPatchField summary;
  FfiNullableStringArrayPatchField tags;
  FfiNullableStringArrayPatchField labels;
  FfiNullableStringArrayPatchField provisional_labels;
  FfiNullableStringPatchField label_status;
  FfiNullableStringPatchField label_source;
  FfiNullableStringPatchField label_version;
  FfiNullableNumberPatchField label_score;
  FfiNullableNumberPatchField label_requested_at;
  FfiNullableNumberPatchField label_completed_at;
  FfiNullableStringPatchField label_error;
  FfiNumberPatchField updated_at;
  FfiNullableNumberPatchField stability;
  FfiNullableNumberPatchField difficulty;
  FfiNullableNumberPatchField last_reviewed_at;
  FfiNullableNumberPatchField next_review_at;
};

struct FfiConversationArray {
  FfiConversation *data;
  int len;
};

struct FfiConversationPatch {
  FfiNullableStringPatchField title;
  FfiNullableStringPatchField icon;
  FfiNullableStringPatchField context_item_id;
  FfiNumberPatchField updated_at;
  FfiNullableNumberPatchField deleted_at;
};

struct FfiMessageArray {
  FfiMessage *data;
  int len;
};

struct FfiMessagePatch {
  FfiStringPatchField content;
  FfiNullableNumberPatchField updated_at;
  FfiNullableNumberPatchField deleted_at;
};

struct FfiRecommendationArray {
  FfiRecommendation *data;
  int len;
};

struct FfiFeedbackEventArray {
  FfiFeedbackEvent *data;
  int len;
};

extern "C" {

/// Creates a new CoreClient with SQLite storage at the given path.
/// Returns null on error.
///
/// # Safety
/// - db_path must be a valid null-terminated UTF-8 string
/// - Caller must eventually call core_client_destroy to free the handle
CoreClientHandle core_client_create(const char *db_path);

/// Destroys a CoreClient handle.
///
/// # Safety
/// - handle must be a valid pointer returned by core_client_create
/// - handle must not be used after this call
void core_client_destroy(CoreClientHandle handle);

/// Returns the last error message for the current thread. Used for debugging when FFI calls return error codes.
///
///# Safety - buffer must be valid for buffer_len bytes - Returns the number of bytes written (excluding null terminator)
int core_client_get_last_error(char *_buffer,
                               int _buffer_len);

/// Saves a knowledge item. Returns JSON string of the saved item.
/// Caller must free the returned string with ffi_string_free.
///
/// # Safety
/// - handle must be a valid CoreClientHandle
/// - item_json must be a valid null-terminated UTF-8 string
/// - out_json must be a valid pointer to receive the result
FfiErrorCode core_client_save_knowledge_item(CoreClientHandle handle,
                                             const char *item_json,
                                             char **out_json);

/// Lists all knowledge items. Returns JSON array string.
/// Caller must free the returned string with ffi_string_free.
FfiErrorCode core_client_list_knowledge_items(CoreClientHandle handle, char **out_json);

/// Gets a knowledge item by ID. Returns JSON string or null if not found.
/// Caller must free the returned string with ffi_string_free.
FfiErrorCode core_client_get_knowledge_item_by_id(CoreClientHandle handle,
                                                  const char *item_id,
                                                  char **out_json,
                                                  bool *out_found);

/// Updates a knowledge item. Returns JSON string of the updated item.
/// Caller must free the returned string with ffi_string_free.
FfiErrorCode core_client_update_knowledge_item(CoreClientHandle handle,
                                               const char *item_id,
                                               const char *patch_json,
                                               char **out_json);

/// Creates a conversation. Returns JSON string of the created conversation.
FfiErrorCode core_client_create_conversation(CoreClientHandle handle,
                                             const char *conversation_json,
                                             char **out_json);

/// Lists all conversations. Returns JSON array string.
FfiErrorCode core_client_list_conversations(CoreClientHandle handle, char **out_json);

/// Updates a conversation. Returns JSON string of the updated conversation.
FfiErrorCode core_client_update_conversation(CoreClientHandle handle,
                                             const char *conversation_id,
                                             const char *patch_json,
                                             char **out_json);

/// Deletes a conversation (soft delete).
FfiErrorCode core_client_delete_conversation(CoreClientHandle handle,
                                             const char *conversation_id,
                                             int64_t deleted_at);

/// Lists messages for a conversation. Returns JSON array string.
FfiErrorCode core_client_list_conversation_messages(CoreClientHandle handle,
                                                    const char *conversation_id,
                                                    char **out_json);

/// Adds a message. Returns JSON string of the created message.
FfiErrorCode core_client_add_message(CoreClientHandle handle,
                                     const char *message_json,
                                     char **out_json);

/// Updates a message. Returns JSON string of the updated message.
FfiErrorCode core_client_update_message(CoreClientHandle handle,
                                        const char *message_id,
                                        const char *patch_json,
                                        char **out_json);

/// Deletes a message (soft delete).
FfiErrorCode core_client_delete_message(CoreClientHandle handle,
                                        const char *message_id,
                                        int64_t deleted_at);

/// Saves recommendations (batch). Takes JSON array string.
FfiErrorCode core_client_save_recommendations(CoreClientHandle handle,
                                              const char *recommendations_json);

/// Lists all recommendations. Returns JSON array string.
FfiErrorCode core_client_list_recommendations(CoreClientHandle handle, char **out_json);

/// Lists pending recommendations. Returns JSON array string.
FfiErrorCode core_client_list_pending_recommendations(CoreClientHandle handle, char **out_json);

/// Responds to a recommendation.
FfiErrorCode core_client_respond_to_recommendation(CoreClientHandle handle,
                                                   const char *recommendation_id,
                                                   const char *status,
                                                   const char *feedback_event_json);

/// Lists recent feedback events. Returns JSON array string.
FfiErrorCode core_client_list_recent_feedback_events(CoreClientHandle handle,
                                                     int limit,
                                                     char **out_json);

/// Logs recommendation feedback. Returns JSON string of the created event.
FfiErrorCode core_client_log_recommendation_feedback(CoreClientHandle handle,
                                                     const char *event_json,
                                                     char **out_json);

/// Frees a string allocated by FFI functions.
void ffi_string_free(char *s);

/// Calculates tag overlap between two sets of tags.
/// Returns the count of overlapping tags.
///
/// # Safety
/// - handle must be a valid CoreClientHandle
/// - left_tags and right_tags must be valid arrays of null-terminated strings
int core_client_calculate_tag_overlap(CoreClientHandle _handle,
                                      const char *const *left_tags,
                                      int left_tags_len,
                                      const char *const *right_tags,
                                      int right_tags_len);

/// Calculates the next review time based on feedback.
/// These are pure calculations that don't fail - always returns Ok.
///
/// # Safety
/// - handle must be a valid CoreClientHandle
/// - out must be a valid pointer to FfiNextReviewOutput
FfiErrorCode core_client_calculate_next_review(CoreClientHandle handle,
                                               FfiOptionalI64 last_reviewed_at,
                                               FfiOptionalI64 next_review_at,
                                               int8_t feedback_type,
                                               int64_t now,
                                               FfiNextReviewOutput *out);

/// Initializes a review schedule for a new item.
/// These are pure calculations that don't fail - always returns Ok.
///
/// # Safety
/// - handle must be a valid CoreClientHandle
/// - out must be a valid pointer to FfiInitReviewOutput
FfiErrorCode core_client_initialize_review_schedule(CoreClientHandle handle,
                                                    int64_t created_at,
                                                    FfiOptionalI64 interval_ms,
                                                    FfiInitReviewOutput *out);

void ffi_string_array_free(char **data, int len);

void ffi_knowledge_item_free(FfiKnowledgeItem *item);

void ffi_knowledge_item_array_free(FfiKnowledgeItem *data, int len);

void ffi_conversation_free(FfiConversation *conversation);

void ffi_conversation_array_free(FfiConversation *data, int len);

void ffi_message_free(FfiMessage *message);

void ffi_message_array_free(FfiMessage *data, int len);

void ffi_recommendation_free(FfiRecommendation *recommendation);

void ffi_recommendation_array_free(FfiRecommendation *data, int len);

void ffi_feedback_event_free(FfiFeedbackEvent *event);

void ffi_feedback_event_array_free(FfiFeedbackEvent *data, int len);

FfiErrorCode core_client_calculate_next_review_typed(CoreClientHandle handle,
                                                     FfiOptionalI64 last_reviewed_at,
                                                     FfiOptionalI64 next_review_at,
                                                     int8_t feedback_type,
                                                     int64_t now,
                                                     FfiCalculateNextReviewOutput *out);

FfiErrorCode core_client_initialize_review_schedule_typed(CoreClientHandle handle,
                                                          int64_t created_at,
                                                          FfiOptionalI64 interval_ms,
                                                          FfiInitializeReviewScheduleOutput *out);

FfiErrorCode core_client_save_knowledge_item_typed(CoreClientHandle handle,
                                                   const FfiKnowledgeItem *item,
                                                   FfiKnowledgeItem *out_item);

FfiErrorCode core_client_list_knowledge_items_typed(CoreClientHandle handle,
                                                    FfiKnowledgeItemArray *out_items);

FfiErrorCode core_client_get_knowledge_item_by_id_typed(CoreClientHandle handle,
                                                        const char *item_id,
                                                        FfiKnowledgeItem *out_item,
                                                        bool *out_found);

FfiErrorCode core_client_update_knowledge_item_typed(CoreClientHandle handle,
                                                     const char *item_id,
                                                     const FfiKnowledgeItemPatch *patch,
                                                     FfiKnowledgeItem *out_item);

FfiErrorCode core_client_create_conversation_typed(CoreClientHandle handle,
                                                   const FfiConversation *conversation,
                                                   FfiConversation *out_conversation);

FfiErrorCode core_client_list_conversations_typed(CoreClientHandle handle,
                                                  FfiConversationArray *out_conversations);

FfiErrorCode core_client_update_conversation_typed(CoreClientHandle handle,
                                                   const char *conversation_id,
                                                   const FfiConversationPatch *patch,
                                                   FfiConversation *out_conversation);

FfiErrorCode core_client_list_conversation_messages_typed(CoreClientHandle handle,
                                                          const char *conversation_id,
                                                          FfiMessageArray *out_messages);

FfiErrorCode core_client_add_message_typed(CoreClientHandle handle,
                                           const FfiMessage *message,
                                           FfiMessage *out_message);

FfiErrorCode core_client_update_message_typed(CoreClientHandle handle,
                                              const char *message_id,
                                              const FfiMessagePatch *patch,
                                              FfiMessage *out_message);

FfiErrorCode core_client_save_recommendations_typed(CoreClientHandle handle,
                                                    const FfiRecommendation *recommendations,
                                                    int recommendations_len);

FfiErrorCode core_client_list_recommendations_typed(CoreClientHandle handle,
                                                    FfiRecommendationArray *out_recommendations);

FfiErrorCode core_client_list_pending_recommendations_typed(CoreClientHandle handle,
                                                            FfiRecommendationArray *out_recommendations);

FfiErrorCode core_client_respond_to_recommendation_typed(CoreClientHandle handle,
                                                         const char *recommendation_id,
                                                         const char *status,
                                                         const FfiFeedbackEvent *feedback_event);

FfiErrorCode core_client_list_recent_feedback_events_typed(CoreClientHandle handle,
                                                           int limit,
                                                           FfiFeedbackEventArray *out_events);

FfiErrorCode core_client_log_recommendation_feedback_typed(CoreClientHandle handle,
                                                           const FfiFeedbackEvent *event,
                                                           FfiFeedbackEvent *out_event);

}  // extern "C"

#endif  // GLIMPSE_CORE_FFI_H
