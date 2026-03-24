use std::panic::{catch_unwind, AssertUnwindSafe};

use anyhow::{anyhow, Result};

use crate::glimpse_core_impl::{Context, GlimpseCore};

#[cxx::bridge(namespace = "ll3::glimpse::bridging")]
pub mod bridging {
    #[derive(Clone, Default)]
    pub struct NullableNumber {
        pub null: bool,
        pub val: f64,
    }

    #[derive(Clone, Default)]
    pub struct NullableStringArray {
        pub null: bool,
        pub val: Vec<String>,
    }

    #[derive(Clone, Default)]
    pub struct GlimpseInitializeReviewScheduleOutput {
        pub next_review_at: f64,
        pub stability: NullableNumber,
        pub difficulty: NullableNumber,
        pub last_reviewed_at: NullableNumber,
    }

    #[derive(Clone, Default)]
    pub struct GlimpseCalculateNextReviewOutput {
        pub interval_ms: f64,
        pub next_review_at: f64,
    }

    extern "Rust" {
        type GlimpseCore;

        #[cxx_name = "createGlimpseCore"]
        fn create_glimpse_core(id: usize, data_path: &str) -> Box<GlimpseCore>;

        #[cxx_name = "addMessageJson"]
        fn glimpse_core_add_message_json(it_: &mut GlimpseCore, payload_json: &str) -> Result<String>;

        #[cxx_name = "calculateNextReview"]
        fn glimpse_core_calculate_next_review(
            it_: &mut GlimpseCore,
            last_reviewed_at: NullableNumber,
            next_review_at: NullableNumber,
            feedback_type: &str,
            now: f64,
        ) -> Result<GlimpseCalculateNextReviewOutput>;

        #[cxx_name = "calculateTagOverlap"]
        fn glimpse_core_calculate_tag_overlap(
            it_: &mut GlimpseCore,
            left_tags: NullableStringArray,
            right_tags: NullableStringArray,
        ) -> Result<f64>;

        #[cxx_name = "createConversationJson"]
        fn glimpse_core_create_conversation_json(it_: &mut GlimpseCore, payload_json: &str) -> Result<String>;

        #[cxx_name = "deleteConversation"]
        fn glimpse_core_delete_conversation(
            it_: &mut GlimpseCore,
            conversation_id: &str,
            deleted_at: f64,
        ) -> Result<()>;

        #[cxx_name = "deleteMessage"]
        fn glimpse_core_delete_message(it_: &mut GlimpseCore, message_id: &str, deleted_at: f64) -> Result<()>;

        #[cxx_name = "getDueKnowledgeItemsJson"]
        fn glimpse_core_get_due_knowledge_items_json(
            it_: &mut GlimpseCore,
            now: f64,
            limit: NullableNumber,
        ) -> Result<String>;

        #[cxx_name = "getKnowledgeItemByIdJson"]
        fn glimpse_core_get_knowledge_item_by_id_json(it_: &mut GlimpseCore, item_id: &str) -> Result<String>;

        #[cxx_name = "initializeReviewSchedule"]
        fn glimpse_core_initialize_review_schedule(
            it_: &mut GlimpseCore,
            created_at: f64,
            interval_ms: NullableNumber,
        ) -> Result<GlimpseInitializeReviewScheduleOutput>;

        #[cxx_name = "listConversationMessagesJson"]
        fn glimpse_core_list_conversation_messages_json(
            it_: &mut GlimpseCore,
            conversation_id: &str,
        ) -> Result<String>;

        #[cxx_name = "listConversationsJson"]
        fn glimpse_core_list_conversations_json(it_: &mut GlimpseCore) -> Result<String>;

        #[cxx_name = "listKnowledgeItemsByIdsJson"]
        fn glimpse_core_list_knowledge_items_by_ids_json(
            it_: &mut GlimpseCore,
            item_ids_json: &str,
        ) -> Result<String>;

        #[cxx_name = "listKnowledgeItemsJson"]
        fn glimpse_core_list_knowledge_items_json(it_: &mut GlimpseCore) -> Result<String>;

        #[cxx_name = "listPendingKnowledgeItemsForLabelingJson"]
        fn glimpse_core_list_pending_knowledge_items_for_labeling_json(
            it_: &mut GlimpseCore,
            limit: f64,
        ) -> Result<String>;

        #[cxx_name = "listPendingRecommendationsJson"]
        fn glimpse_core_list_pending_recommendations_json(it_: &mut GlimpseCore) -> Result<String>;

        #[cxx_name = "listRecentFeedbackEventsJson"]
        fn glimpse_core_list_recent_feedback_events_json(it_: &mut GlimpseCore, limit: f64) -> Result<String>;

        #[cxx_name = "listRecommendationsJson"]
        fn glimpse_core_list_recommendations_json(it_: &mut GlimpseCore) -> Result<String>;

        #[cxx_name = "listWeeklyKnowledgeItemsJson"]
        fn glimpse_core_list_weekly_knowledge_items_json(it_: &mut GlimpseCore, since: f64) -> Result<String>;

        #[cxx_name = "logRecommendationFeedbackJson"]
        fn glimpse_core_log_recommendation_feedback_json(it_: &mut GlimpseCore, payload_json: &str) -> Result<String>;

        #[cxx_name = "respondToRecommendationJson"]
        fn glimpse_core_respond_to_recommendation_json(
            it_: &mut GlimpseCore,
            recommendation_id: &str,
            status: &str,
            event_json: &str,
        ) -> Result<()>;

        #[cxx_name = "saveKnowledgeItemJson"]
        fn glimpse_core_save_knowledge_item_json(it_: &mut GlimpseCore, payload_json: &str) -> Result<String>;

        #[cxx_name = "saveRecommendationsJson"]
        fn glimpse_core_save_recommendations_json(it_: &mut GlimpseCore, payload_json: &str) -> Result<()>;

        #[cxx_name = "updateConversationJson"]
        fn glimpse_core_update_conversation_json(
            it_: &mut GlimpseCore,
            conversation_id: &str,
            patch_json: &str,
        ) -> Result<String>;

        #[cxx_name = "updateKnowledgeItemJson"]
        fn glimpse_core_update_knowledge_item_json(
            it_: &mut GlimpseCore,
            item_id: &str,
            patch_json: &str,
        ) -> Result<String>;

        #[cxx_name = "updateMessageJson"]
        fn glimpse_core_update_message_json(
            it_: &mut GlimpseCore,
            message_id: &str,
            patch_json: &str,
        ) -> Result<String>;
    }
}

impl From<Option<f64>> for bridging::NullableNumber {
    fn from(value: Option<f64>) -> Self {
        Self {
            null: value.is_none(),
            val: value.unwrap_or(0.0),
        }
    }
}

impl From<bridging::NullableNumber> for Option<f64> {
    fn from(value: bridging::NullableNumber) -> Self {
        if value.null {
            None
        } else {
            Some(value.val)
        }
    }
}

impl From<Option<Vec<String>>> for bridging::NullableStringArray {
    fn from(value: Option<Vec<String>>) -> Self {
        Self {
            null: value.is_none(),
            val: value.unwrap_or_default(),
        }
    }
}

impl From<bridging::NullableStringArray> for Option<Vec<String>> {
    fn from(value: bridging::NullableStringArray) -> Self {
        if value.null {
            None
        } else {
            Some(value.val)
        }
    }
}

fn create_glimpse_core(id: usize, data_path: &str) -> Box<GlimpseCore> {
    let ctx = Context {
        id,
        data_path: data_path.to_string(),
    };
    Box::new(GlimpseCore::new(ctx))
}

fn catch_unwind_result<T, F>(f: F) -> Result<T>
where
    F: FnOnce() -> Result<T>,
{
    match catch_unwind(AssertUnwindSafe(f)) {
        Ok(result) => result,
        Err(payload) => Err(anyhow!(panic_payload_to_string(payload))),
    }
}

fn panic_payload_to_string(payload: Box<dyn std::any::Any + Send>) -> String {
    if let Some(message) = payload.downcast_ref::<&str>() {
        (*message).to_string()
    } else if let Some(message) = payload.downcast_ref::<String>() {
        message.clone()
    } else {
        "Rust panic in GlimpseCore bridge".to_string()
    }
}

fn glimpse_core_add_message_json(it_: &mut GlimpseCore, payload_json: &str) -> Result<String> {
    catch_unwind_result(|| it_.add_message_json(payload_json))
}

fn glimpse_core_calculate_next_review(
    it_: &mut GlimpseCore,
    last_reviewed_at: bridging::NullableNumber,
    next_review_at: bridging::NullableNumber,
    feedback_type: &str,
    now: f64,
) -> Result<bridging::GlimpseCalculateNextReviewOutput> {
    catch_unwind_result(|| it_.calculate_next_review(last_reviewed_at, next_review_at, feedback_type, now))
}

fn glimpse_core_calculate_tag_overlap(
    it_: &mut GlimpseCore,
    left_tags: bridging::NullableStringArray,
    right_tags: bridging::NullableStringArray,
) -> Result<f64> {
    catch_unwind_result(|| it_.calculate_tag_overlap(left_tags, right_tags))
}

fn glimpse_core_create_conversation_json(it_: &mut GlimpseCore, payload_json: &str) -> Result<String> {
    catch_unwind_result(|| it_.create_conversation_json(payload_json))
}

fn glimpse_core_delete_conversation(
    it_: &mut GlimpseCore,
    conversation_id: &str,
    deleted_at: f64,
) -> Result<()> {
    catch_unwind_result(|| it_.delete_conversation(conversation_id, deleted_at))
}

fn glimpse_core_delete_message(it_: &mut GlimpseCore, message_id: &str, deleted_at: f64) -> Result<()> {
    catch_unwind_result(|| it_.delete_message(message_id, deleted_at))
}

fn glimpse_core_get_due_knowledge_items_json(
    it_: &mut GlimpseCore,
    now: f64,
    limit: bridging::NullableNumber,
) -> Result<String> {
    catch_unwind_result(|| it_.get_due_knowledge_items_json(now, limit))
}

fn glimpse_core_get_knowledge_item_by_id_json(it_: &mut GlimpseCore, item_id: &str) -> Result<String> {
    catch_unwind_result(|| it_.get_knowledge_item_by_id_json(item_id))
}

fn glimpse_core_initialize_review_schedule(
    it_: &mut GlimpseCore,
    created_at: f64,
    interval_ms: bridging::NullableNumber,
) -> Result<bridging::GlimpseInitializeReviewScheduleOutput> {
    catch_unwind_result(|| it_.initialize_review_schedule(created_at, interval_ms))
}

fn glimpse_core_list_conversation_messages_json(
    it_: &mut GlimpseCore,
    conversation_id: &str,
) -> Result<String> {
    catch_unwind_result(|| it_.list_conversation_messages_json(conversation_id))
}

fn glimpse_core_list_conversations_json(it_: &mut GlimpseCore) -> Result<String> {
    catch_unwind_result(|| it_.list_conversations_json())
}

fn glimpse_core_list_knowledge_items_by_ids_json(
    it_: &mut GlimpseCore,
    item_ids_json: &str,
) -> Result<String> {
    catch_unwind_result(|| it_.list_knowledge_items_by_ids_json(item_ids_json))
}

fn glimpse_core_list_knowledge_items_json(it_: &mut GlimpseCore) -> Result<String> {
    catch_unwind_result(|| it_.list_knowledge_items_json())
}

fn glimpse_core_list_pending_knowledge_items_for_labeling_json(
    it_: &mut GlimpseCore,
    limit: f64,
) -> Result<String> {
    catch_unwind_result(|| it_.list_pending_knowledge_items_for_labeling_json(limit))
}

fn glimpse_core_list_pending_recommendations_json(it_: &mut GlimpseCore) -> Result<String> {
    catch_unwind_result(|| it_.list_pending_recommendations_json())
}

fn glimpse_core_list_recent_feedback_events_json(it_: &mut GlimpseCore, limit: f64) -> Result<String> {
    catch_unwind_result(|| it_.list_recent_feedback_events_json(limit))
}

fn glimpse_core_list_recommendations_json(it_: &mut GlimpseCore) -> Result<String> {
    catch_unwind_result(|| it_.list_recommendations_json())
}

fn glimpse_core_list_weekly_knowledge_items_json(it_: &mut GlimpseCore, since: f64) -> Result<String> {
    catch_unwind_result(|| it_.list_weekly_knowledge_items_json(since))
}

fn glimpse_core_log_recommendation_feedback_json(it_: &mut GlimpseCore, payload_json: &str) -> Result<String> {
    catch_unwind_result(|| it_.log_recommendation_feedback_json(payload_json))
}

fn glimpse_core_respond_to_recommendation_json(
    it_: &mut GlimpseCore,
    recommendation_id: &str,
    status: &str,
    event_json: &str,
) -> Result<()> {
    catch_unwind_result(|| it_.respond_to_recommendation_json(recommendation_id, status, event_json))
}

fn glimpse_core_save_knowledge_item_json(it_: &mut GlimpseCore, payload_json: &str) -> Result<String> {
    catch_unwind_result(|| it_.save_knowledge_item_json(payload_json))
}

fn glimpse_core_save_recommendations_json(it_: &mut GlimpseCore, payload_json: &str) -> Result<()> {
    catch_unwind_result(|| it_.save_recommendations_json(payload_json))
}

fn glimpse_core_update_conversation_json(
    it_: &mut GlimpseCore,
    conversation_id: &str,
    patch_json: &str,
) -> Result<String> {
    catch_unwind_result(|| it_.update_conversation_json(conversation_id, patch_json))
}

fn glimpse_core_update_knowledge_item_json(
    it_: &mut GlimpseCore,
    item_id: &str,
    patch_json: &str,
) -> Result<String> {
    catch_unwind_result(|| it_.update_knowledge_item_json(item_id, patch_json))
}

fn glimpse_core_update_message_json(
    it_: &mut GlimpseCore,
    message_id: &str,
    patch_json: &str,
) -> Result<String> {
    catch_unwind_result(|| it_.update_message_json(message_id, patch_json))
}
