//! Message domain rustra commands over `SharedCore`.

use rustra::prelude::*;

use crate::io::{MessageIo, MessagePatchIo};

#[derive(Debug, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct ListConversationMessagesInput {
    pub conversation_id: String,
}

#[derive(Debug, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct ListConversationMessagesOutput {
    pub messages: Vec<MessageIo>,
}

#[command]
pub fn list_conversation_messages(
    input: ListConversationMessagesInput,
) -> Result<ListConversationMessagesOutput> {
    let core = crate::state::core_state();
    let messages = core
        .list_conversation_messages(&input.conversation_id)
        .map_err(crate::error::to_rustra_err)?;
    Ok(ListConversationMessagesOutput {
        messages: messages.into_iter().map(Into::into).collect(),
    })
}

#[derive(Debug, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct AddMessageInput {
    pub message: MessageIo,
}

#[derive(Debug, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct AddMessageOutput {
    pub message: MessageIo,
}

#[command]
pub fn add_message(input: AddMessageInput) -> Result<AddMessageOutput> {
    let core = crate::state::core_state();
    let message = core
        .add_message(&input.message.into())
        .map_err(crate::error::to_rustra_err)?;
    Ok(AddMessageOutput {
        message: message.into(),
    })
}

#[derive(Debug, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct UpdateMessageInput {
    pub message_id: String,
    pub patch: MessagePatchIo,
}

#[derive(Debug, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct UpdateMessageOutput {
    pub message: MessageIo,
}

#[command]
pub fn update_message(input: UpdateMessageInput) -> Result<UpdateMessageOutput> {
    let core = crate::state::core_state();
    let patch: glimpse_core::MessagePatch = input.patch.into();
    let message = core
        .update_message(&input.message_id, &patch)
        .map_err(crate::error::to_rustra_err)?;
    Ok(UpdateMessageOutput {
        message: message.into(),
    })
}

#[derive(Debug, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct DeleteMessageInput {
    pub message_id: String,
    pub deleted_at: i64,
}

#[derive(Debug, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct DeleteMessageOutput {}

#[command]
pub fn delete_message(input: DeleteMessageInput) -> Result<DeleteMessageOutput> {
    let core = crate::state::core_state();
    core.delete_message(&input.message_id, input.deleted_at)
        .map_err(crate::error::to_rustra_err)?;
    Ok(DeleteMessageOutput {})
}

/// Assembles the `glimpse.message` package with all message commands.
pub fn message_package() -> rustra::Package {
    static CACHED: std::sync::OnceLock<rustra::Package> = std::sync::OnceLock::new();
    CACHED
        .get_or_init(|| {
            register_commands(rustra::Package::builder("glimpse.message")).build()
        })
        .clone()
}

/// Registers this domain's commands onto an existing package builder.
///
/// Used both by [`message_package`] and by the unified `glimpse.core`
/// package — must live in this module because `#[command]`'s generated
/// metadata consts are module-private.
pub(crate) fn register_commands(
    builder: rustra::PackageBuilder,
) -> rustra::PackageBuilder {
    rustra::register!(
        builder,
        list_conversation_messages,
        add_message,
        update_message,
        delete_message
    )
}
