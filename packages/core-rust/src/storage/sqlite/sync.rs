//! Deterministic snapshot merging for device-to-device synchronization.

use std::collections::HashMap;

use rusqlite::params;
use serde::Serialize;

use crate::error::Result;
use crate::models::{
    Conversation, DataExport, FeedbackEvent, KnowledgeItem, Message, Recommendation, SyncTombstone,
};

use super::portability::validate_export;
use super::SqliteStorage;

pub(crate) const ENTITY_KNOWLEDGE_ITEM: &str = "knowledgeItem";
pub(crate) const ENTITY_CONVERSATION: &str = "conversation";
pub(crate) const ENTITY_MESSAGE: &str = "message";
pub(crate) const ENTITY_RECOMMENDATION: &str = "recommendation";
pub(crate) const ENTITY_FEEDBACK_EVENT: &str = "feedbackEvent";

impl SqliteStorage {
    pub fn merge_data(&self, remote: &DataExport) -> Result<DataExport> {
        validate_export(remote)?;
        let local = self.export_data()?;
        let merged = merge_exports(local, remote.clone());
        self.replace_all_data(&merged)?;
        self.export_data()
    }

    pub(super) fn list_sync_tombstones(&self) -> Result<Vec<SyncTombstone>> {
        let mut statement = self.conn.prepare(
            "SELECT entity_type, entity_id, deleted_at FROM sync_tombstones ORDER BY entity_type, entity_id",
        )?;
        let tombstones = statement
            .query_map([], |row| {
                Ok(SyncTombstone {
                    entity_type: row.get(0)?,
                    entity_id: row.get(1)?,
                    deleted_at: row.get(2)?,
                })
            })?
            .collect::<std::result::Result<Vec<_>, _>>()?;
        Ok(tombstones)
    }

    pub(super) fn record_sync_tombstone(
        &self,
        entity_type: &str,
        entity_id: &str,
        deleted_at: i64,
    ) -> Result<()> {
        self.conn.execute(
            r#"
            INSERT INTO sync_tombstones (entity_type, entity_id, deleted_at)
            VALUES (?1, ?2, ?3)
            ON CONFLICT(entity_type, entity_id) DO UPDATE SET
                deleted_at = MAX(sync_tombstones.deleted_at, excluded.deleted_at)
            "#,
            params![entity_type, entity_id, deleted_at],
        )?;
        Ok(())
    }

    pub(super) fn replace_sync_tombstones(&self, tombstones: &[SyncTombstone]) -> Result<()> {
        self.conn.execute("DELETE FROM sync_tombstones", [])?;
        for tombstone in tombstones {
            self.record_sync_tombstone(
                &tombstone.entity_type,
                &tombstone.entity_id,
                tombstone.deleted_at,
            )?;
        }
        Ok(())
    }

    pub(super) fn record_all_current_rows_deleted_at(&self, deleted_at: i64) -> Result<()> {
        for (entity_type, table) in [
            (ENTITY_KNOWLEDGE_ITEM, "knowledge_items"),
            (ENTITY_CONVERSATION, "conversations"),
            (ENTITY_MESSAGE, "messages"),
            (ENTITY_RECOMMENDATION, "recommendations"),
            (ENTITY_FEEDBACK_EVENT, "feedback_events"),
        ] {
            let mut statement = self.conn.prepare(&format!("SELECT id FROM {table}"))?;
            let ids = statement
                .query_map([], |row| row.get::<_, String>(0))?
                .collect::<std::result::Result<Vec<_>, _>>()?;
            drop(statement);
            for id in ids {
                self.record_sync_tombstone(entity_type, &id, deleted_at)?;
            }
        }
        Ok(())
    }
}

pub(crate) fn merge_exports(mut local: DataExport, remote: DataExport) -> DataExport {
    let mut tombstones = merge_records(
        local.tombstones,
        remote.tombstones,
        |item| format!("{}\0{}", item.entity_type, item.entity_id),
        |item| item.deleted_at,
    );

    let mut knowledge_items = merge_records(
        local.knowledge_items,
        remote.knowledge_items,
        |item| item.id.clone(),
        |item| item.updated_at,
    );
    let mut conversations = merge_records(
        local.conversations,
        remote.conversations,
        |item| item.id.clone(),
        conversation_clock,
    );
    let mut messages = merge_records(
        local.messages,
        remote.messages,
        |item| item.id.clone(),
        message_clock,
    );
    let mut recommendations = merge_records(
        local.recommendations,
        remote.recommendations,
        |item| item.id.clone(),
        recommendation_clock,
    );
    let mut feedback_events = merge_records(
        local.feedback_events,
        remote.feedback_events,
        |item| item.id.clone(),
        |item| item.created_at,
    );

    apply_tombstones(
        &mut knowledge_items,
        &tombstones,
        ENTITY_KNOWLEDGE_ITEM,
        |item| item.id.as_str(),
        |item| item.updated_at,
    );
    apply_tombstones(
        &mut conversations,
        &tombstones,
        ENTITY_CONVERSATION,
        |item| item.id.as_str(),
        conversation_clock,
    );
    apply_tombstones(
        &mut messages,
        &tombstones,
        ENTITY_MESSAGE,
        |item| item.id.as_str(),
        message_clock,
    );
    apply_tombstones(
        &mut recommendations,
        &tombstones,
        ENTITY_RECOMMENDATION,
        |item| item.id.as_str(),
        recommendation_clock,
    );
    apply_tombstones(
        &mut feedback_events,
        &tombstones,
        ENTITY_FEEDBACK_EVENT,
        |item| item.id.as_str(),
        |item| item.created_at,
    );

    let recommendation_remap = canonicalize_recommendation_pairs(&mut recommendations);
    for event in &mut feedback_events {
        let mut recommendation_id = event.recommendation_id.clone();
        while let Some(replacement) = recommendation_remap.get(&recommendation_id) {
            if replacement == &recommendation_id {
                break;
            }
            recommendation_id = replacement.clone();
        }
        event.recommendation_id = recommendation_id;
    }

    let knowledge_ids: std::collections::HashSet<&str> = knowledge_items
        .iter()
        .map(|item| item.id.as_str())
        .collect();
    recommendations.retain(|item| {
        knowledge_ids.contains(item.item_a_id.as_str())
            && knowledge_ids.contains(item.item_b_id.as_str())
    });
    let recommendation_ids: std::collections::HashSet<&str> = recommendations
        .iter()
        .map(|item| item.id.as_str())
        .collect();
    feedback_events.retain(|item| recommendation_ids.contains(item.recommendation_id.as_str()));

    remove_stale_tombstones(
        &mut tombstones,
        &knowledge_items,
        &conversations,
        &messages,
        &recommendations,
        &feedback_events,
    );

    sort_by_id(&mut knowledge_items, |item| &item.id);
    sort_by_id(&mut conversations, |item| &item.id);
    sort_by_id(&mut messages, |item| &item.id);
    sort_by_id(&mut recommendations, |item| &item.id);
    sort_by_id(&mut feedback_events, |item| &item.id);
    tombstones.sort_by(|left, right| {
        (&left.entity_type, &left.entity_id).cmp(&(&right.entity_type, &right.entity_id))
    });

    local.format_version = DataExport::FORMAT_VERSION;
    local.exported_at = chrono::Utc::now().timestamp_millis();
    local.knowledge_items = knowledge_items;
    local.conversations = conversations;
    local.messages = messages;
    local.recommendations = recommendations;
    local.feedback_events = feedback_events;
    local.tombstones = tombstones;
    local
}

fn merge_records<T, K, C>(local: Vec<T>, remote: Vec<T>, key: K, clock: C) -> Vec<T>
where
    T: Serialize,
    K: Fn(&T) -> String,
    C: Fn(&T) -> i64,
{
    let mut merged = HashMap::<String, T>::new();
    for candidate in local.into_iter().chain(remote) {
        let candidate_key = key(&candidate);
        match merged.get(&candidate_key) {
            Some(current) if !prefer_candidate(current, &candidate, &clock) => {}
            _ => {
                merged.insert(candidate_key, candidate);
            }
        }
    }
    merged.into_values().collect()
}

fn prefer_candidate<T: Serialize>(current: &T, candidate: &T, clock: &impl Fn(&T) -> i64) -> bool {
    let current_clock = clock(current);
    let candidate_clock = clock(candidate);
    candidate_clock > current_clock
        || (candidate_clock == current_clock
            && serde_json::to_string(candidate).unwrap_or_default()
                > serde_json::to_string(current).unwrap_or_default())
}

fn apply_tombstones<T>(
    records: &mut Vec<T>,
    tombstones: &[SyncTombstone],
    entity_type: &str,
    id: impl Fn(&T) -> &str,
    clock: impl Fn(&T) -> i64,
) {
    let deleted: HashMap<&str, i64> = tombstones
        .iter()
        .filter(|item| item.entity_type == entity_type)
        .map(|item| (item.entity_id.as_str(), item.deleted_at))
        .collect();
    records.retain(|record| {
        deleted
            .get(id(record))
            .is_none_or(|deleted_at| *deleted_at < clock(record))
    });
}

fn canonicalize_recommendation_pairs(
    recommendations: &mut Vec<Recommendation>,
) -> HashMap<String, String> {
    let mut by_pair = HashMap::<String, Recommendation>::new();
    let mut remap = HashMap::new();
    for recommendation in recommendations.drain(..) {
        let pair = if recommendation.item_a_id < recommendation.item_b_id {
            format!("{}\0{}", recommendation.item_a_id, recommendation.item_b_id)
        } else {
            format!("{}\0{}", recommendation.item_b_id, recommendation.item_a_id)
        };
        match by_pair.remove(&pair) {
            Some(current) => {
                if prefer_candidate(&current, &recommendation, &recommendation_clock) {
                    remap.insert(current.id.clone(), recommendation.id.clone());
                    by_pair.insert(pair, recommendation);
                } else {
                    remap.insert(recommendation.id.clone(), current.id.clone());
                    by_pair.insert(pair, current);
                }
            }
            None => {
                by_pair.insert(pair, recommendation);
            }
        }
    }
    *recommendations = by_pair.into_values().collect();
    remap
}

fn remove_stale_tombstones(
    tombstones: &mut Vec<SyncTombstone>,
    knowledge_items: &[KnowledgeItem],
    conversations: &[Conversation],
    messages: &[Message],
    recommendations: &[Recommendation],
    feedback_events: &[FeedbackEvent],
) {
    tombstones.retain(|tombstone| {
        let active_clock = match tombstone.entity_type.as_str() {
            ENTITY_KNOWLEDGE_ITEM => knowledge_items
                .iter()
                .find(|item| item.id == tombstone.entity_id)
                .map(|item| item.updated_at),
            ENTITY_CONVERSATION => conversations
                .iter()
                .find(|item| item.id == tombstone.entity_id)
                .map(conversation_clock),
            ENTITY_MESSAGE => messages
                .iter()
                .find(|item| item.id == tombstone.entity_id)
                .map(message_clock),
            ENTITY_RECOMMENDATION => recommendations
                .iter()
                .find(|item| item.id == tombstone.entity_id)
                .map(recommendation_clock),
            ENTITY_FEEDBACK_EVENT => feedback_events
                .iter()
                .find(|item| item.id == tombstone.entity_id)
                .map(|item| item.created_at),
            _ => None,
        };
        active_clock.is_none_or(|clock| tombstone.deleted_at >= clock)
    });
}

fn conversation_clock(item: &Conversation) -> i64 {
    item.deleted_at
        .unwrap_or(item.updated_at)
        .max(item.updated_at)
}

fn message_clock(item: &Message) -> i64 {
    item.deleted_at
        .or(item.updated_at)
        .unwrap_or(item.created_at)
        .max(item.created_at)
}

fn recommendation_clock(item: &Recommendation) -> i64 {
    item.responded_at
        .unwrap_or(item.created_at)
        .max(item.created_at)
}

fn sort_by_id<T>(records: &mut [T], id: impl Fn(&T) -> &String) {
    records.sort_by(|left, right| id(left).cmp(id(right)));
}

#[cfg(test)]
mod tests {
    use crate::models::{
        DataExport, KnowledgeItem, KnowledgeItemType, Recommendation, RecommendationStatus,
        SyncTombstone,
    };

    use super::{merge_exports, ENTITY_KNOWLEDGE_ITEM};

    fn item(id: &str, updated_at: i64, title: &str) -> KnowledgeItem {
        KnowledgeItem {
            id: id.into(),
            item_type: KnowledgeItemType::Note,
            title: Some(title.into()),
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
            created_at: 1,
            updated_at,
            stability: None,
            difficulty: None,
            last_reviewed_at: None,
            next_review_at: None,
        }
    }

    fn snapshot(items: Vec<KnowledgeItem>) -> DataExport {
        DataExport {
            format_version: DataExport::FORMAT_VERSION,
            exported_at: 1,
            knowledge_items: items,
            conversations: vec![],
            messages: vec![],
            recommendations: vec![],
            feedback_events: vec![],
            tombstones: vec![],
        }
    }

    #[test]
    fn newest_record_wins_independently_of_merge_direction() {
        let old = snapshot(vec![item("same", 10, "old")]);
        let new = snapshot(vec![item("same", 20, "new")]);
        assert_eq!(
            merge_exports(old.clone(), new.clone()).knowledge_items[0]
                .title
                .as_deref(),
            Some("new")
        );
        assert_eq!(
            merge_exports(new, old).knowledge_items[0].title.as_deref(),
            Some("new")
        );
    }

    #[test]
    fn tombstone_prevents_older_item_resurrection() {
        let old = snapshot(vec![item("gone", 10, "old")]);
        let mut deleted = snapshot(vec![]);
        deleted.tombstones.push(SyncTombstone {
            entity_type: ENTITY_KNOWLEDGE_ITEM.into(),
            entity_id: "gone".into(),
            deleted_at: 20,
        });
        let merged = merge_exports(old, deleted);
        assert!(merged.knowledge_items.is_empty());
        assert_eq!(merged.tombstones.len(), 1);
    }

    #[test]
    fn duplicate_pairs_collapse_to_newest_edge() {
        let mut left = snapshot(vec![item("a", 1, "a"), item("b", 1, "b")]);
        left.recommendations.push(Recommendation {
            id: "old-edge".into(),
            item_a_id: "a".into(),
            item_b_id: "b".into(),
            reason: Some("old".into()),
            status: RecommendationStatus::Pending,
            created_at: 10,
            responded_at: None,
        });
        let mut right = snapshot(vec![item("a", 1, "a"), item("b", 1, "b")]);
        right.recommendations.push(Recommendation {
            id: "new-edge".into(),
            item_a_id: "b".into(),
            item_b_id: "a".into(),
            reason: Some("new".into()),
            status: RecommendationStatus::Pending,
            created_at: 20,
            responded_at: None,
        });
        let merged = merge_exports(left, right);
        assert_eq!(merged.recommendations.len(), 1);
        assert_eq!(merged.recommendations[0].id, "new-edge");
    }
}
