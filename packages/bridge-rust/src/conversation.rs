//! Conversation domain rustra commands over `SharedCore`.

use rustra::prelude::*;

use crate::io::{ConversationIo, ConversationPatchIo};

#[derive(Debug, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct CreateConversationInput {
    pub conversation: ConversationIo,
}

#[derive(Debug, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct CreateConversationOutput {
    pub conversation: ConversationIo,
}

#[command]
pub fn create_conversation(input: CreateConversationInput) -> Result<CreateConversationOutput> {
    let core = crate::state::core_state();
    let conversation = core
        .create_conversation(&input.conversation.into())
        .map_err(crate::error::to_rustra_err)?;
    Ok(CreateConversationOutput {
        conversation: conversation.into(),
    })
}

#[derive(Debug, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct ListConversationsInput {}

#[derive(Debug, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct ListConversationsOutput {
    pub conversations: Vec<ConversationIo>,
}

#[command]
pub fn list_conversations(_input: ListConversationsInput) -> Result<ListConversationsOutput> {
    let core = crate::state::core_state();
    let conversations = core
        .list_conversations()
        .map_err(crate::error::to_rustra_err)?;
    Ok(ListConversationsOutput {
        conversations: conversations.into_iter().map(Into::into).collect(),
    })
}

#[derive(Debug, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct UpdateConversationInput {
    pub conversation_id: String,
    pub patch: ConversationPatchIo,
}

#[derive(Debug, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct UpdateConversationOutput {
    pub conversation: ConversationIo,
}

#[command]
pub fn update_conversation(input: UpdateConversationInput) -> Result<UpdateConversationOutput> {
    let core = crate::state::core_state();
    let patch: glimpse_core::ConversationPatch = input.patch.into();
    let conversation = core
        .update_conversation(&input.conversation_id, &patch)
        .map_err(crate::error::to_rustra_err)?;
    Ok(UpdateConversationOutput {
        conversation: conversation.into(),
    })
}

#[derive(Debug, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct DeleteConversationInput {
    pub conversation_id: String,
    pub deleted_at: i64,
}

#[derive(Debug, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct DeleteConversationOutput {}

#[command]
pub fn delete_conversation(input: DeleteConversationInput) -> Result<DeleteConversationOutput> {
    let core = crate::state::core_state();
    core.delete_conversation(&input.conversation_id, input.deleted_at)
        .map_err(crate::error::to_rustra_err)?;
    Ok(DeleteConversationOutput {})
}

/// Assembles the `glimpse.conversation` package with all conversation commands.
pub fn conversation_package() -> rustra::Package {
    static CACHED: std::sync::OnceLock<rustra::Package> = std::sync::OnceLock::new();
    CACHED
        .get_or_init(|| {
            register_commands(rustra::Package::builder("glimpse.conversation")).build()
        })
        .clone()
}

/// Registers this domain's commands onto an existing package builder.
///
/// Used both by [`conversation_package`] and by the unified `glimpse.core`
/// package — must live in this module because `#[command]`'s generated
/// metadata consts are module-private.
pub(crate) fn register_commands(
    builder: rustra::PackageBuilder,
) -> rustra::PackageBuilder {
    rustra::register!(
        builder,
        create_conversation,
        list_conversations,
        update_conversation,
        delete_conversation
    )
}
