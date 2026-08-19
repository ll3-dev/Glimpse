use crate::error::Result;
use crate::models::{Conversation, ConversationPatch};

use super::SharedCore;

impl SharedCore {
    pub fn create_conversation(&self, conversation: &Conversation) -> Result<Conversation> {
        self.client().create_conversation(conversation)
    }

    pub fn list_conversations(&self) -> Result<Vec<Conversation>> {
        self.client().list_conversations()
    }

    pub fn update_conversation(
        &self,
        conversation_id: &str,
        patch: &ConversationPatch,
    ) -> Result<Conversation> {
        self.client().update_conversation(conversation_id, patch)
    }

    pub fn delete_conversation(&self, conversation_id: &str, deleted_at: i64) -> Result<()> {
        self.client()
            .delete_conversation(conversation_id, deleted_at)
    }
}
