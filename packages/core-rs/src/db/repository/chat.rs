use anyhow::{anyhow, Result};
use rusqlite::{params, Connection, OptionalExtension};
use serde_json::{Map, Value};

use crate::models::{Conversation, Message};

use super::update_row_from_json_patch;
use crate::db::rows::{collect_rows, map_conversation_row, map_message_row, to_message_role};

pub fn create_conversation(conn: &Connection, conversation: &Conversation) -> Result<Conversation> {
    conn.execute(
        "INSERT INTO conversations (id, title, icon, context_item_id, created_at, updated_at, deleted_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7);",
        params![
            conversation.id,
            conversation.title,
            conversation.icon,
            conversation.context_item_id,
            conversation.created_at as f64,
            conversation.updated_at as f64,
            conversation.deleted_at.map(|value| value as f64),
        ],
    )?;
    get_conversation_by_id(conn, &conversation.id)?
        .ok_or_else(|| anyhow!("conversation not found after insert"))
}

pub fn list_conversations(conn: &Connection) -> Result<Vec<Conversation>> {
    let mut statement = conn.prepare(
        "SELECT id, title, icon, context_item_id, created_at, updated_at, deleted_at
         FROM conversations WHERE deleted_at IS NULL ORDER BY updated_at DESC;",
    )?;
    let rows = statement.query_map([], map_conversation_row)?;
    collect_rows(rows)
}

pub fn update_conversation(
    conn: &Connection,
    conversation_id: &str,
    patch: &Map<String, Value>,
) -> Result<Conversation> {
    update_row_from_json_patch(conn, "conversations", "id", conversation_id, patch)?;
    get_conversation_by_id(conn, conversation_id)?
        .ok_or_else(|| anyhow!("conversation not found: {conversation_id}"))
}

pub fn delete_conversation(conn: &Connection, conversation_id: &str, deleted_at: i64) -> Result<()> {
    let transaction = conn.unchecked_transaction()?;
    transaction.execute(
        "UPDATE messages SET deleted_at = ?1 WHERE conversation_id = ?2;",
        params![deleted_at as f64, conversation_id],
    )?;
    transaction.execute(
        "UPDATE conversations SET deleted_at = ?1, updated_at = ?1 WHERE id = ?2;",
        params![deleted_at as f64, conversation_id],
    )?;
    transaction.commit()?;
    Ok(())
}

pub fn list_conversation_messages(conn: &Connection, conversation_id: &str) -> Result<Vec<Message>> {
    let mut statement = conn.prepare(
        "SELECT id, conversation_id, role, content, created_at, updated_at, deleted_at
         FROM messages WHERE conversation_id = ?1 AND deleted_at IS NULL ORDER BY created_at ASC;",
    )?;
    let rows = statement.query_map([conversation_id], map_message_row)?;
    collect_rows(rows)
}

pub fn add_message(conn: &Connection, message: &Message) -> Result<Message> {
    let transaction = conn.unchecked_transaction()?;
    transaction.execute(
        "INSERT INTO messages (id, conversation_id, role, content, created_at, updated_at, deleted_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7);",
        params![
            message.id,
            message.conversation_id,
            to_message_role(&message.role),
            message.content,
            message.created_at as f64,
            message.updated_at.map(|value| value as f64),
            message.deleted_at.map(|value| value as f64),
        ],
    )?;
    transaction.execute(
        "UPDATE conversations SET updated_at = ?1 WHERE id = ?2;",
        params![message.created_at as f64, message.conversation_id],
    )?;
    transaction.commit()?;
    get_message_by_id(conn, &message.id)?.ok_or_else(|| anyhow!("message not found after insert"))
}

pub fn update_message(conn: &Connection, message_id: &str, patch: &Map<String, Value>) -> Result<Message> {
    update_row_from_json_patch(conn, "messages", "id", message_id, patch)?;
    get_message_by_id(conn, message_id)?.ok_or_else(|| anyhow!("message not found: {message_id}"))
}

pub fn delete_message(conn: &Connection, message_id: &str, deleted_at: i64) -> Result<()> {
    conn.execute(
        "UPDATE messages SET deleted_at = ?1 WHERE id = ?2;",
        params![deleted_at as f64, message_id],
    )?;
    Ok(())
}

fn get_conversation_by_id(conn: &Connection, conversation_id: &str) -> Result<Option<Conversation>> {
    conn.query_row(
        "SELECT id, title, icon, context_item_id, created_at, updated_at, deleted_at
         FROM conversations WHERE id = ?1 LIMIT 1;",
        [conversation_id],
        map_conversation_row,
    )
    .optional()
    .map_err(Into::into)
}

fn get_message_by_id(conn: &Connection, message_id: &str) -> Result<Option<Message>> {
    conn.query_row(
        "SELECT id, conversation_id, role, content, created_at, updated_at, deleted_at
         FROM messages WHERE id = ?1 LIMIT 1;",
        [message_id],
        map_message_row,
    )
    .optional()
    .map_err(Into::into)
}
