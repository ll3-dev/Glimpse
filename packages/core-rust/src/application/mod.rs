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

#[cfg(test)]
mod tests {
    use super::SharedCore;
    use crate::error::Error;
    use crate::models::{
        Conversation, GetDueKnowledgeItemsInput, KnowledgeItem, KnowledgeItemType, Message,
        MessageRole,
    };

    fn create_test_item(id: &str, next_review_at: Option<i64>) -> KnowledgeItem {
        KnowledgeItem {
            id: id.to_string(),
            item_type: KnowledgeItemType::Note,
            title: Some(format!("Item {id}")),
            body: None,
            url: None,
            summary: None,
            tags: None,
            labels: None,
            provisional_labels: None,
            label_status: None,
            label_source: None,
            label_version: None,
            label_score: None,
            label_requested_at: None,
            label_completed_at: None,
            label_error: None,
            created_at: 1000,
            updated_at: 1000,
            stability: None,
            difficulty: None,
            last_reviewed_at: None,
            next_review_at,
        }
    }

    #[test]
    fn shared_core_due_queries_match_application_expectations() {
        let core = SharedCore::in_memory().unwrap();
        core.save_knowledge_item(&create_test_item("unscheduled", None))
            .unwrap();
        core.save_knowledge_item(&create_test_item("due", Some(1500)))
            .unwrap();
        core.save_knowledge_item(&create_test_item("future", Some(2500)))
            .unwrap();

        let due_items = core
            .get_due_knowledge_items(&GetDueKnowledgeItemsInput {
                now: 2000,
                limit: Some(2),
            })
            .unwrap();

        let due_ids: Vec<&str> = due_items.iter().map(|item| item.id.as_str()).collect();
        assert_eq!(due_ids, vec!["unscheduled", "due"]);
    }

    #[test]
    fn shared_core_lists_pending_labeling_items_saved_with_pending_status() {
        let core = SharedCore::in_memory().unwrap();
        let mut pending = create_test_item("pending-item", None);
        pending.label_status = Some(crate::models::KnowledgeItemLabelStatus::Pending);
        pending.label_requested_at = Some(500);
        let mut done = create_test_item("done-item", None);
        done.label_status = Some(crate::models::KnowledgeItemLabelStatus::Final);

        core.save_knowledge_item(&pending).unwrap();
        core.save_knowledge_item(&done).unwrap();

        let items = core.list_pending_knowledge_items_for_labeling(10).unwrap();
        let ids: Vec<&str> = items.iter().map(|item| item.id.as_str()).collect();
        assert_eq!(ids, vec!["pending-item"]);
        assert_eq!(
            items[0].label_status,
            Some(crate::models::KnowledgeItemLabelStatus::Pending)
        );
    }

    #[test]
    fn shared_core_rejects_messages_for_deleted_conversations() {
        let core = SharedCore::in_memory().unwrap();
        core.create_conversation(&Conversation {
            id: "conv-deleted".to_string(),
            title: Some("Deleted".to_string()),
            icon: None,
            context_item_id: None,
            created_at: 1000,
            updated_at: 1000,
            deleted_at: None,
        })
        .unwrap();
        core.delete_conversation("conv-deleted", 1500).unwrap();

        let error = core
            .add_message(&Message {
                id: "msg-1".to_string(),
                conversation_id: "conv-deleted".to_string(),
                role: MessageRole::User,
                content: "should fail".to_string(),
                created_at: 2000,
                updated_at: None,
                deleted_at: None,
            })
            .unwrap_err();

        match error {
            Error::InvalidInput(message) => {
                assert_eq!(message, "Cannot add message to deleted conversation")
            }
            other => panic!("expected invalid input error, got {other:?}"),
        }
    }
}
