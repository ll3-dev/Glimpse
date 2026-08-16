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
) -> Result<KnowledgeItem, String> {
    let core = glimpse_bridge::core_state();
    core.save_knowledge_item(&item).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn list_knowledge_items(
) -> Result<Vec<KnowledgeItem>, String> {
    let core = glimpse_bridge::core_state();
    core.list_knowledge_items().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_knowledge_item_by_id(
    item_id: String,
) -> Result<Option<KnowledgeItem>, String> {
    let core = glimpse_bridge::core_state();
    core.get_knowledge_item_by_id(&item_id)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn update_knowledge_item(
    item_id: String,
    patch: KnowledgeItemPatch,
) -> Result<KnowledgeItem, String> {
    let core = glimpse_bridge::core_state();
    core.update_knowledge_item(&item_id, &patch)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn list_knowledge_items_by_ids(
    item_ids: Vec<String>,
) -> Result<Vec<KnowledgeItem>, String> {
    let core = glimpse_bridge::core_state();
    core.list_knowledge_items_by_ids(&item_ids)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn list_weekly_knowledge_items(
    since: i64,
) -> Result<Vec<KnowledgeItem>, String> {
    let core = glimpse_bridge::core_state();
    core.list_weekly_knowledge_items(since)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn list_pending_knowledge_items_for_labeling(
    limit: usize,
) -> Result<Vec<KnowledgeItem>, String> {
    let core = glimpse_bridge::core_state();
    core.list_pending_knowledge_items_for_labeling(limit)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_due_knowledge_items(
    input: GetDueKnowledgeItemsInput,
) -> Result<Vec<KnowledgeItem>, String> {
    let core = glimpse_bridge::core_state();
    core.get_due_knowledge_items(&input)
        .map_err(|e| e.to_string())
}

// ============================================================================
// Conversations
// ============================================================================

#[tauri::command]
pub fn create_conversation(
    conversation: Conversation,
) -> Result<Conversation, String> {
    let core = glimpse_bridge::core_state();
    core.create_conversation(&conversation)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn list_conversations(
) -> Result<Vec<Conversation>, String> {
    let core = glimpse_bridge::core_state();
    core.list_conversations().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn update_conversation(
    conversation_id: String,
    patch: ConversationPatch,
) -> Result<Conversation, String> {
    let core = glimpse_bridge::core_state();
    core.update_conversation(&conversation_id, &patch)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_conversation(
    conversation_id: String,
    deleted_at: i64,
) -> Result<(), String> {
    let core = glimpse_bridge::core_state();
    core.delete_conversation(&conversation_id, deleted_at)
        .map_err(|e| e.to_string())
}

// ============================================================================
// Messages
// ============================================================================

#[tauri::command]
pub fn list_conversation_messages(
    conversation_id: String,
) -> Result<Vec<Message>, String> {
    let core = glimpse_bridge::core_state();
    core.list_conversation_messages(&conversation_id)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn add_message(
    message: Message,
) -> Result<Message, String> {
    let core = glimpse_bridge::core_state();
    core.add_message(&message).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn update_message(
    message_id: String,
    patch: MessagePatch,
) -> Result<Message, String> {
    let core = glimpse_bridge::core_state();
    core.update_message(&message_id, &patch)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_message(
    message_id: String,
    deleted_at: i64,
) -> Result<(), String> {
    let core = glimpse_bridge::core_state();
    core.delete_message(&message_id, deleted_at)
        .map_err(|e| e.to_string())
}

// ============================================================================
// Recommendations
// ============================================================================

#[tauri::command]
pub fn save_recommendations(
    recommendations: Vec<Recommendation>,
) -> Result<(), String> {
    let core = glimpse_bridge::core_state();
    core.save_recommendations(&recommendations)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn list_recommendations(
) -> Result<Vec<Recommendation>, String> {
    let core = glimpse_bridge::core_state();
    core.list_recommendations().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn list_pending_recommendations(
) -> Result<Vec<Recommendation>, String> {
    let core = glimpse_bridge::core_state();
    core.list_pending_recommendations()
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn respond_to_recommendation(
    recommendation_id: String,
    status: RecommendationStatus,
    feedback_event: FeedbackEvent,
) -> Result<(), String> {
    let core = glimpse_bridge::core_state();
    core.respond_to_recommendation(&recommendation_id, status, &feedback_event)
        .map_err(|e| e.to_string())
}

// ============================================================================
// Feedback
// ============================================================================

#[tauri::command]
pub fn list_recent_feedback_events(
    limit: usize,
) -> Result<Vec<FeedbackEvent>, String> {
    let core = glimpse_bridge::core_state();
    core.list_recent_feedback_events(limit)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn log_recommendation_feedback(
    event: FeedbackEvent,
) -> Result<FeedbackEvent, String> {
    let core = glimpse_bridge::core_state();
    core.log_recommendation_feedback(&event)
        .map_err(|e| e.to_string())
}

// ============================================================================
// Review Calculations
// ============================================================================

#[tauri::command]
pub fn calculate_tag_overlap(
    input: CalculateTagOverlapInput,
) -> Result<i32, String> {
    let core = glimpse_bridge::core_state();
    Ok(core.calculate_tag_overlap(&input))
}

#[tauri::command]
pub fn calculate_next_review(
    input: CalculateNextReviewInput,
) -> Result<CalculateNextReviewOutput, String> {
    let core = glimpse_bridge::core_state();
    Ok(core.calculate_next_review(&input))
}

#[tauri::command]
pub fn initialize_review_schedule(
    input: InitializeReviewScheduleInput,
) -> Result<InitializeReviewScheduleOutput, String> {
    let core = glimpse_bridge::core_state();
    Ok(core.initialize_review_schedule(&input))
}
