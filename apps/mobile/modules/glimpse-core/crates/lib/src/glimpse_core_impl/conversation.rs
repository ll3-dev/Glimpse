use anyhow::{anyhow, Result};
use serde_json::{Map, Value};

use super::{parse_json, to_i64, to_json, GlimpseCore};

impl GlimpseCore {
    pub(crate) fn create_conversation_json(&mut self, payload_json: &str) -> Result<String> {
        let conversation: glimpse_core_rs::Conversation = parse_json(payload_json)?;
        let item = glimpse_core_rs::db::create_conversation(&self.conn, &conversation)
            .map_err(|error| anyhow!("Failed to create conversation: {error}"))?;
        to_json(&item)
    }

    pub(crate) fn list_conversations_json(&mut self) -> Result<String> {
        let items = glimpse_core_rs::db::list_conversations(&self.conn)
            .map_err(|error| anyhow!("Failed to list conversations: {error}"))?;
        to_json(&items)
    }

    pub(crate) fn update_conversation_json(&mut self, conversation_id: &str, patch_json: &str) -> Result<String> {
        let patch: Map<String, Value> = parse_json(patch_json)?;
        let item = glimpse_core_rs::db::update_conversation(&self.conn, conversation_id, &patch)
            .map_err(|error| anyhow!("Failed to update conversation: {error}"))?;
        to_json(&item)
    }

    pub(crate) fn delete_conversation(&mut self, conversation_id: &str, deleted_at: f64) -> Result<()> {
        glimpse_core_rs::db::delete_conversation(&self.conn, conversation_id, to_i64(deleted_at))
            .map_err(|error| anyhow!("Failed to delete conversation: {error}"))?;
        Ok(())
    }

    pub(crate) fn list_conversation_messages_json(&mut self, conversation_id: &str) -> Result<String> {
        let items = glimpse_core_rs::db::list_conversation_messages(&self.conn, conversation_id)
            .map_err(|error| anyhow!("Failed to list conversation messages: {error}"))?;
        to_json(&items)
    }

    pub(crate) fn add_message_json(&mut self, payload_json: &str) -> Result<String> {
        let message: glimpse_core_rs::Message = parse_json(payload_json)?;
        let item = glimpse_core_rs::db::add_message(&self.conn, &message)
            .map_err(|error| anyhow!("Failed to add message: {error}"))?;
        to_json(&item)
    }

    pub(crate) fn update_message_json(&mut self, message_id: &str, patch_json: &str) -> Result<String> {
        let patch: Map<String, Value> = parse_json(patch_json)?;
        let item = glimpse_core_rs::db::update_message(&self.conn, message_id, &patch)
            .map_err(|error| anyhow!("Failed to update message: {error}"))?;
        to_json(&item)
    }

    pub(crate) fn delete_message(&mut self, message_id: &str, deleted_at: f64) -> Result<()> {
        glimpse_core_rs::db::delete_message(&self.conn, message_id, to_i64(deleted_at))
            .map_err(|error| anyhow!("Failed to delete message: {error}"))?;
        Ok(())
    }
}
