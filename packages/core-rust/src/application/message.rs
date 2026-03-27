use crate::error::Result;
use crate::models::{Message, MessagePatch};

use super::SharedCore;

impl SharedCore {
    pub fn list_conversation_messages(&self, conversation_id: &str) -> Result<Vec<Message>> {
        self.client().list_conversation_messages(conversation_id)
    }

    pub fn add_message(&self, message: &Message) -> Result<Message> {
        self.client().add_message(message)
    }

    pub fn update_message(&self, message_id: &str, patch: &MessagePatch) -> Result<Message> {
        self.client().update_message(message_id, patch)
    }

    pub fn delete_message(&self, message_id: &str, deleted_at: i64) -> Result<()> {
        self.client().delete_message(message_id, deleted_at)
    }
}
