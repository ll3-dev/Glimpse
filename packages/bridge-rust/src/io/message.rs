//! Message wire mirror.

use glimpse_core::{Message, MessagePatch};
use rustra::RustraError;
use serde::{Deserialize, Serialize};

use super::{enum_to_value, parse_enum, to_patch, NullableValue};

#[derive(Debug, Clone, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct MessageIo {
    pub id: String,
    pub conversation_id: String,
    pub role: String,
    pub content: String,
    pub created_at: i64,
    pub updated_at: Option<i64>,
    pub deleted_at: Option<i64>,
}

impl From<Message> for MessageIo {
    fn from(message: Message) -> Self {
        Self {
            id: message.id,
            conversation_id: message.conversation_id,
            role: enum_to_value(message.role)
                .as_str()
                .unwrap_or("user")
                .to_string(),
            content: message.content,
            created_at: message.created_at,
            updated_at: message.updated_at,
            deleted_at: message.deleted_at,
        }
    }
}

impl TryFrom<MessageIo> for Message {
    type Error = RustraError;

    fn try_from(message: MessageIo) -> Result<Self, RustraError> {
        Ok(Self {
            id: message.id,
            conversation_id: message.conversation_id,
            role: parse_enum("role", message.role)?,
            content: message.content,
            created_at: message.created_at,
            updated_at: message.updated_at,
            deleted_at: message.deleted_at,
        })
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct MessagePatchIo {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub content: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub updated_at: Option<i64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub deleted_at: NullableValue,
}

impl TryFrom<MessagePatchIo> for MessagePatch {
    type Error = RustraError;

    fn try_from(patch: MessagePatchIo) -> Result<Self, RustraError> {
        Ok(Self {
            content: patch.content,
            updated_at: patch.updated_at,
            deleted_at: to_patch("deletedAt", patch.deleted_at)?,
        })
    }
}
