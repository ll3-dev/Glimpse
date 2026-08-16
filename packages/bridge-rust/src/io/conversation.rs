//! Conversation wire mirror.

use glimpse_core::{Conversation, ConversationPatch};
use rustra::RustraError;
use serde::{Deserialize, Serialize};

use super::{to_patch, NullableValue};

#[derive(Debug, Clone, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct ConversationIo {
    pub id: String,
    pub title: Option<String>,
    pub icon: Option<String>,
    pub context_item_id: Option<String>,
    pub created_at: i64,
    pub updated_at: i64,
    pub deleted_at: Option<i64>,
}

impl From<Conversation> for ConversationIo {
    fn from(conversation: Conversation) -> Self {
        Self {
            id: conversation.id,
            title: conversation.title,
            icon: conversation.icon,
            context_item_id: conversation.context_item_id,
            created_at: conversation.created_at,
            updated_at: conversation.updated_at,
            deleted_at: conversation.deleted_at,
        }
    }
}

impl From<ConversationIo> for Conversation {
    fn from(conversation: ConversationIo) -> Self {
        Self {
            id: conversation.id,
            title: conversation.title,
            icon: conversation.icon,
            context_item_id: conversation.context_item_id,
            created_at: conversation.created_at,
            updated_at: conversation.updated_at,
            deleted_at: conversation.deleted_at,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct ConversationPatchIo {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub title: NullableValue,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub icon: NullableValue,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub context_item_id: NullableValue,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub updated_at: Option<i64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub deleted_at: NullableValue,
}

impl TryFrom<ConversationPatchIo> for ConversationPatch {
    type Error = RustraError;

    fn try_from(patch: ConversationPatchIo) -> Result<Self, RustraError> {
        Ok(Self {
            title: to_patch("title", patch.title)?,
            icon: to_patch("icon", patch.icon)?,
            context_item_id: to_patch("contextItemId", patch.context_item_id)?,
            updated_at: patch.updated_at,
            deleted_at: to_patch("deletedAt", patch.deleted_at)?,
        })
    }
}
