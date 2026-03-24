mod patches;
mod repository;
mod rows;
mod schema;

pub use repository::{
    add_message, create_conversation, delete_conversation, delete_message,
    get_due_knowledge_items, get_knowledge_item_by_id, list_conversation_messages,
    list_conversations, list_knowledge_items, list_knowledge_items_by_ids,
    list_pending_knowledge_items_for_labeling, list_pending_recommendations,
    list_recent_feedback_events, list_recommendations, list_weekly_knowledge_items,
    log_recommendation_feedback, respond_to_recommendation, save_knowledge_item,
    save_recommendations, update_conversation, update_knowledge_item, update_message,
};
pub use schema::{
    initialize_schema, open_database, open_in_memory, sanitize_knowledge_item_json_columns,
    CREATE_CONVERSATIONS_TABLE_SQL, CREATE_EMBEDDINGS_TABLE_SQL, CREATE_FEEDBACK_EVENTS_TABLE_SQL,
    CREATE_INDEXES_SQL, CREATE_KNOWLEDGE_ITEMS_TABLE_SQL, CREATE_MESSAGES_TABLE_SQL,
    CREATE_RECOMMENDATIONS_TABLE_SQL, DB_NAME,
};
