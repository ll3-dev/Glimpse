mod conversation;
mod feedback;
mod knowledge;
mod message;
mod recommendation;
mod review;

use crate::core_client::CoreClientImpl;
use crate::error::Result;
use crate::storage::sqlite::SqliteStorage;

pub use crate::models::{
    GetDueKnowledgeItemsInput, InitializeReviewScheduleInput, InitializeReviewScheduleOutput,
};

/// Shared application entrypoint used by platform transports.
///
/// React Native FFI and Tauri adapters should depend on this type instead of
/// reaching into storage-backed implementation details directly.
pub struct SharedCore {
    client: CoreClientImpl,
}

impl SharedCore {
    pub fn new(storage: SqliteStorage) -> Self {
        Self {
            client: CoreClientImpl::new(storage),
        }
    }

    pub fn in_memory() -> Result<Self> {
        Ok(Self {
            client: CoreClientImpl::in_memory()?,
        })
    }

    pub(crate) fn client(&self) -> &CoreClientImpl {
        &self.client
    }
}
