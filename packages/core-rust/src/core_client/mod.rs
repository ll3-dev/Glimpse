//! CoreClient implementation for the Glimpse core library.

mod conversation;
mod feedback;
mod knowledge;
mod message;
mod portability;
mod recommendation;
mod review;

use crate::error::Result;
use crate::storage::sqlite::SqliteStorage;

// Re-export types for tests and external use
pub use crate::models::{
    GetDueKnowledgeItemsInput, InitializeReviewScheduleInput, InitializeReviewScheduleOutput,
};

/// CoreClient implementation backed by SQLite storage.
pub struct CoreClientImpl {
    storage: SqliteStorage,
}

impl CoreClientImpl {
    /// Creates a new CoreClient with the given SQLite storage.
    pub fn new(storage: SqliteStorage) -> Self {
        Self { storage }
    }

    /// Creates a new CoreClient with an in-memory database (useful for testing).
    pub fn in_memory() -> Result<Self> {
        let storage = SqliteStorage::in_memory()?;
        Ok(Self { storage })
    }
}

// ============================================================================
// Unit Tests
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;
    use crate::error::Error;
    use crate::models::NullablePatch;
    use crate::models::{
        CalculateNextReviewInput, CalculateTagOverlapInput, Conversation, ConversationPatch,
        CoreKnowledgeItemLike, FeedbackActionType, FeedbackEvent, GetDueKnowledgeItemsInput,
        InitializeReviewScheduleInput, KnowledgeItem, KnowledgeItemPatch, KnowledgeItemType,
        Message, MessagePatch, MessageRole, Recommendation, RecommendationStatus,
        ReviewFeedbackType,
    };

    fn create_test_client() -> CoreClientImpl {
        CoreClientImpl::in_memory().unwrap()
    }

    fn create_test_knowledge_item(id: &str) -> KnowledgeItem {
        KnowledgeItem {
            id: id.to_string(),
            item_type: KnowledgeItemType::Note,
            title: Some(format!("Test Note {}", id)),
            body: Some("Test body".to_string()),
            url: None,
            summary: None,
            tags: Some(vec!["test".to_string()]),
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
            next_review_at: None,
        }
    }

    // ========================================================================
    // Tag Overlap Tests
    // ========================================================================

    #[test]
    fn test_calculate_tag_overlap_basic() {
        let client = create_test_client();
        let input = CalculateTagOverlapInput {
            left: CoreKnowledgeItemLike {
                tags: Some(vec!["rust".to_string(), "react".to_string()]),
                ..Default::default()
            },
            right: CoreKnowledgeItemLike {
                tags: Some(vec!["rust".to_string(), "vue".to_string()]),
                ..Default::default()
            },
        };
        assert_eq!(client.calculate_tag_overlap(&input), 1);
    }

    #[test]
    fn test_calculate_tag_overlap_multiple() {
        let client = create_test_client();
        let input = CalculateTagOverlapInput {
            left: CoreKnowledgeItemLike {
                tags: Some(vec!["a".to_string(), "b".to_string(), "c".to_string()]),
                ..Default::default()
            },
            right: CoreKnowledgeItemLike {
                tags: Some(vec!["b".to_string(), "c".to_string(), "d".to_string()]),
                ..Default::default()
            },
        };
        assert_eq!(client.calculate_tag_overlap(&input), 2);
    }

    #[test]
    fn test_calculate_tag_overlap_no_overlap() {
        let client = create_test_client();
        let input = CalculateTagOverlapInput {
            left: CoreKnowledgeItemLike {
                tags: Some(vec!["a".to_string(), "b".to_string()]),
                ..Default::default()
            },
            right: CoreKnowledgeItemLike {
                tags: Some(vec!["c".to_string(), "d".to_string()]),
                ..Default::default()
            },
        };
        assert_eq!(client.calculate_tag_overlap(&input), 0);
    }

    #[test]
    fn test_calculate_tag_overlap_empty_tags() {
        let client = create_test_client();
        let input = CalculateTagOverlapInput {
            left: CoreKnowledgeItemLike {
                tags: None,
                ..Default::default()
            },
            right: CoreKnowledgeItemLike {
                tags: Some(vec!["a".to_string()]),
                ..Default::default()
            },
        };
        assert_eq!(client.calculate_tag_overlap(&input), 0);
    }

    #[test]
    fn test_calculate_tag_overlap_both_empty() {
        let client = create_test_client();
        let input = CalculateTagOverlapInput {
            left: CoreKnowledgeItemLike {
                tags: None,
                ..Default::default()
            },
            right: CoreKnowledgeItemLike {
                tags: None,
                ..Default::default()
            },
        };
        assert_eq!(client.calculate_tag_overlap(&input), 0);
    }

    // ========================================================================
    // Next Review Tests
    // ========================================================================

    #[test]
    fn test_calculate_next_review_remembered() {
        let client = create_test_client();
        let one_day = 24 * 60 * 60 * 1000_i64;
        let now = one_day * 2;
        let input = CalculateNextReviewInput {
            last_reviewed_at: Some(0),
            next_review_at: Some(one_day),
            feedback_type: ReviewFeedbackType::Remembered,
            now,
        };

        let output = client.calculate_next_review(&input);
        assert_eq!(output.interval_ms, one_day * 2);
        assert_eq!(output.next_review_at, now + one_day * 2);
    }

    #[test]
    fn test_calculate_next_review_postponed() {
        let client = create_test_client();
        let one_day = 24 * 60 * 60 * 1000_i64;
        let now = one_day * 2;
        let input = CalculateNextReviewInput {
            last_reviewed_at: Some(0),
            next_review_at: Some(one_day),
            feedback_type: ReviewFeedbackType::Postponed,
            now,
        };

        let output = client.calculate_next_review(&input);
        assert_eq!(output.interval_ms, one_day);
        assert_eq!(output.next_review_at, now + one_day);
    }

    #[test]
    fn test_calculate_next_review_first_review() {
        let client = create_test_client();
        let now = 1000_i64;
        let input = CalculateNextReviewInput {
            last_reviewed_at: None,
            next_review_at: None,
            feedback_type: ReviewFeedbackType::Remembered,
            now,
        };

        let output = client.calculate_next_review(&input);
        assert_eq!(
            output.interval_ms,
            review::DEFAULT_INITIAL_REVIEW_INTERVAL_MS * 2
        );
    }

    #[test]
    fn test_calculate_next_review_max_interval_cap() {
        let client = create_test_client();
        let now = 1000_i64;
        let input = CalculateNextReviewInput {
            last_reviewed_at: Some(0),
            next_review_at: Some(100 * 24 * 60 * 60 * 1000),
            feedback_type: ReviewFeedbackType::Remembered,
            now,
        };

        let output = client.calculate_next_review(&input);
        assert_eq!(output.interval_ms, review::MAX_REVIEW_INTERVAL_MS);
    }

    // ========================================================================
    // Initialize Review Schedule Tests
    // ========================================================================

    #[test]
    fn test_initialize_review_schedule_default() {
        let client = create_test_client();
        let created_at = 1000_i64;
        let input = InitializeReviewScheduleInput {
            created_at,
            interval_ms: None,
        };

        let output = client.initialize_review_schedule(&input);
        assert_eq!(
            output.next_review_at,
            created_at + review::DEFAULT_INITIAL_REVIEW_INTERVAL_MS
        );
        assert!(output.stability.is_none());
        assert!(output.difficulty.is_none());
        assert!(output.last_reviewed_at.is_none());
    }

    #[test]
    fn test_initialize_review_schedule_custom_interval() {
        let client = create_test_client();
        let created_at = 1000_i64;
        let custom_interval = 48 * 60 * 60 * 1000;
        let input = InitializeReviewScheduleInput {
            created_at,
            interval_ms: Some(custom_interval),
        };

        let output = client.initialize_review_schedule(&input);
        assert_eq!(output.next_review_at, created_at + custom_interval);
    }

    // ========================================================================
    // Knowledge Item CRUD Tests
    // ========================================================================

    #[test]
    fn test_save_and_get_knowledge_item() {
        let client = create_test_client();
        let item = create_test_knowledge_item("test-1");

        client.save_knowledge_item(&item).unwrap();

        let retrieved = client.get_knowledge_item_by_id("test-1").unwrap();
        assert!(retrieved.is_some());
        let retrieved = retrieved.unwrap();
        assert_eq!(retrieved.id, "test-1");
        assert_eq!(retrieved.title, Some("Test Note test-1".to_string()));
    }

    #[test]
    fn test_list_knowledge_items() {
        let client = create_test_client();

        for i in 0..3 {
            let item = KnowledgeItem {
                id: format!("test-{}", i),
                item_type: KnowledgeItemType::Note,
                title: Some(format!("Note {}", i)),
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
                created_at: 1000 + i,
                updated_at: 1000 + i,
                stability: None,
                difficulty: None,
                last_reviewed_at: None,
                next_review_at: None,
            };
            client.save_knowledge_item(&item).unwrap();
        }

        let items = client.list_knowledge_items().unwrap();
        assert_eq!(items.len(), 3);
        assert_eq!(items[0].id, "test-2");
        assert_eq!(items[2].id, "test-0");
    }

    #[test]
    fn test_update_knowledge_item() {
        let client = create_test_client();

        let item = create_test_knowledge_item("test-update");
        client.save_knowledge_item(&item).unwrap();

        let patch = KnowledgeItemPatch {
            title: NullablePatch::Value("Updated Title".to_string()),
            ..Default::default()
        };
        let updated = client.update_knowledge_item("test-update", &patch).unwrap();

        assert_eq!(updated.title, Some("Updated Title".to_string()));
    }

    #[test]
    fn test_update_knowledge_item_supports_explicit_null_clear() {
        let client = create_test_client();

        let item = create_test_knowledge_item("test-clear");
        client.save_knowledge_item(&item).unwrap();

        let patch = KnowledgeItemPatch {
            title: NullablePatch::Null,
            tags: NullablePatch::Null,
            next_review_at: NullablePatch::Null,
            ..Default::default()
        };
        let updated = client.update_knowledge_item("test-clear", &patch).unwrap();

        assert_eq!(updated.title, None);
        assert_eq!(updated.tags, None);
        assert_eq!(updated.next_review_at, None);
    }

    // ========================================================================
    // Conversation CRUD Tests
    // ========================================================================

    #[test]
    fn test_create_and_list_conversations() {
        let client = create_test_client();

        let conversation = Conversation {
            id: "conv-1".to_string(),
            title: Some("Test Conversation".to_string()),
            icon: None,
            context_item_id: None,
            created_at: 1000,
            updated_at: 1000,
            deleted_at: None,
        };
        client.create_conversation(&conversation).unwrap();

        let conversations = client.list_conversations().unwrap();
        assert_eq!(conversations.len(), 1);
        assert_eq!(
            conversations[0].title,
            Some("Test Conversation".to_string())
        );
    }

    #[test]
    fn test_delete_conversation() {
        let client = create_test_client();

        let conversation = Conversation {
            id: "conv-delete".to_string(),
            title: Some("To Delete".to_string()),
            icon: None,
            context_item_id: None,
            created_at: 1000,
            updated_at: 1000,
            deleted_at: None,
        };
        client.create_conversation(&conversation).unwrap();

        client.delete_conversation("conv-delete", 2000).unwrap();

        let conversations = client.list_conversations().unwrap();
        assert_eq!(conversations.len(), 0);
    }

    #[test]
    fn test_update_conversation_supports_explicit_null_clear() {
        let client = create_test_client();

        let conversation = Conversation {
            id: "conv-clear".to_string(),
            title: Some("Title".to_string()),
            icon: Some("icon".to_string()),
            context_item_id: Some("item-1".to_string()),
            created_at: 1000,
            updated_at: 1000,
            deleted_at: None,
        };
        client.create_conversation(&conversation).unwrap();

        let updated = client
            .update_conversation(
                "conv-clear",
                &ConversationPatch {
                    title: NullablePatch::Null,
                    icon: NullablePatch::Null,
                    context_item_id: NullablePatch::Null,
                    updated_at: Some(2000),
                    deleted_at: NullablePatch::Unset,
                },
            )
            .unwrap();

        assert_eq!(updated.title, None);
        assert_eq!(updated.icon, None);
        assert_eq!(updated.context_item_id, None);
    }

    // ========================================================================
    // Message CRUD Tests
    // ========================================================================

    #[test]
    fn test_add_and_list_messages() {
        let client = create_test_client();

        let conversation = Conversation {
            id: "conv-msg".to_string(),
            title: None,
            icon: None,
            context_item_id: None,
            created_at: 1000,
            updated_at: 1000,
            deleted_at: None,
        };
        client.create_conversation(&conversation).unwrap();

        let message = Message {
            id: "msg-1".to_string(),
            conversation_id: "conv-msg".to_string(),
            role: MessageRole::User,
            content: "Hello".to_string(),
            created_at: 1100,
            updated_at: None,
            deleted_at: None,
        };
        client.add_message(&message).unwrap();

        let messages = client.list_conversation_messages("conv-msg").unwrap();
        assert_eq!(messages.len(), 1);
        assert_eq!(messages[0].content, "Hello");
    }

    #[test]
    fn test_add_message_updates_conversation_sort_order() {
        let client = create_test_client();

        let older = Conversation {
            id: "conv-older".to_string(),
            title: Some("Older".to_string()),
            icon: None,
            context_item_id: None,
            created_at: 1000,
            updated_at: 1000,
            deleted_at: None,
        };
        let newer = Conversation {
            id: "conv-newer".to_string(),
            title: Some("Newer".to_string()),
            icon: None,
            context_item_id: None,
            created_at: 1001,
            updated_at: 2000,
            deleted_at: None,
        };
        client.create_conversation(&older).unwrap();
        client.create_conversation(&newer).unwrap();

        let message = Message {
            id: "msg-sort".to_string(),
            conversation_id: "conv-older".to_string(),
            role: MessageRole::User,
            content: "Bump older conversation".to_string(),
            created_at: 3000,
            updated_at: None,
            deleted_at: None,
        };
        client.add_message(&message).unwrap();

        let conversations = client.list_conversations().unwrap();
        assert_eq!(conversations[0].id, "conv-older");
        assert_eq!(conversations[0].updated_at, 3000);
    }

    #[test]
    fn test_add_message_rejects_deleted_conversation() {
        let client = create_test_client();

        let conversation = Conversation {
            id: "conv-deleted".to_string(),
            title: Some("Deleted".to_string()),
            icon: None,
            context_item_id: None,
            created_at: 1000,
            updated_at: 1000,
            deleted_at: None,
        };
        client.create_conversation(&conversation).unwrap();
        client.delete_conversation("conv-deleted", 2000).unwrap();

        let message = Message {
            id: "msg-deleted".to_string(),
            conversation_id: "conv-deleted".to_string(),
            role: MessageRole::User,
            content: "Should fail".to_string(),
            created_at: 3000,
            updated_at: None,
            deleted_at: None,
        };

        let error = client.add_message(&message).unwrap_err();
        match error {
            Error::InvalidInput(message) => {
                assert_eq!(message, "Cannot add message to deleted conversation")
            }
            other => panic!("expected invalid input error, got {other:?}"),
        }
    }

    #[test]
    fn test_update_message_supports_explicit_null_clear_for_deleted_at() {
        let client = create_test_client();

        let conversation = Conversation {
            id: "conv-msg-clear".to_string(),
            title: None,
            icon: None,
            context_item_id: None,
            created_at: 1000,
            updated_at: 1000,
            deleted_at: None,
        };
        client.create_conversation(&conversation).unwrap();

        let message = Message {
            id: "msg-clear".to_string(),
            conversation_id: "conv-msg-clear".to_string(),
            role: MessageRole::User,
            content: "Hello".to_string(),
            created_at: 1100,
            updated_at: Some(1200),
            deleted_at: Some(1300),
        };
        client.add_message(&message).unwrap();

        let updated = client
            .update_message(
                "msg-clear",
                &MessagePatch {
                    content: None,
                    updated_at: Some(1400),
                    deleted_at: NullablePatch::Null,
                },
            )
            .unwrap();

        assert_eq!(updated.deleted_at, None);
    }

    #[test]
    fn test_delete_conversation_hides_its_messages() {
        let client = create_test_client();

        let conversation = Conversation {
            id: "conv-soft-delete".to_string(),
            title: Some("To Delete".to_string()),
            icon: None,
            context_item_id: None,
            created_at: 1000,
            updated_at: 1000,
            deleted_at: None,
        };
        client.create_conversation(&conversation).unwrap();

        let message = Message {
            id: "msg-soft-delete".to_string(),
            conversation_id: "conv-soft-delete".to_string(),
            role: MessageRole::User,
            content: "Soon deleted".to_string(),
            created_at: 1100,
            updated_at: None,
            deleted_at: None,
        };
        client.add_message(&message).unwrap();

        client
            .delete_conversation("conv-soft-delete", 2000)
            .unwrap();

        let messages = client
            .list_conversation_messages("conv-soft-delete")
            .unwrap();
        assert!(messages.is_empty());
    }

    // ========================================================================
    // Recommendation Tests
    // ========================================================================

    #[test]
    fn test_save_and_list_recommendations() {
        let client = create_test_client();

        let recommendation = Recommendation {
            id: "rec-1".to_string(),
            item_a_id: "item-a".to_string(),
            item_b_id: "item-b".to_string(),
            reason: Some("Similar tags".to_string()),
            status: RecommendationStatus::Pending,
            created_at: 1000,
            responded_at: None,
        };

        client
            .save_recommendations(std::slice::from_ref(&recommendation))
            .unwrap();

        let recommendations = client.list_recommendations().unwrap();
        assert_eq!(recommendations.len(), 1);

        let pending = client.list_pending_recommendations().unwrap();
        assert_eq!(pending.len(), 1);
    }

    #[test]
    fn test_respond_to_recommendation() {
        let client = create_test_client();

        let recommendation = Recommendation {
            id: "rec-respond".to_string(),
            item_a_id: "item-a".to_string(),
            item_b_id: "item-b".to_string(),
            reason: None,
            status: RecommendationStatus::Pending,
            created_at: 1000,
            responded_at: None,
        };
        client.save_recommendations(&[recommendation]).unwrap();

        let event = FeedbackEvent {
            id: "event-1".to_string(),
            recommendation_id: "rec-respond".to_string(),
            action: FeedbackActionType::Accept,
            created_at: 2000,
        };
        client
            .respond_to_recommendation("rec-respond", RecommendationStatus::Accepted, &event)
            .unwrap();

        let pending = client.list_pending_recommendations().unwrap();
        assert_eq!(pending.len(), 0);

        let events = client.list_recent_feedback_events(10).unwrap();
        assert_eq!(events.len(), 1);
    }

    // ========================================================================
    // Due Knowledge Items Tests
    // ========================================================================

    #[test]
    fn test_get_due_knowledge_items() {
        let client = create_test_client();
        let now = 2000_i64;

        let due_item = KnowledgeItem {
            id: "due-item".to_string(),
            item_type: KnowledgeItemType::Note,
            title: Some("Due Item".to_string()),
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
            next_review_at: Some(1500),
        };
        client.save_knowledge_item(&due_item).unwrap();

        let future_item = KnowledgeItem {
            id: "future-item".to_string(),
            item_type: KnowledgeItemType::Note,
            title: Some("Future Item".to_string()),
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
            next_review_at: Some(3000),
        };
        client.save_knowledge_item(&future_item).unwrap();

        let input = GetDueKnowledgeItemsInput { now, limit: None };
        let due_items = client.get_due_knowledge_items(&input).unwrap();
        assert_eq!(due_items.len(), 1);
        assert_eq!(due_items[0].id, "due-item");
    }

    #[test]
    fn test_get_due_knowledge_items_includes_unscheduled_items() {
        let client = create_test_client();
        let now = 2000_i64;

        let unscheduled_item = KnowledgeItem {
            id: "unscheduled-item".to_string(),
            item_type: KnowledgeItemType::Note,
            title: Some("Unscheduled Item".to_string()),
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
            next_review_at: None,
        };
        client.save_knowledge_item(&unscheduled_item).unwrap();

        let due_item = KnowledgeItem {
            id: "scheduled-due-item".to_string(),
            item_type: KnowledgeItemType::Note,
            title: Some("Scheduled Due Item".to_string()),
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
            created_at: 1001,
            updated_at: 1001,
            stability: None,
            difficulty: None,
            last_reviewed_at: None,
            next_review_at: Some(now),
        };
        client.save_knowledge_item(&due_item).unwrap();

        let input = GetDueKnowledgeItemsInput { now, limit: None };
        let due_items = client.get_due_knowledge_items(&input).unwrap();
        let due_ids: Vec<&str> = due_items.iter().map(|item| item.id.as_str()).collect();

        assert_eq!(due_ids, vec!["unscheduled-item", "scheduled-due-item"]);
    }

    #[test]
    fn test_get_due_knowledge_items_respects_zero_limit() {
        let client = create_test_client();
        let now = 2000_i64;

        let due_item = KnowledgeItem {
            id: "due-item-limit".to_string(),
            item_type: KnowledgeItemType::Note,
            title: Some("Due Item".to_string()),
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
            next_review_at: Some(1500),
        };
        client.save_knowledge_item(&due_item).unwrap();

        let input = GetDueKnowledgeItemsInput {
            now,
            limit: Some(0),
        };
        let due_items = client.get_due_knowledge_items(&input).unwrap();

        assert!(due_items.is_empty());
    }
}
