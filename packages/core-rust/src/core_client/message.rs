//! Message operations for CoreClient.

use crate::error::{Error, Result};
use crate::models::{Message, MessagePatch};

use super::CoreClientImpl;

impl CoreClientImpl {
    pub fn list_conversation_messages(&self, conversation_id: &str) -> Result<Vec<Message>> {
        self.storage.list_conversation_messages(conversation_id)
    }

    pub fn add_message(&self, message: &Message) -> Result<Message> {
        // Verify conversation exists
        let conversation = self.storage.get_conversation(&message.conversation_id)?
            .ok_or_else(|| Error::NotFound("conversation".to_string(), message.conversation_id.clone()))?;

        if conversation.deleted_at.is_some() {
            return Err(Error::InvalidInput("Cannot add message to deleted conversation".to_string()));
        }

        self.storage.insert_message(message)?;
        self.storage.update_conversation_updated_at(&message.conversation_id, message.created_at)?;

        Ok(message.clone())
    }

    pub fn update_message(&self, message_id: &str, patch: &MessagePatch) -> Result<Message> {
        self.storage.update_message(message_id, patch)
    }

    pub fn delete_message(&self, message_id: &str, deleted_at: i64) -> Result<()> {
        self.storage.soft_delete_message(message_id, deleted_at)
    }
}
