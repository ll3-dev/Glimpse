use craby::{prelude::*, throw};
use glimpse_core_rs::{
    db,
    models::{KnowledgeItem, KnowledgeItemType},
    recommendation::calculate_tag_overlap,
    review::{calculate_initial_review_at, calculate_next_review, ReviewFeedbackType},
    Conversation, FeedbackEvent, Message, Recommendation, RecommendationStatus,
};
use rusqlite::Connection;
use serde::de::DeserializeOwned;
use serde_json::{Map, Value};

use crate::ffi::bridging::*;
use crate::generated::*;

pub struct GlimpseCore {
    #[allow(dead_code)]
    ctx: Context,
    conn: Connection,
}

fn to_i64(value: Number) -> i64 {
    value as i64
}

fn to_optional_i64(value: Nullable<Number>) -> Option<i64> {
    value.into_value().map(to_i64)
}

fn to_nullable_number(value: Option<i64>) -> NullableNumber {
    Nullable::new(value.map(|item| item as f64)).into()
}

fn to_knowledge_item(tags: Nullable<Array<String>>) -> KnowledgeItem {
    KnowledgeItem {
        id: String::new(),
        item_type: KnowledgeItemType::Note,
        title: None,
        body: None,
        url: None,
        summary: None,
        tags: tags.into_value().unwrap_or_default(),
        labels: None,
        provisional_labels: None,
        label_status: None,
        label_source: None,
        label_version: None,
        label_score: None,
        label_requested_at: None,
        label_completed_at: None,
        label_error: None,
        created_at: 0,
        updated_at: 0,
        stability: None,
        difficulty: None,
        last_reviewed_at: None,
        next_review_at: None,
    }
}

fn parse_feedback_type(value: &str) -> ReviewFeedbackType {
    match value {
        "remembered" => ReviewFeedbackType::Remembered,
        "postponed" => ReviewFeedbackType::Postponed,
        _ => throw!("Unsupported feedback type"),
    }
}

fn parse_json<T: DeserializeOwned>(value: &str) -> T {
    serde_json::from_str(value).unwrap_or_else(|error| throw!("Invalid JSON payload: {}", error))
}

fn to_json<T: serde::Serialize>(value: &T) -> String {
    serde_json::to_string(value).unwrap_or_else(|error| throw!("Failed to serialize JSON: {}", error))
}

fn parse_recommendation_status(value: &str) -> RecommendationStatus {
    serde_json::from_value(Value::String(String::from(value)))
        .unwrap_or_else(|error| throw!("Unsupported recommendation status: {}", error))
}

#[craby_module]
impl GlimpseCoreSpec for GlimpseCore {
    fn new(ctx: Context) -> Self {
        let conn = db::open_database(&ctx.data_path)
            .unwrap_or_else(|error| throw!("Failed to open database: {}", error));
        Self { ctx, conn }
    }

    fn id(&self) -> usize {
        self.ctx.id
    }

    fn calculate_next_review(
        &mut self,
        last_reviewed_at: Nullable<Number>,
        next_review_at: Nullable<Number>,
        feedback_type: &str,
        now: Number,
    ) -> GlimpseCalculateNextReviewOutput {
        let next_review = calculate_next_review(
            to_optional_i64(last_reviewed_at),
            to_optional_i64(next_review_at),
            parse_feedback_type(feedback_type),
            to_i64(now),
        );

        GlimpseCalculateNextReviewOutput {
            interval_ms: next_review.interval_ms as f64,
            next_review_at: next_review.next_review_at as f64,
        }
    }

    fn calculate_tag_overlap(
        &mut self,
        left_tags: Nullable<Array<String>>,
        right_tags: Nullable<Array<String>>,
    ) -> Number {
        let left = to_knowledge_item(left_tags);
        let right = to_knowledge_item(right_tags);
        calculate_tag_overlap(&left, &right) as f64
    }

    fn initialize_review_schedule(
        &mut self,
        created_at: Number,
        interval_ms: Nullable<Number>,
    ) -> GlimpseInitializeReviewScheduleOutput {
        GlimpseInitializeReviewScheduleOutput {
            next_review_at: calculate_initial_review_at(
                to_i64(created_at),
                to_optional_i64(interval_ms),
            ) as f64,
            stability: Nullable::new(None).into(),
            difficulty: Nullable::new(None).into(),
            last_reviewed_at: to_nullable_number(None),
        }
    }

    fn save_knowledge_item_json(&mut self, payload_json: &str) -> String {
        let item: glimpse_core_rs::KnowledgeItem = parse_json(payload_json);
        let conn = &self.conn;
        let saved = db::save_knowledge_item(&conn, &item)
            .unwrap_or_else(|error| throw!("Failed to save knowledge item: {}", error));
        to_json(&saved)
    }

    fn list_knowledge_items_json(&mut self) -> String {
        let conn = &self.conn;
        let items = db::list_knowledge_items(&conn)
            .unwrap_or_else(|error| throw!("Failed to list knowledge items: {}", error));
        to_json(&items)
    }

    fn list_knowledge_items_by_ids_json(&mut self, item_ids_json: &str) -> String {
        let item_ids: Vec<String> = parse_json(item_ids_json);
        let conn = &self.conn;
        let items = db::list_knowledge_items_by_ids(&conn, &item_ids)
            .unwrap_or_else(|error| throw!("Failed to list knowledge items by ids: {}", error));
        to_json(&items)
    }

    fn list_weekly_knowledge_items_json(&mut self, since: Number) -> String {
        let conn = &self.conn;
        let items = db::list_weekly_knowledge_items(&conn, to_i64(since))
            .unwrap_or_else(|error| throw!("Failed to list weekly knowledge items: {}", error));
        to_json(&items)
    }

    fn list_pending_knowledge_items_for_labeling_json(&mut self, limit: Number) -> String {
        let conn = &self.conn;
        let items = db::list_pending_knowledge_items_for_labeling(&conn, to_i64(limit))
            .unwrap_or_else(|error| throw!("Failed to list pending labeling items: {}", error));
        to_json(&items)
    }

    fn get_knowledge_item_by_id_json(&mut self, item_id: &str) -> String {
        let conn = &self.conn;
        let item = db::get_knowledge_item_by_id(&conn, item_id)
            .unwrap_or_else(|error| throw!("Failed to get knowledge item: {}", error));
        to_json(&item)
    }

    fn get_due_knowledge_items_json(&mut self, now: Number, limit: Nullable<Number>) -> String {
        let conn = &self.conn;
        let items = db::get_due_knowledge_items(&conn, to_i64(now), to_optional_i64(limit))
            .unwrap_or_else(|error| throw!("Failed to list due knowledge items: {}", error));
        to_json(&items)
    }

    fn update_knowledge_item_json(&mut self, item_id: &str, patch_json: &str) -> String {
        let patch: Map<String, Value> = parse_json(patch_json);
        let conn = &self.conn;
        let item = db::update_knowledge_item(&conn, item_id, &patch)
            .unwrap_or_else(|error| throw!("Failed to update knowledge item: {}", error));
        to_json(&item)
    }

    fn create_conversation_json(&mut self, payload_json: &str) -> String {
        let conversation: Conversation = parse_json(payload_json);
        let conn = &self.conn;
        let item = db::create_conversation(&conn, &conversation)
            .unwrap_or_else(|error| throw!("Failed to create conversation: {}", error));
        to_json(&item)
    }

    fn list_conversations_json(&mut self) -> String {
        let conn = &self.conn;
        let items = db::list_conversations(&conn)
            .unwrap_or_else(|error| throw!("Failed to list conversations: {}", error));
        to_json(&items)
    }

    fn update_conversation_json(&mut self, conversation_id: &str, patch_json: &str) -> String {
        let patch: Map<String, Value> = parse_json(patch_json);
        let conn = &self.conn;
        let item = db::update_conversation(&conn, conversation_id, &patch)
            .unwrap_or_else(|error| throw!("Failed to update conversation: {}", error));
        to_json(&item)
    }

    fn delete_conversation(&mut self, conversation_id: &str, deleted_at: Number) {
        let conn = &self.conn;
        db::delete_conversation(&conn, conversation_id, to_i64(deleted_at))
            .unwrap_or_else(|error| throw!("Failed to delete conversation: {}", error));
    }

    fn list_conversation_messages_json(&mut self, conversation_id: &str) -> String {
        let conn = &self.conn;
        let items = db::list_conversation_messages(&conn, conversation_id)
            .unwrap_or_else(|error| throw!("Failed to list conversation messages: {}", error));
        to_json(&items)
    }

    fn add_message_json(&mut self, payload_json: &str) -> String {
        let message: Message = parse_json(payload_json);
        let conn = &self.conn;
        let item = db::add_message(&conn, &message)
            .unwrap_or_else(|error| throw!("Failed to add message: {}", error));
        to_json(&item)
    }

    fn update_message_json(&mut self, message_id: &str, patch_json: &str) -> String {
        let patch: Map<String, Value> = parse_json(patch_json);
        let conn = &self.conn;
        let item = db::update_message(&conn, message_id, &patch)
            .unwrap_or_else(|error| throw!("Failed to update message: {}", error));
        to_json(&item)
    }

    fn delete_message(&mut self, message_id: &str, deleted_at: Number) {
        let conn = &self.conn;
        db::delete_message(&conn, message_id, to_i64(deleted_at))
            .unwrap_or_else(|error| throw!("Failed to delete message: {}", error));
    }

    fn save_recommendations_json(&mut self, payload_json: &str) {
        let recommendations: Vec<Recommendation> = parse_json(payload_json);
        let conn = &self.conn;
        db::save_recommendations(&conn, &recommendations)
            .unwrap_or_else(|error| throw!("Failed to save recommendations: {}", error));
    }

    fn list_recommendations_json(&mut self) -> String {
        let conn = &self.conn;
        let items = db::list_recommendations(&conn)
            .unwrap_or_else(|error| throw!("Failed to list recommendations: {}", error));
        to_json(&items)
    }

    fn list_pending_recommendations_json(&mut self) -> String {
        let conn = &self.conn;
        let items = db::list_pending_recommendations(&conn)
            .unwrap_or_else(|error| throw!("Failed to list pending recommendations: {}", error));
        to_json(&items)
    }

    fn list_recent_feedback_events_json(&mut self, limit: Number) -> String {
        let conn = &self.conn;
        let items = db::list_recent_feedback_events(&conn, to_i64(limit))
            .unwrap_or_else(|error| throw!("Failed to list feedback events: {}", error));
        to_json(&items)
    }

    fn log_recommendation_feedback_json(&mut self, payload_json: &str) -> String {
        let event: FeedbackEvent = parse_json(payload_json);
        let conn = &self.conn;
        let item = db::log_recommendation_feedback(&conn, &event)
            .unwrap_or_else(|error| throw!("Failed to log recommendation feedback: {}", error));
        to_json(&item)
    }

    fn respond_to_recommendation_json(
        &mut self,
        recommendation_id: &str,
        status: &str,
        event_json: &str,
    ) {
        let event: FeedbackEvent = parse_json(event_json);
        let conn = &self.conn;
        db::respond_to_recommendation(
            &conn,
            recommendation_id,
            parse_recommendation_status(status),
            &event,
        )
        .unwrap_or_else(|error| throw!("Failed to respond to recommendation: {}", error));
    }
}
