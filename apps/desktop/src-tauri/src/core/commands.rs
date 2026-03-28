use crate::core::CoreState;
use glimpse_core::{
    CalculateNextReviewInput, CalculateNextReviewOutput, CalculateTagOverlapInput, Conversation,
    ConversationPatch, FeedbackEvent, GetDueKnowledgeItemsInput,
    InitializeReviewScheduleInput, InitializeReviewScheduleOutput, KnowledgeItem, KnowledgeItemPatch,
    Message, MessagePatch, Recommendation, RecommendationStatus,
};

// ============================================================================
// Knowledge Items
// ============================================================================

#[tauri::command]
pub fn save_knowledge_item(
    item: KnowledgeItem,
    state: tauri::State<'_, CoreState>,
) -> Result<KnowledgeItem, String> {
    let core = state.core.lock().map_err(|e| e.to_string())?;
    core.save_knowledge_item(&item).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn list_knowledge_items(
    state: tauri::State<'_, CoreState>,
) -> Result<Vec<KnowledgeItem>, String> {
    let core = state.core.lock().map_err(|e| e.to_string())?;
    core.list_knowledge_items().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_knowledge_item_by_id(
    item_id: String,
    state: tauri::State<'_, CoreState>,
) -> Result<Option<KnowledgeItem>, String> {
    let core = state.core.lock().map_err(|e| e.to_string())?;
    core.get_knowledge_item_by_id(&item_id)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn update_knowledge_item(
    item_id: String,
    patch: KnowledgeItemPatch,
    state: tauri::State<'_, CoreState>,
) -> Result<KnowledgeItem, String> {
    let core = state.core.lock().map_err(|e| e.to_string())?;
    core.update_knowledge_item(&item_id, &patch)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn list_knowledge_items_by_ids(
    item_ids: Vec<String>,
    state: tauri::State<'_, CoreState>,
) -> Result<Vec<KnowledgeItem>, String> {
    let core = state.core.lock().map_err(|e| e.to_string())?;
    core.list_knowledge_items_by_ids(&item_ids)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn list_weekly_knowledge_items(
    since: i64,
    state: tauri::State<'_, CoreState>,
) -> Result<Vec<KnowledgeItem>, String> {
    let core = state.core.lock().map_err(|e| e.to_string())?;
    core.list_weekly_knowledge_items(since)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn list_pending_knowledge_items_for_labeling(
    limit: usize,
    state: tauri::State<'_, CoreState>,
) -> Result<Vec<KnowledgeItem>, String> {
    let core = state.core.lock().map_err(|e| e.to_string())?;
    core.list_pending_knowledge_items_for_labeling(limit)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_due_knowledge_items(
    input: GetDueKnowledgeItemsInput,
    state: tauri::State<'_, CoreState>,
) -> Result<Vec<KnowledgeItem>, String> {
    let core = state.core.lock().map_err(|e| e.to_string())?;
    core.get_due_knowledge_items(&input)
        .map_err(|e| e.to_string())
}

// ============================================================================
// Conversations
// ============================================================================

#[tauri::command]
pub fn create_conversation(
    conversation: Conversation,
    state: tauri::State<'_, CoreState>,
) -> Result<Conversation, String> {
    let core = state.core.lock().map_err(|e| e.to_string())?;
    core.create_conversation(&conversation)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn list_conversations(
    state: tauri::State<'_, CoreState>,
) -> Result<Vec<Conversation>, String> {
    let core = state.core.lock().map_err(|e| e.to_string())?;
    core.list_conversations().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn update_conversation(
    conversation_id: String,
    patch: ConversationPatch,
    state: tauri::State<'_, CoreState>,
) -> Result<Conversation, String> {
    let core = state.core.lock().map_err(|e| e.to_string())?;
    core.update_conversation(&conversation_id, &patch)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_conversation(
    conversation_id: String,
    deleted_at: i64,
    state: tauri::State<'_, CoreState>,
) -> Result<(), String> {
    let core = state.core.lock().map_err(|e| e.to_string())?;
    core.delete_conversation(&conversation_id, deleted_at)
        .map_err(|e| e.to_string())
}

// ============================================================================
// Messages
// ============================================================================

#[tauri::command]
pub fn list_conversation_messages(
    conversation_id: String,
    state: tauri::State<'_, CoreState>,
) -> Result<Vec<Message>, String> {
    let core = state.core.lock().map_err(|e| e.to_string())?;
    core.list_conversation_messages(&conversation_id)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn add_message(
    message: Message,
    state: tauri::State<'_, CoreState>,
) -> Result<Message, String> {
    let core = state.core.lock().map_err(|e| e.to_string())?;
    core.add_message(&message).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn update_message(
    message_id: String,
    patch: MessagePatch,
    state: tauri::State<'_, CoreState>,
) -> Result<Message, String> {
    let core = state.core.lock().map_err(|e| e.to_string())?;
    core.update_message(&message_id, &patch)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_message(
    message_id: String,
    deleted_at: i64,
    state: tauri::State<'_, CoreState>,
) -> Result<(), String> {
    let core = state.core.lock().map_err(|e| e.to_string())?;
    core.delete_message(&message_id, deleted_at)
        .map_err(|e| e.to_string())
}

// ============================================================================
// Recommendations
// ============================================================================

#[tauri::command]
pub fn save_recommendations(
    recommendations: Vec<Recommendation>,
    state: tauri::State<'_, CoreState>,
) -> Result<(), String> {
    let core = state.core.lock().map_err(|e| e.to_string())?;
    core.save_recommendations(&recommendations)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn list_recommendations(
    state: tauri::State<'_, CoreState>,
) -> Result<Vec<Recommendation>, String> {
    let core = state.core.lock().map_err(|e| e.to_string())?;
    core.list_recommendations().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn list_pending_recommendations(
    state: tauri::State<'_, CoreState>,
) -> Result<Vec<Recommendation>, String> {
    let core = state.core.lock().map_err(|e| e.to_string())?;
    core.list_pending_recommendations()
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn respond_to_recommendation(
    recommendation_id: String,
    status: RecommendationStatus,
    feedback_event: FeedbackEvent,
    state: tauri::State<'_, CoreState>,
) -> Result<(), String> {
    let core = state.core.lock().map_err(|e| e.to_string())?;
    core.respond_to_recommendation(&recommendation_id, status, &feedback_event)
        .map_err(|e| e.to_string())
}

// ============================================================================
// Feedback
// ============================================================================

#[tauri::command]
pub fn list_recent_feedback_events(
    limit: usize,
    state: tauri::State<'_, CoreState>,
) -> Result<Vec<FeedbackEvent>, String> {
    let core = state.core.lock().map_err(|e| e.to_string())?;
    core.list_recent_feedback_events(limit)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn log_recommendation_feedback(
    event: FeedbackEvent,
    state: tauri::State<'_, CoreState>,
) -> Result<FeedbackEvent, String> {
    let core = state.core.lock().map_err(|e| e.to_string())?;
    core.log_recommendation_feedback(&event)
        .map_err(|e| e.to_string())
}

// ============================================================================
// Review Calculations
// ============================================================================

#[tauri::command]
pub fn calculate_tag_overlap(
    input: CalculateTagOverlapInput,
    state: tauri::State<'_, CoreState>,
) -> Result<i32, String> {
    let core = state.core.lock().map_err(|e| e.to_string())?;
    Ok(core.calculate_tag_overlap(&input))
}

#[tauri::command]
pub fn calculate_next_review(
    input: CalculateNextReviewInput,
    state: tauri::State<'_, CoreState>,
) -> Result<CalculateNextReviewOutput, String> {
    let core = state.core.lock().map_err(|e| e.to_string())?;
    Ok(core.calculate_next_review(&input))
}

#[tauri::command]
pub fn initialize_review_schedule(
    input: InitializeReviewScheduleInput,
    state: tauri::State<'_, CoreState>,
) -> Result<InitializeReviewScheduleOutput, String> {
    let core = state.core.lock().map_err(|e| e.to_string())?;
    Ok(core.initialize_review_schedule(&input))
}
