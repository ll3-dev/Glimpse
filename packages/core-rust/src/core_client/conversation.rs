//! Conversation operations for CoreClient.

use crate::error::Result;
use crate::models::{Conversation, ConversationPatch};

use super::CoreClientImpl;

impl CoreClientImpl {
    pub fn create_conversation(&self, conversation: &Conversation) -> Result<Conversation> {
        self.storage.insert_conversation(conversation)?;
        Ok(conversation.clone())
    }

    pub fn list_conversations(&self) -> Result<Vec<Conversation>> {
        self.storage.list_conversations()
    }

    pub fn update_conversation(&self, conversation_id: &str, patch: &ConversationPatch) -> Result<Conversation> {
        self.storage.update_conversation(conversation_id, patch)
    }

    pub fn delete_conversation(&self, conversation_id: &str, deleted_at: i64) -> Result<()> {
        self.storage.soft_delete_conversation(conversation_id, deleted_at)
    }
}
