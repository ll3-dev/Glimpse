mod chat;
mod knowledge;
mod recommendation;

use anyhow::Result;
use rusqlite::{params_from_iter, Connection};
use serde_json::{Map, Value};

use super::patches::{json_value_to_sql, to_column_name, value_ref_from_json};

pub use chat::{
    add_message, create_conversation, delete_conversation, delete_message,
    list_conversation_messages, list_conversations, update_conversation, update_message,
};
pub use knowledge::{
    get_due_knowledge_items, get_knowledge_item_by_id, list_knowledge_items,
    list_knowledge_items_by_ids, list_pending_knowledge_items_for_labeling,
    list_weekly_knowledge_items, save_knowledge_item, update_knowledge_item,
};
pub use recommendation::{
    list_pending_recommendations, list_recent_feedback_events, list_recommendations,
    log_recommendation_feedback, respond_to_recommendation, save_recommendations,
};

fn update_row_from_json_patch(
    conn: &Connection,
    table_name: &str,
    id_column_name: &str,
    id_value: &str,
    patch: &Map<String, Value>,
) -> Result<()> {
    if patch.is_empty() {
        return Ok(());
    }

    let mut assignments = Vec::with_capacity(patch.len());
    let mut params = Vec::with_capacity(patch.len() + 1);

    for (index, (key, value)) in patch.iter().enumerate() {
        assignments.push(format!("{} = ?{}", to_column_name(key), index + 1));
        params.push(json_value_to_sql(value)?);
    }

    params.push(Value::String(String::from(id_value)));

    let sql = format!(
        "UPDATE {table_name} SET {} WHERE {id_column_name} = ?{};",
        assignments.join(", "),
        params.len()
    );

    let sql_values = params.iter().map(value_ref_from_json).collect::<Vec<_>>();
    conn.execute(&sql, params_from_iter(sql_values))?;

    Ok(())
}
