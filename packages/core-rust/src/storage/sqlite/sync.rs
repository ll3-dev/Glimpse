//! Deterministic snapshot merging for device-to-device synchronization.

use std::collections::HashMap;

use rusqlite::params;
use serde::Serialize;
use sha2::{Digest, Sha256};

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

    /// Deterministic content fingerprint of the merged dataset: equal
    /// fingerprints mean both devices hold byte-identical domain content, so
    /// peers can skip re-sending snapshots. Volatile fields (exported_at,
    /// format_version) are excluded on purpose.
    pub fn snapshot_fingerprint(&self) -> Result<String> {
        let mut export = self.export_data()?;
        normalize_for_fingerprint(&mut export);
        canonical_snapshot_digest(&export)
    }

    /// Content fingerprint of an arbitrary (e.g. just-received) snapshot,
    /// using the exact same normalization and digest as
    /// [`SqliteStorage::snapshot_fingerprint`]. Equal fingerprints therefore
    /// mean "this remote snapshot carries the same domain content we already
    /// hold", independent of volatile envelope fields (`exported_at`,
    /// `format_version`) or who exported the data when.
    pub fn fingerprint_of_snapshot(snapshot: &DataExport) -> Result<String> {
        let mut normalized = snapshot.clone();
        normalize_for_fingerprint(&mut normalized);
        canonical_snapshot_digest(&normalized)
    }

    /// Monotonic write counter maintained by triggers on every exported
    /// table (`0004_delta_sync`). Callers pair it with
    /// [`SqliteStorage::snapshot_fingerprint`] to cache the fingerprint:
    /// a revision change proves the dataset moved and forces a recompute,
    /// while an unchanged revision lets the caller trust the cached value —
    /// including for local edits that never pass through the sync server.
    pub fn sync_data_revision(&self) -> Result<i64> {
        let revision = self.conn.query_row(
            "SELECT revision FROM sync_data_revision WHERE singleton = 1",
            [],
            |row| row.get(0),
        )?;
        Ok(revision)
    }
}

/// Strips fields whose values legitimately differ between devices without any
/// content change: the export envelope and per-record clock columns the merge
/// treats as volatile (kept in lockstep with `prefer_candidate`'s clocks).
fn normalize_for_fingerprint(export: &mut DataExport) {
    export.format_version = 0;
    export.exported_at = 0;
    export
        .knowledge_items
        .iter_mut()
        .for_each(|item| item.updated_at = 0);
    export
        .conversations
        .iter_mut()
        .for_each(|item| item.updated_at = 0);
    export.messages.iter_mut().for_each(|item| {
        item.updated_at = None;
        item.created_at = 0;
    });
    export.recommendations.iter_mut().for_each(|item| {
        item.created_at = 0;
        item.responded_at = None;
    });
    export.feedback_events.iter_mut().for_each(|item| item.created_at = 0);
    export.tombstones.iter_mut().for_each(|item| item.deleted_at = 0);
}

fn canonical_snapshot_digest(export: &DataExport) -> Result<String> {
    let canonical = serde_json::to_vec(export)
        .map_err(|error| crate::error::Error::InvalidInput(error.to_string()))?;
    Ok(format!("{:x}", Sha256::digest(&canonical)))
}

impl SqliteStorage {
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

/// Grace window during which a tombstone stays valid even after every device
/// has presumably seen it. Deletes are rare; keeping tombstones for a while is
/// cheap compared to resurrecting a deleted record on a device that was
/// offline during the delete.
pub(crate) const TOMBSTONE_GRACE_MS: i64 = 30 * 24 * 60 * 60 * 1000;

pub(crate) fn merge_exports(mut local: DataExport, remote: DataExport) -> DataExport {
    // One skew ceiling per merge: records win by whatever clock they carry,
    // but no record may claim a timestamp further in the future than this.
    let skew_ceiling = chrono::Utc::now().timestamp_millis().saturating_add(MAX_CLOCK_SKEW_MS);
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
    knowledge_items
        .iter_mut()
        .for_each(|item| item.updated_at = clamp_future_timestamp(item.updated_at, skew_ceiling));
    let mut conversations = merge_records(
        local.conversations,
        remote.conversations,
        |item| item.id.clone(),
        conversation_clock,
    );
    conversations.iter_mut().for_each(|item| {
        item.updated_at = clamp_future_timestamp(item.updated_at, skew_ceiling);
        item.deleted_at = item.deleted_at.map(|ts| clamp_future_timestamp(ts, skew_ceiling));
    });
    let mut messages = merge_records(
        local.messages,
        remote.messages,
        |item| item.id.clone(),
        message_clock,
    );
    messages.iter_mut().for_each(|item| {
        item.created_at = clamp_future_timestamp(item.created_at, skew_ceiling);
        item.updated_at = item.updated_at.map(|ts| clamp_future_timestamp(ts, skew_ceiling));
        item.deleted_at = item.deleted_at.map(|ts| clamp_future_timestamp(ts, skew_ceiling));
    });
    let mut recommendations = merge_records(
        local.recommendations,
        remote.recommendations,
        |item| item.id.clone(),
        recommendation_clock,
    );
    recommendations.iter_mut().for_each(|item| {
        item.created_at = clamp_future_timestamp(item.created_at, skew_ceiling);
        item.responded_at = item.responded_at.map(|ts| clamp_future_timestamp(ts, skew_ceiling));
    });
    let mut feedback_events = merge_records(
        local.feedback_events,
        remote.feedback_events,
        |item| item.id.clone(),
        |item| item.created_at,
    );
    feedback_events
        .iter_mut()
        .for_each(|item| item.created_at = clamp_future_timestamp(item.created_at, skew_ceiling));

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
        local.exported_at.max(remote.exported_at),
    );

    sort_by_id(&mut knowledge_items, |item| &item.id);
    sort_by_id(&mut conversations, |item| &item.id);
    sort_by_id(&mut messages, |item| &item.id);
    sort_by_id(&mut recommendations, |item| &item.id);
    sort_by_id(&mut feedback_events, |item| &item.id);
    tombstones.sort_by(|left, right| {
        (&left.entity_type, &left.entity_id).cmp(&(&right.entity_type, &right.entity_id))
    });

    let exported_at = chrono::Utc::now().timestamp_millis();
    local.format_version = DataExport::FORMAT_VERSION;
    local.exported_at = exported_at;
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

/// Wall clocks on independent devices drift. When two clocks disagree by more
/// than this window the disagreement itself is the signal: whichever side is
/// in the future cannot be trusted to be "newer", so recency is decided by
/// content order instead of by the suspicious timestamp.
const MAX_CLOCK_SKEW_MS: i64 = 24 * 60 * 60 * 1000;

fn prefer_candidate<T: Serialize>(current: &T, candidate: &T, clock: &impl Fn(&T) -> i64) -> bool {
    let current_clock = clock(current);
    let candidate_clock = clock(candidate);
    let skew = candidate_clock.saturating_sub(current_clock).abs();
    if skew > MAX_CLOCK_SKEW_MS {
        // Absurd disagreement — fall back to deterministic content order.
        return serde_json::to_string(candidate).unwrap_or_default()
            > serde_json::to_string(current).unwrap_or_default();
    }
    candidate_clock > current_clock
        || (candidate_clock == current_clock
            && serde_json::to_string(candidate).unwrap_or_default()
                > serde_json::to_string(current).unwrap_or_default())
}

/// Bounds how far into the future a merged record's timestamp may sit. A peer
/// with a runaway clock would otherwise poison the dataset with year-3000
/// stamps that no honest later edit can outrank; clamping to the skew ceiling
/// keeps recency comparisons recoverable once the poisoned copy arrives. The
/// ceiling is computed once per merge (`merge_exports`) so every record sees
/// the same bound.
fn clamp_future_timestamp(ts: i64, ceiling: i64) -> i64 {
    ts.min(ceiling)
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
    exported_at: i64,
) {
    // A tombstone is kept when EITHER hold:
    // 1. it is still inside the grace window (devices may not have seen the
    //    delete yet), or
    // 2. a live record with the same id is NEWER than the delete — the entity
    //    was re-created after it, and the tombstone must keep suppressing
    //    older copies arriving from devices that were offline.
    // Everything else (delete older than the grace window with no resurrected
    // record) is garbage and must be collected, or snapshots grow forever.
    tombstones.retain(|tombstone| {
        let within_grace = exported_at.saturating_sub(tombstone.deleted_at) < TOMBSTONE_GRACE_MS;
        if within_grace {
            return true;
        }
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
        active_clock.is_some_and(|clock| clock > tombstone.deleted_at)
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
    use crate::storage::sqlite::SqliteStorage;

    use super::{merge_exports, ENTITY_KNOWLEDGE_ITEM, MAX_CLOCK_SKEW_MS, TOMBSTONE_GRACE_MS};

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

    #[test]
    fn tombstones_expire_after_grace_window_but_protect_recreated_records() {
        let far_past = 1_000_i64;
        // Tombstone older than the grace window with no live record: dropped.
        let mut old_delete = snapshot(vec![]);
        old_delete.exported_at = far_past + TOMBSTONE_GRACE_MS + 1;
        old_delete.tombstones.push(SyncTombstone {
            entity_type: ENTITY_KNOWLEDGE_ITEM.into(),
            entity_id: "gone-forever".into(),
            deleted_at: far_past,
        });
        let mut merged = merge_exports(old_delete.clone(), old_delete.clone());
        assert!(
            merged.tombstones.is_empty(),
            "expired tombstone with no live record should be collected"
        );

        // Tombstone older than the grace window but the record was re-created
        // after the delete: kept so it can still defend against older copies.
        let mut recreated = snapshot(vec![item("reborn", far_past + 10, "reborn")]);
        recreated.exported_at = far_past + TOMBSTONE_GRACE_MS + 1;
        recreated.tombstones.push(SyncTombstone {
            entity_type: ENTITY_KNOWLEDGE_ITEM.into(),
            entity_id: "reborn".into(),
            deleted_at: far_past,
        });
        merged = merge_exports(recreated.clone(), recreated.clone());
        assert_eq!(
            merged.tombstones.len(),
            1,
            "tombstone for a record re-created after the delete must survive"
        );

        // Fresh delete inside the grace window: always kept.
        let mut fresh = snapshot(vec![]);
        fresh.exported_at = far_past;
        fresh.tombstones.push(SyncTombstone {
            entity_type: ENTITY_KNOWLEDGE_ITEM.into(),
            entity_id: "recently-deleted".into(),
            deleted_at: far_past,
        });
        merged = merge_exports(fresh.clone(), fresh.clone());
        assert_eq!(
            merged.tombstones.len(),
            1,
            "recent tombstone inside the grace window must survive"
        );
    }

    #[test]
    fn absurd_future_clocks_cannot_outrank_legitimate_recency() {
        // The remote device's clock is years ahead. With clocks that far apart
        // the timestamps carry no information, so the winner must be picked by
        // deterministic content order — identical in both merge directions —
        // not by timestamp magnitude.
        let now = 1_700_000_000_000_i64;
        let mut local = snapshot(vec![item("same", now, "local")]);
        local.exported_at = now;
        let mut remote = snapshot(vec![item("same", now + 10 * MAX_CLOCK_SKEW_MS, "remote")]);
        remote.exported_at = now;

        let forward = merge_exports(local.clone(), remote.clone());
        let backward = merge_exports(remote, local);
        assert_eq!(
            forward.knowledge_items[0].title,
            backward.knowledge_items[0].title,
            "skewed-clock merges must converge regardless of direction"
        );
    }

    #[test]
    fn future_timestamps_beyond_skew_are_clamped_so_later_edits_win() {
        // A device with a runaway clock (year ~3000) contributes a record whose
        // timestamp is far in the future. Clamping bounds the damage: it may
        // sit at most one skew window ahead of this device's clock, so a real
        // edit made after that window — or any edit that lands inside the
        // unclamped year-3000 gap — can outrank the poisoned copy.
        let now = chrono::Utc::now().timestamp_millis();
        let poisoned = snapshot(vec![item(
            "same",
            now + 100 * MAX_CLOCK_SKEW_MS,
            "poisoned",
        )]);
        let merged = merge_exports(snapshot(vec![]), poisoned);
        assert_eq!(
            merged.knowledge_items[0].updated_at,
            now + MAX_CLOCK_SKEW_MS,
            "absurd future timestamps must be clamped to the skew ceiling"
        );

        // An honest edit strictly newer than the clamp ceiling outranks the
        // poisoned copy by plain recency (it would lose on raw magnitude
        // without the clamp).
        let healed = snapshot(vec![item(
            "same",
            now + MAX_CLOCK_SKEW_MS + 5_000,
            "healed",
        )]);
        let final_export = merge_exports(merged, healed);
        assert_eq!(final_export.knowledge_items[0].title.as_deref(), Some("healed"));
    }

    #[test]
    fn fingerprint_of_snapshot_matches_stored_fingerprint_for_identical_content() {
        let storage = SqliteStorage::in_memory().expect("storage should initialize");
        storage
            .replace_all_data(&snapshot(vec![item("a", 100, "alpha"), item("b", 200, "beta")]))
            .expect("fixture should import");
        let stored = storage.snapshot_fingerprint().expect("fingerprint");

        // Same content, different volatile envelope/clock values: equal print.
        let mut incoming = storage.export_data().expect("export");
        incoming.exported_at += 123_456;
        for record in incoming.knowledge_items.iter_mut() {
            record.updated_at += 7;
        }
        assert_eq!(
            SqliteStorage::fingerprint_of_snapshot(&incoming).expect("remote fingerprint"),
            stored,
            "volatile-only differences must not change the fingerprint"
        );

        // A content difference must change it.
        incoming.knowledge_items[0].title = Some("changed".into());
        assert_ne!(
            SqliteStorage::fingerprint_of_snapshot(&incoming).expect("changed fingerprint"),
            stored
        );
    }
}
