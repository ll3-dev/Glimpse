//! Deterministic snapshot merging for device-to-device synchronization.

use std::collections::HashMap;

use rusqlite::params;
use serde::Serialize;
use sha2::{Digest, Sha256};

use crate::error::Result;
use crate::models::{
    Conversation, DataExport, DataImportSummary, FeedbackEvent, KnowledgeItem, Message,
    Recommendation, SyncTombstone,
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

    /// Incremental export: only rows whose merge clock is strictly newer than
    /// `since_clock_ms`, plus every tombstone (cheap, and deletes must never
    /// be missed). The returned envelope reuses [`DataExport`] so both wire
    /// paths and merging stay shape-identical.
    ///
    /// Clock expressions mirror the ones `merge_exports` uses per table so a
    /// delta can never omit a row that would win a full merge. Cursor
    /// guardbands (e.g. `since - 24h`) are the caller's policy; this layer
    /// does a plain strict-greater select.
    ///
    /// The cursors are pushed into SQL (`WHERE clock > since`) instead of
    /// loading each table and filtering in Rust: the delta poll runs on every
    /// idle sync request while holding the global core mutex, so scanning the
    /// whole store per poll blocks unrelated core commands. `max(a, b) > c`
    /// decomposes to `a > c OR b > c`, which is what the WHERE clauses below
    /// express — 0004's clock indexes make them index-assisted lookups.
    pub fn export_delta(&self, since_clock_ms: i64) -> Result<DataExport> {
        // 삭제 마커는 무한히 쌓이는데, 매 델타 폴링이 테이블 전체를 스캔·직렬화
        // 한다. 커서 가드밴드(24h)보다 충분히 오래된 톰스톤은 살아있는 클라이언트
        // 워터마크가 이미 지나갔으므로(삭제를 놓칠 수 없음) 폴링 한 번에 프루닝해도
        // 안전하다. 보존 기간은 가드밴드 대비 넉넉한 30일.
        self.prune_old_tombstones()?;
        let mut knowledge_items = self.list_knowledge_items_since(since_clock_ms)?;
        let mut conversations = self.list_conversations_since(since_clock_ms)?;
        let mut messages = self.list_messages_since(since_clock_ms)?;
        let recommendations = self.list_recommendations_since(since_clock_ms)?;
        let mut feedback_events = self.list_feedback_events_since(since_clock_ms)?;

        // Per-table ordering must match the full-list readers (list_* use
        // created_at ASC/DESC) so delta output stays canonically ordered
        // alongside full exports.
        knowledge_items.sort_by_key(|b| std::cmp::Reverse(b.created_at));
        conversations.sort_by_key(|a| a.created_at);
        messages.sort_by(|a, b| {
            a.created_at
                .cmp(&b.created_at)
                .then_with(|| a.id.cmp(&b.id))
        });
        feedback_events.sort_by(|a, b| {
            a.created_at
                .cmp(&b.created_at)
                .then_with(|| a.id.cmp(&b.id))
        });

        Ok(DataExport {
            format_version: DataExport::FORMAT_VERSION,
            exported_at: chrono::Utc::now().timestamp_millis(),
            knowledge_items,
            conversations,
            messages,
            recommendations,
            feedback_events,
            tombstones: self.list_sync_tombstones()?,
        })
    }

    /// Highest merge clock across every exported table — the SQL twin of the
    /// per-table clock expressions the sync server folds into
    /// `new_watermark`. Lets a full-path sync response hand the client a
    /// starting watermark without materializing a delta, so the next poll can
    /// take the incremental path instead of re-uploading full snapshots.
    ///
    /// Empty tables contribute NULL (filtered by the outer MAX), and an empty
    /// store yields `Ok(0)`: for watermark purposes "nothing exists yet" is
    /// equivalent to "everything up to epoch is synced".
    pub fn max_merge_clock(&self) -> Result<i64> {
        let clock = self.conn.query_row(
            r#"
            SELECT MAX(latest) FROM (
                SELECT MAX(updated_at) AS latest FROM knowledge_items
                UNION ALL
                SELECT MAX(COALESCE(deleted_at, updated_at)) FROM conversations
                UNION ALL
                SELECT MAX(COALESCE(deleted_at, updated_at, created_at), created_at) FROM messages
                UNION ALL
                SELECT MAX(COALESCE(responded_at, created_at), created_at) FROM recommendations
                UNION ALL
                SELECT MAX(created_at) FROM feedback_events
                UNION ALL
                SELECT MAX(deleted_at) FROM sync_tombstones
            )
            "#,
            [],
            |row| row.get::<_, Option<i64>>(0),
        )?;
        Ok(clock.unwrap_or(0))
    }

    /// Row-wise merge of an incremental payload: write each carried row with
    /// LWW semantics instead of wiping the store.
    ///
    /// knowledge_items / conversations / messages / feedback_events use
    /// `INSERT OR REPLACE` by primary key upstream — but a naive replace would
    /// let a stale delta row clobber a newer local edit, so each table's
    /// existing rows are compared first via the same [`prefer_candidate`] clock
    /// rule `merge_exports` uses; only winners are written. Tombstones reuse
    /// the MAX-merge primitive from the full path. Both directions therefore
    /// converge to identical state.
    ///
    /// Recommendations receive the narrowest treatment: same-id winners are
    /// row-overwritten in place (their feedback_events must stay attached),
    /// while a candidate that merely re-proposes an occupied pair under a new
    /// id loses and waits for the next full snapshot — snapshot-fingerprint
    /// drift already guarantees that reset happens, so dedup stays the full
    /// path's job ([`SqliteStorage::merge_data`]).
    ///
    /// A delta intentionally relaxes `validate_export`'s referential checks:
    /// rows arrive in pieces, so parents may already exist locally while their
    /// children show up later. Integrity is still enforced transactionally via
    /// [`SqliteStorage::validate_integrity`] before commit.
    ///
    /// Returns a summary of rows actually written (LWW winners), not the
    /// post-state export — an all-stale delta reports all zeros.
    pub fn apply_delta(&self, delta: &DataExport) -> Result<DataImportSummary> {
        if delta.format_version == 0 || delta.format_version > DataExport::FORMAT_VERSION {
            return Err(crate::error::Error::InvalidInput(format!(
                "Unsupported data export version {}; expected 1..={}",
                delta.format_version,
                DataExport::FORMAT_VERSION
            )));
        }

        // Counts rows this delta actually wrote (LWW winners, including
        // same-id overwrites). Rows the clock rule skips are not counted, so
        // an all-stale or empty delta reports zeros — callers use that to skip
        // pointless refetches.
        let mut applied = DataImportSummary {
            knowledge_items: 0,
            conversations: 0,
            messages: 0,
            recommendations: 0,
            feedback_events: 0,
        };

        self.conn.execute_batch("BEGIN IMMEDIATE")?;
        // REPLACE'd parent rows (a winning conversation edits its title) are
        // deleted-then-reinserted mid-transaction while their messages still
        // reference them; with no ON DELETE CASCADE those deletes trip the
        // immediate FK check. Deferring the check to COMMIT — where children
        // from this very delta have arrived — keeps the transient state legal
        // without weakening the end-of-transaction guarantee below. The
        // pragma auto-resets on COMMIT/ROLLBACK.
        self.conn
            .pragma_update(None, "defer_foreign_keys", true)?;
        let result = (|| -> Result<()> {
            let local_items = self.list_knowledge_items()?;
            let items_by_id: HashMap<&str, &KnowledgeItem> =
                local_items.iter().map(|item| (item.id.as_str(), item)).collect();
            for candidate in &delta.knowledge_items {
                match items_by_id.get(candidate.id.as_str()).copied() {
                    Some(current)
                        if !prefer_candidate(current, candidate, &|item: &KnowledgeItem| {
                            item.updated_at
                        }) => {}
                    _ => {
                        self.insert_knowledge_item(candidate)?;
                        applied.knowledge_items += 1;
                    }
                }
            }

            let local_conversations = self.list_all_conversations()?;
            let conversations_by_id: HashMap<&str, &Conversation> = local_conversations
                .iter()
                .map(|item| (item.id.as_str(), item))
                .collect();
            for candidate in &delta.conversations {
                match conversations_by_id.get(candidate.id.as_str()).copied() {
                    Some(current) if !prefer_candidate(current, candidate, &conversation_clock) => {}
                    _ => {
                        self.insert_conversation(candidate)?;
                        applied.conversations += 1;
                    }
                }
            }

            let local_messages = self.list_all_messages()?;
            let messages_by_id: HashMap<&str, &Message> =
                local_messages.iter().map(|item| (item.id.as_str(), item)).collect();
            for candidate in &delta.messages {
                match messages_by_id.get(candidate.id.as_str()).copied() {
                    Some(current) if !prefer_candidate(current, candidate, &message_clock) => {}
                    _ => {
                        self.insert_message(candidate)?;
                        applied.messages += 1;
                    }
                }
            }

            let local_recommendations = self.list_recommendations()?;
            let recommendations_by_id: HashMap<&str, &Recommendation> = local_recommendations
                .iter()
                .map(|item| (item.id.as_str(), item))
                .collect();
            for candidate in &delta.recommendations {
                match recommendations_by_id.get(candidate.id.as_str()).copied() {
                    Some(current)
                        if !prefer_candidate(current, candidate, &recommendation_clock) =>
                    {
                        continue;
                    }
                    Some(_) => {
                        self.overwrite_recommendation_row(candidate)?;
                        applied.recommendations += 1;
                        continue;
                    }
                    None => {}
                }
                // Fresh id, but another row may already serve this exact pair.
                let occupied_by_newer = local_recommendations.iter().any(|existing| {
                    existing.id != candidate.id
                        && unordered_pair_matches(existing, candidate)
                        && prefer_candidate(existing, candidate, &recommendation_clock)
                });
                if !occupied_by_newer {
                    self.insert_recommendation(candidate)?;
                    applied.recommendations += 1;
                }
            }

            let local_events = self.list_all_feedback_events()?;
            let events_by_id: HashMap<&str, &FeedbackEvent> =
                local_events.iter().map(|item| (item.id.as_str(), item)).collect();
            for candidate in &delta.feedback_events {
                match events_by_id.get(candidate.id.as_str()).copied() {
                    Some(current)
                        if !prefer_candidate(current, candidate, &|event: &FeedbackEvent| {
                            event.created_at
                        }) => {}
                    _ => {
                        self.insert_feedback_event(candidate)?;
                        applied.feedback_events += 1;
                    }
                }
            }

            for tombstone in &delta.tombstones {
                self.apply_tombstone_delete(tombstone)?;
                self.record_sync_tombstone(
                    &tombstone.entity_type,
                    &tombstone.entity_id,
                    tombstone.deleted_at,
                )?;
            }
            self.validate_integrity()?;
            Ok(())
        })();

        match result {
            Ok(()) => {
                self.conn.execute_batch("COMMIT")?;
                Ok(applied)
            }
            Err(error) => {
                let _ = self.conn.execute_batch("ROLLBACK");
                Err(error)
            }
        }
    }

    /// Same-id recommendation update. Only response state moves after creation;
    /// identity columns stay untouched so dependent feedback rows never dangle.
    fn overwrite_recommendation_row(&self, recommendation: &Recommendation) -> Result<()> {
        self.conn.execute(
            r#"
            UPDATE recommendations SET
                reason = ?2, status = ?3, created_at = ?4, responded_at = ?5
            WHERE id = ?1
            "#,
            rusqlite::params![
                recommendation.id,
                recommendation.reason,
                Self::recommendation_status_to_str(&recommendation.status),
                recommendation.created_at,
                recommendation.responded_at,
            ],
        )?;
        Ok(())
    }

    /// Applies one incoming tombstone to live rows — the delete half of the
    /// full path's `apply_tombstones`. A row survives exactly when its merge
    /// clock strictly postdates the delete (re-created afterwards); anything
    /// else is removed — identical rule to `merge_exports`.
    ///
    /// children go with their parents: this mirrors what a full snapshot
    /// replace produces for the same delete on the source device, where
    /// removing a parent takes its messages/feedback along.
    fn apply_tombstone_delete(&self, tombstone: &SyncTombstone) -> Result<()> {
        let entity_type = tombstone.entity_type.as_str();
        let entity_id = tombstone.entity_id.as_str();
        let deleted_at = tombstone.deleted_at;

        // (clock SQL mirroring conversation_clock/message_clock/
        // recommendation_clock, child-cleanup DELETE) per entity type.
        let (clock_sql, child_delete): (&str, Option<(&str, &str)>) = match entity_type {
            ENTITY_KNOWLEDGE_ITEM => ("SELECT updated_at FROM knowledge_items WHERE id = ?1", None),
            ENTITY_CONVERSATION => (
                "SELECT MAX(COALESCE(deleted_at, 0), updated_at) FROM conversations WHERE id = ?1",
                Some(("messages", "conversation_id")),
            ),
            ENTITY_MESSAGE => (
                "SELECT MAX(COALESCE(deleted_at, COALESCE(updated_at, 0), created_at), created_at) FROM messages WHERE id = ?1",
                None,
            ),
            ENTITY_RECOMMENDATION => (
                "SELECT MAX(COALESCE(responded_at, 0), created_at) FROM recommendations WHERE id = ?1",
                Some(("feedback_events", "recommendation_id")),
            ),
            ENTITY_FEEDBACK_EVENT => {
                ("SELECT created_at FROM feedback_events WHERE id = ?1", None)
            }
            _ => return Ok(()),
        };

        let clock: Option<Option<i64>> = self
            .conn
            .query_row(clock_sql, params![entity_id], |row| {
                row.get::<_, Option<i64>>(0)
            })
            .map(Some)
            .unwrap_or(None);
        // Missing row (outer None / inner None via MAX of absent columns
        // cannot happen here — the SELECT yields no row at all) behaves like
        // the full path: nothing live to delete.
        if clock.flatten().is_none_or(|live_clock| live_clock <= deleted_at) {
            if let Some((child_table, child_column)) = child_delete {
                self.conn.execute(
                    &format!("DELETE FROM {child_table} WHERE {child_column} = ?1"),
                    params![entity_id],
                )?;
            }
            let table = match entity_type {
                ENTITY_KNOWLEDGE_ITEM => "knowledge_items",
                ENTITY_CONVERSATION => "conversations",
                ENTITY_MESSAGE => "messages",
                ENTITY_RECOMMENDATION => "recommendations",
                ENTITY_FEEDBACK_EVENT => "feedback_events",
                _ => return Ok(()),
            };
            self.conn
                .execute(&format!("DELETE FROM {table} WHERE id = ?1"), params![entity_id])?;
        }
        Ok(())
    }
}

/// Do two recommendations carry the same unordered item pair?
fn unordered_pair_matches(a: &Recommendation, b: &Recommendation) -> bool {
    a.item_a_id == b.item_a_id && a.item_b_id == b.item_b_id
        || a.item_a_id == b.item_b_id && a.item_b_id == b.item_a_id
}

/// Strips fields whose values legitimately differ between devices without any
/// content change: the export envelope and per-record clock columns the merge
/// treats as volatile (kept in lockstep with `prefer_candidate`'s clocks).
/// Records are also re-sorted by id: a full-snapshot replace writes rows in
/// canonical order while a delta appends incrementally, so two storages can
/// hold byte-identical domain content in different physical row orders — and
/// the fingerprint must still call them equal.
fn normalize_for_fingerprint(export: &mut DataExport) {
    export.format_version = 0;
    export.exported_at = 0;
    sort_records_canonically(export);
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

/// Orders every record set by its primary key so digest input depends only on
/// content, never on the physical row order a particular write path produced.
fn sort_records_canonically(export: &mut DataExport) {
    sort_by_id(&mut export.knowledge_items, |item| &item.id);
    sort_by_id(&mut export.conversations, |item| &item.id);
    sort_by_id(&mut export.messages, |item| &item.id);
    sort_by_id(&mut export.recommendations, |item| &item.id);
    sort_by_id(&mut export.feedback_events, |item| &item.id);
    export.tombstones.sort_by(|left, right| {
        (&left.entity_type, &left.entity_id).cmp(&(&right.entity_type, &right.entity_id))
    });
}

fn canonical_snapshot_digest(export: &DataExport) -> Result<String> {
    let canonical = serde_json::to_vec(export)
        .map_err(|error| crate::error::Error::InvalidInput(error.to_string()))?;
    Ok(format!("{:x}", Sha256::digest(&canonical)))
}

impl SqliteStorage {
    /// Drop deletion markers past [`TOMBSTONE_RETENTION_MS`]. Called from the
    /// delta export path, which re-scans the whole table per poll — without
    /// pruning the table (and thus every idle poll's cost) grows forever.
    pub(super) fn prune_old_tombstones(&self) -> Result<()> {
        let cutoff = chrono::Utc::now().timestamp_millis() - TOMBSTONE_RETENTION_MS;
        self.conn.execute(
            "DELETE FROM sync_tombstones WHERE deleted_at < ?1",
            params![cutoff],
        )?;
        Ok(())
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

/// Deletion markers older than this are pruned from `sync_tombstones`. The
/// delta cursor guardband is 24h (`MAX_CLOCK_SKEW_MS`), so any live client's
/// watermark has already moved past tombstones this old — deleting them can
/// never re-expose a deleted row. 30 days leaves a wide margin for devices
/// that stay offline for weeks and then full-snapshot sync from scratch.
const TOMBSTONE_RETENTION_MS: i64 = 30 * 24 * 60 * 60 * 1000;

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
        Conversation, DataExport, KnowledgeItem, KnowledgeItemType, Message,
        Recommendation, RecommendationStatus, SyncTombstone,
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
    fn export_delta_only_carries_rows_newer_than_the_cursor() {
        let storage = SqliteStorage::in_memory().expect("storage should initialize");
        let fixture = snapshot(vec![item("fresh", 500, "fresh"), item("stale", 100, "stale")]);
        storage
            .replace_all_data(&fixture)
            .expect("fixture should import");

        // Tombstones bypass the cursor: deletes must never be under-sent.
        // (Recent enough to survive export_delta's retention pruning.)
        let now = chrono::Utc::now().timestamp_millis();
        storage
            .record_sync_tombstone(ENTITY_KNOWLEDGE_ITEM, "gone", now)
            .expect("tombstone should record");

        let delta = storage.export_delta(200).expect("delta should export");
        assert_eq!(
            delta
                .knowledge_items
                .iter()
                .map(|row| row.id.as_str())
                .collect::<Vec<_>>(),
            ["fresh"],
            "only rows strictly newer than the cursor travel in the delta"
        );
        assert!(
            delta.tombstones.iter().any(|t| t.entity_id == "gone"),
            "every tombstone must ride along regardless of age"
        );
        drop(fixture);
    }

    #[test]
    fn export_delta_prunes_tombstones_older_than_the_retention_window() {
        let storage = SqliteStorage::in_memory().expect("storage should initialize");
        let now = chrono::Utc::now().timestamp_millis();

        // Ancient tombstone (well past the 30d retention) vs a fresh one.
        storage
            .record_sync_tombstone(ENTITY_KNOWLEDGE_ITEM, "ancient", now - 31 * 24 * 60 * 60 * 1000)
            .expect("ancient tombstone should record");
        storage
            .record_sync_tombstone(ENTITY_KNOWLEDGE_ITEM, "recent", now - 24 * 60 * 60 * 1000)
            .expect("recent tombstone should record");

        let delta = storage.export_delta(0).expect("delta should export");
        assert!(
            !delta.tombstones.iter().any(|t| t.entity_id == "ancient"),
            "tombstones past retention must be pruned, not re-sent forever"
        );
        assert!(
            delta.tombstones.iter().any(|t| t.entity_id == "recent"),
            "tombstones inside retention must still ride along"
        );
    }

    #[test]
    fn max_merge_clock_tracks_the_freshest_clock_across_tables() {
        let storage = SqliteStorage::in_memory().expect("storage should initialize");
        assert_eq!(
            storage.max_merge_clock().expect("empty store"),
            0,
            "an empty store starts the watermark domain at zero"
        );

        storage
            .replace_all_data(&snapshot(vec![item("a", 300, "a"), item("b", 500, "b")]))
            .expect("fixture should import");
        assert_eq!(
            storage.max_merge_clock().expect("items only"),
            500,
            "the maximum spans every row, not just the first"
        );

        // A fresher tombstone (a delete) must move the clock forward — the
        // watermark has to cover deletes too or clients re-send them forever.
        storage
            .record_sync_tombstone(ENTITY_KNOWLEDGE_ITEM, "gone", 900)
            .expect("tombstone should record");
        assert_eq!(
            storage.max_merge_clock().expect("tombstone dominates"),
            900
        );
    }

    #[test]
    fn apply_delta_upserts_by_lww_without_resurrecting_stale_local_edits() {
        let storage = SqliteStorage::in_memory().expect("storage should initialize");
        // Local already holds a NEWER edit of item "x" (updated_at 300).
        storage
            .replace_all_data(&snapshot(vec![item("x", 300, "local-new")]))
            .expect("fixture should import");

        // Delta carries a stale copy and a brand-new item.
        let mut delta = snapshot(vec![item("x", 200, "remote-stale"), item("y", 400, "added")]);
        delta.exported_at = 1_000;
        let after = storage.apply_delta(&delta).expect("delta should apply");
        assert_eq!(
            storage
                .list_knowledge_items()
                .expect("list after apply")
                .iter()
                .find(|row| row.id == "x")
                .and_then(|row| row.title.clone()),
            Some("local-new".into()),
            "a stale delta row must not clobber a newer local edit"
        );
        assert_eq!(
            (after.knowledge_items, after.conversations),
            (1, 0),
            "the summary counts rows actually written: only 'y' won"
        );

        // A newer delta row does win.
        let mut newer = snapshot(vec![item("x", 350, "remote-newer")]);
        newer.exported_at = 2_000;
        let after = storage.apply_delta(&newer).expect("delta should apply");
        assert_eq!(
            storage
                .list_knowledge_items()
                .expect("list after apply")
                .iter()
                .find(|row| row.id == "x")
                .and_then(|row| row.title.clone()),
            Some("remote-newer".into()),
            "a strictly newer delta row must overwrite the local copy"
        );
        assert_eq!(after.knowledge_items, 1);
    }

    #[test]
    fn apply_delta_tombstones_remove_living_rows_but_not_newer_ones() {
        let storage = SqliteStorage::in_memory().expect("storage should initialize");
        storage
            .replace_all_data(&snapshot(vec![item("old", 100, "old"), item("new", 900, "new")]))
            .expect("fixture should import");

        let mut deleted = snapshot(vec![]);
        deleted.tombstones.push(SyncTombstone {
            entity_type: ENTITY_KNOWLEDGE_ITEM.into(),
            entity_id: "old".into(),
            deleted_at: 500,
        });
        // A resurrected copy older than its tombstone rides in too.
        deleted
            .knowledge_items
            .push(item("old", 200, "resurrected-stale"));
        let after = storage.apply_delta(&deleted).expect("delta should apply");
        let survivors = storage.list_knowledge_items().expect("list after apply");
        assert!(
            !survivors.iter().any(|row| row.id == "old"),
            "a tombstone must remove a living local row"
        );
        assert!(survivors.iter().any(|row| row.id == "new"));
        assert_eq!(
            after.knowledge_items, 1,
            "the resurrected-stale row won LWW locally (updated_at 200 > 100) and was written once, then removed by the tombstone"
        );

        // The tombstone also guards against later stale arrivals via merge…
        let via_merge = storage
            .merge_data(&snapshot(vec![item("old", 300, "still-dead")]))
            .expect("merge should succeed");
        assert!(!via_merge.knowledge_items.iter().any(|row| row.id == "old"));

        // …but a strictly newer re-creation is untouched.
        let reborn = storage
            .merge_data(&snapshot(vec![item("old", 600, "reborn")]))
            .expect("merge should succeed");
        assert_eq!(
            reborn
                .knowledge_items
                .iter()
                .find(|row| row.id == "old")
                .and_then(|row| row.title.clone()),
            Some("reborn".into())
        );
    }

    #[test]
    fn apply_delta_converges_in_both_directions_with_the_full_path() {
        // Same two-device content merged by apply_delta either direction must
        // land on the same stored state as the other direction — the property
        // that lets watermark syncs agree without full snapshots.
        let mut left_fixture = snapshot(vec![item("shared", 10, "left")]);
        left_fixture.messages.clear();
        let storage_left = SqliteStorage::in_memory().expect("storage");
        storage_left
            .replace_all_data(&left_fixture)
            .expect("fixture should import");
        storage_left
            .insert_conversation(&Conversation {
                id: "conv".into(),
                title: Some("conv".into()),
                icon: None,
                context_item_id: None,
                created_at: 1,
                updated_at: 10,
                deleted_at: None,
            })
            .expect("conversation should insert");
        storage_left
            .insert_message(&Message {
                id: "msg".into(),
                conversation_id: "conv".into(),
                role: crate::models::MessageRole::User,
                content: "hello".into(),
                created_at: 5,
                updated_at: None,
                deleted_at: None,
            })
            .expect("message should insert");

        let right_delta = storage_left.export_delta(0).expect("delta");
        let storage_right = SqliteStorage::in_memory().expect("storage");
        storage_right
            .replace_all_data(&snapshot(vec![item("shared", 20, "right")]))
            .expect("fixture should import");
        storage_right
            .apply_delta(&right_delta)
            .expect("delta should apply");

        // Reverse direction: the same payload applied back upstream.
        let reverse_delta = storage_right.export_delta(0).expect("delta");
        storage_left
            .apply_delta(&reverse_delta)
            .expect("reverse delta should apply");

        let print_left = storage_left.snapshot_fingerprint().expect("fingerprint");
        let print_right = storage_right.snapshot_fingerprint().expect("fingerprint");
        assert_eq!(
            print_left, print_right,
            "bidirectional delta exchange must converge to identical content"
        );
    }

    #[test]
    fn apply_delta_accepts_children_whose_parent_arrives_same_delta_and_rejects_orphans() {
        let storage = SqliteStorage::in_memory().expect("storage should initialize");
        // Parent + child in one delta: FK-safe order inserts parents first.
        let mut family = snapshot(vec![]);
        family.conversations.push(Conversation {
            id: "conv".into(),
            title: Some("conv".into()),
            icon: None,
            context_item_id: None,
            created_at: 1,
            updated_at: 10,
            deleted_at: None,
        });
        family.messages.push(Message {
            id: "msg".into(),
            conversation_id: "conv".into(),
            role: crate::models::MessageRole::User,
            content: "hi".into(),
            created_at: 5,
            updated_at: None,
            deleted_at: None,
        });
        let after = storage.apply_delta(&family).expect("family delta applies");
        assert_eq!(after.conversations, 1);
        assert_eq!(after.messages, 1);

        // An orphan message (parent nowhere) fails integrity at commit.
        let mut orphan = snapshot(vec![]);
        orphan.messages.push(Message {
            id: "msg-orphan".into(),
            conversation_id: "nope".into(),
            role: crate::models::MessageRole::User,
            content: "orphan".into(),
            created_at: 6,
            updated_at: None,
            deleted_at: None,
        });
        assert!(
            storage.apply_delta(&orphan).is_err(),
            "an orphan child must roll the whole delta back"
        );
        assert!(
            !storage
                .list_all_messages()
                .expect("list after rollback")
                .iter()
                .any(|row| row.id == "msg-orphan"),
            "a failed delta must leave no partial writes behind"
        );
    }

    #[test]
    fn reject_unsupported_delta_format_versions() {
        let storage = SqliteStorage::in_memory().expect("storage should initialize");
        for version in [0_u32, DataExport::FORMAT_VERSION + 1] {
            let mut bad = snapshot(vec![]);
            bad.format_version = version;
            assert!(
                storage.apply_delta(&bad).is_err(),
                "format_version {version} must be rejected"
            );
        }
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
