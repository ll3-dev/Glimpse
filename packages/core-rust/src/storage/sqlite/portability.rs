//! Transactional export, import, and deletion of user-authored data.

use std::collections::HashSet;

use crate::error::{Error, Result};
use crate::models::{DataExport, DataImportSummary};

use super::SqliteStorage;

impl SqliteStorage {
    pub fn export_data(&self) -> Result<DataExport> {
        self.validate_integrity()?;
        Ok(DataExport {
            format_version: DataExport::FORMAT_VERSION,
            exported_at: chrono::Utc::now().timestamp_millis(),
            knowledge_items: self.list_knowledge_items()?,
            conversations: self.list_all_conversations()?,
            messages: self.list_all_messages()?,
            recommendations: self.list_recommendations()?,
            feedback_events: self.list_all_feedback_events()?,
            tombstones: self.list_sync_tombstones()?,
        })
    }

    pub fn replace_all_data(&self, data: &DataExport) -> Result<DataImportSummary> {
        validate_export(data)?;
        let summary = data.summary();

        self.conn.execute_batch("BEGIN IMMEDIATE")?;
        let result = (|| -> Result<()> {
            self.delete_all_rows()?;
            self.replace_sync_tombstones(&data.tombstones)?;
            for item in &data.knowledge_items {
                self.insert_knowledge_item(item)?;
            }
            for conversation in &data.conversations {
                self.insert_conversation(conversation)?;
            }
            for message in &data.messages {
                self.insert_message(message)?;
            }
            for recommendation in &data.recommendations {
                self.insert_recommendation(recommendation)?;
            }
            for event in &data.feedback_events {
                self.insert_feedback_event(event)?;
            }
            self.validate_integrity()?;
            Ok(())
        })();

        match result {
            Ok(()) => {
                self.conn.execute_batch("COMMIT")?;
                Ok(summary)
            }
            Err(error) => {
                let _ = self.conn.execute_batch("ROLLBACK");
                Err(error)
            }
        }
    }

    pub fn delete_all_data(&self) -> Result<()> {
        self.conn.execute_batch("BEGIN IMMEDIATE")?;
        let result = self
            .record_all_current_rows_deleted_at(chrono::Utc::now().timestamp_millis())
            .and_then(|_| self.delete_all_rows())
            .and_then(|_| self.validate_integrity());
        match result {
            Ok(()) => {
                self.conn.execute_batch("COMMIT")?;
                Ok(())
            }
            Err(error) => {
                let _ = self.conn.execute_batch("ROLLBACK");
                Err(error)
            }
        }
    }

    fn delete_all_rows(&self) -> Result<()> {
        self.conn.execute_batch(
            r#"
            DELETE FROM feedback_events;
            DELETE FROM messages;
            DELETE FROM recommendations;
            DELETE FROM conversations;
            DELETE FROM knowledge_items;
            "#,
        )?;
        Ok(())
    }
}

pub(super) fn validate_export(data: &DataExport) -> Result<()> {
    if data.format_version == 0 || data.format_version > DataExport::FORMAT_VERSION {
        return Err(Error::InvalidInput(format!(
            "Unsupported data export version {}; expected 1..={}",
            data.format_version,
            DataExport::FORMAT_VERSION
        )));
    }

    let knowledge_ids = unique_ids(
        "knowledge item",
        data.knowledge_items.iter().map(|item| item.id.as_str()),
    )?;
    let conversation_ids = unique_ids(
        "conversation",
        data.conversations.iter().map(|item| item.id.as_str()),
    )?;
    unique_ids("message", data.messages.iter().map(|item| item.id.as_str()))?;
    let recommendation_ids = unique_ids(
        "recommendation",
        data.recommendations.iter().map(|item| item.id.as_str()),
    )?;
    unique_ids(
        "feedback event",
        data.feedback_events.iter().map(|item| item.id.as_str()),
    )?;

    for message in &data.messages {
        if !conversation_ids.contains(message.conversation_id.as_str()) {
            return Err(Error::InvalidInput(format!(
                "Message {} references missing conversation {}",
                message.id, message.conversation_id
            )));
        }
    }

    let mut recommendation_pairs = HashSet::new();
    for recommendation in &data.recommendations {
        if recommendation.item_a_id == recommendation.item_b_id {
            return Err(Error::InvalidInput(format!(
                "Recommendation {} references the same item twice",
                recommendation.id
            )));
        }
        if !knowledge_ids.contains(recommendation.item_a_id.as_str())
            || !knowledge_ids.contains(recommendation.item_b_id.as_str())
        {
            return Err(Error::InvalidInput(format!(
                "Recommendation {} references a missing knowledge item",
                recommendation.id
            )));
        }
        let pair = if recommendation.item_a_id < recommendation.item_b_id {
            (&recommendation.item_a_id, &recommendation.item_b_id)
        } else {
            (&recommendation.item_b_id, &recommendation.item_a_id)
        };
        if !recommendation_pairs.insert(pair) {
            return Err(Error::InvalidInput(format!(
                "Data export contains duplicate recommendation pair {} / {}",
                pair.0, pair.1
            )));
        }
    }

    for event in &data.feedback_events {
        if !recommendation_ids.contains(event.recommendation_id.as_str()) {
            return Err(Error::InvalidInput(format!(
                "Feedback event {} references missing recommendation {}",
                event.id, event.recommendation_id
            )));
        }
    }

    Ok(())
}

fn unique_ids<'a>(entity: &str, ids: impl Iterator<Item = &'a str>) -> Result<HashSet<&'a str>> {
    let mut unique = HashSet::new();
    for id in ids {
        if id.is_empty() {
            return Err(Error::InvalidInput(format!(
                "{entity} id must not be empty"
            )));
        }
        if !unique.insert(id) {
            return Err(Error::InvalidInput(format!(
                "Data export contains duplicate {entity} id {id}"
            )));
        }
    }
    Ok(unique)
}

#[cfg(test)]
mod tests {
    use crate::models::{
        Conversation, DataExport, FeedbackActionType, FeedbackEvent, KnowledgeItem,
        KnowledgeItemType, Message, MessageRole, Recommendation, RecommendationStatus,
    };

    use super::SqliteStorage;

    fn fixture() -> DataExport {
        DataExport {
            format_version: DataExport::FORMAT_VERSION,
            exported_at: 42,
            knowledge_items: vec![
                KnowledgeItem {
                    id: "item-a".into(),
                    item_type: KnowledgeItemType::Note,
                    title: Some("A".into()),
                    body: Some("Body".into()),
                    url: None,
                    summary: None,
                    tags: Some(vec!["tag".into()]),
                    labels: None,
                    provisional_labels: None,
                    label_status: None,
                    label_source: None,
                    label_version: None,
                    label_score: None,
                    label_requested_at: None,
                    label_completed_at: None,
                    label_error: None,
                    created_at: 1,
                    updated_at: 1,
                    stability: None,
                    difficulty: None,
                    last_reviewed_at: None,
                    next_review_at: None,
                },
                KnowledgeItem {
                    id: "item-b".into(),
                    item_type: KnowledgeItemType::Link,
                    title: Some("B".into()),
                    body: None,
                    url: Some("https://example.com".into()),
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
                    created_at: 2,
                    updated_at: 2,
                    stability: None,
                    difficulty: None,
                    last_reviewed_at: None,
                    next_review_at: None,
                },
            ],
            conversations: vec![Conversation {
                id: "conversation".into(),
                title: Some("Deleted conversation".into()),
                icon: None,
                context_item_id: Some("item-a".into()),
                created_at: 3,
                updated_at: 5,
                deleted_at: Some(5),
            }],
            messages: vec![Message {
                id: "message".into(),
                conversation_id: "conversation".into(),
                role: MessageRole::User,
                content: "hello".into(),
                created_at: 4,
                updated_at: Some(5),
                deleted_at: Some(5),
            }],
            recommendations: vec![Recommendation {
                id: "recommendation".into(),
                item_a_id: "item-b".into(),
                item_b_id: "item-a".into(),
                reason: Some("related".into()),
                status: RecommendationStatus::Accepted,
                created_at: 6,
                responded_at: Some(7),
            }],
            feedback_events: vec![FeedbackEvent {
                id: "feedback".into(),
                recommendation_id: "recommendation".into(),
                action: FeedbackActionType::Accept,
                created_at: 7,
            }],
            tombstones: vec![],
        }
    }

    #[test]
    fn export_import_delete_round_trip_preserves_soft_deleted_data() {
        let storage = SqliteStorage::in_memory().expect("storage should initialize");
        let expected = fixture();
        let summary = storage
            .replace_all_data(&expected)
            .expect("fixture should import");
        assert_eq!(summary, expected.summary());

        let exported = storage.export_data().expect("data should export");
        assert_eq!(exported.summary(), expected.summary());
        assert_eq!(exported.conversations[0].deleted_at, Some(5));
        assert_eq!(exported.messages[0].deleted_at, Some(5));
        assert_eq!(exported.recommendations[0].item_a_id, "item-a");
        assert_eq!(exported.recommendations[0].item_b_id, "item-b");

        storage.delete_all_data().expect("all data should delete");
        assert_eq!(storage.export_data().unwrap().summary().knowledge_items, 0);
        assert_eq!(storage.export_data().unwrap().summary().conversations, 0);
    }

    #[test]
    fn invalid_import_rolls_back_without_touching_existing_data() {
        let storage = SqliteStorage::in_memory().expect("storage should initialize");
        let existing = fixture();
        storage
            .replace_all_data(&existing)
            .expect("fixture should import");

        let mut invalid = fixture();
        invalid.messages[0].conversation_id = "missing".into();
        assert!(storage.replace_all_data(&invalid).is_err());

        let exported = storage.export_data().expect("existing data should remain");
        assert_eq!(exported.messages[0].conversation_id, "conversation");
        assert_eq!(exported.summary(), existing.summary());
    }
}
