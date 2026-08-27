-- 0004_delta_sync.sql
-- Foundations for incremental (watermark) sync plus a revision counter that
-- lets the desktop sync server validate a cached content fingerprint without
-- re-exporting the whole database on every idle poll.
--
-- The revision counter is bumped by triggers covering every exported table's
-- writes, so any mutation — sync merges AND local webview edits alike —
-- invalidates the cache reliably. Trigger granularity is per-operation so
-- SQLite only evaluates the matching one.

BEGIN IMMEDIATE;

-- Watermark delta queries filter on these cursors. Column names follow each
-- table's actual clock column (recommendations merge-clock on responded_at;
-- conversations/messages already had an updated_at index or get one here;
-- feedback_events only have created_at, already indexed).
CREATE INDEX IF NOT EXISTS idx_knowledge_items_updated_at ON knowledge_items(updated_at);
CREATE INDEX IF NOT EXISTS idx_messages_updated_at ON messages(updated_at);
CREATE INDEX IF NOT EXISTS idx_recommendations_responded_at ON recommendations(responded_at);

-- Single-row revision counter; the CHECK keeps it impossible to fork.
CREATE TABLE IF NOT EXISTS sync_data_revision (
    singleton INTEGER PRIMARY KEY CHECK (singleton = 1),
    revision INTEGER NOT NULL DEFAULT 0
);
INSERT OR IGNORE INTO sync_data_revision (singleton, revision) VALUES (1, 0);

CREATE TRIGGER IF NOT EXISTS trg_knowledge_items_rev_insert AFTER INSERT ON knowledge_items BEGIN
    UPDATE sync_data_revision SET revision = revision + 1 WHERE singleton = 1;
END;
CREATE TRIGGER IF NOT EXISTS trg_knowledge_items_rev_update AFTER UPDATE ON knowledge_items BEGIN
    UPDATE sync_data_revision SET revision = revision + 1 WHERE singleton = 1;
END;
CREATE TRIGGER IF NOT EXISTS trg_knowledge_items_rev_delete AFTER DELETE ON knowledge_items BEGIN
    UPDATE sync_data_revision SET revision = revision + 1 WHERE singleton = 1;
END;

CREATE TRIGGER IF NOT EXISTS trg_conversations_rev_insert AFTER INSERT ON conversations BEGIN
    UPDATE sync_data_revision SET revision = revision + 1 WHERE singleton = 1;
END;
CREATE TRIGGER IF NOT EXISTS trg_conversations_rev_update AFTER UPDATE ON conversations BEGIN
    UPDATE sync_data_revision SET revision = revision + 1 WHERE singleton = 1;
END;
CREATE TRIGGER IF NOT EXISTS trg_conversations_rev_delete AFTER DELETE ON conversations BEGIN
    UPDATE sync_data_revision SET revision = revision + 1 WHERE singleton = 1;
END;

CREATE TRIGGER IF NOT EXISTS trg_messages_rev_insert AFTER INSERT ON messages BEGIN
    UPDATE sync_data_revision SET revision = revision + 1 WHERE singleton = 1;
END;
CREATE TRIGGER IF NOT EXISTS trg_messages_rev_update AFTER UPDATE ON messages BEGIN
    UPDATE sync_data_revision SET revision = revision + 1 WHERE singleton = 1;
END;
CREATE TRIGGER IF NOT EXISTS trg_messages_rev_delete AFTER DELETE ON messages BEGIN
    UPDATE sync_data_revision SET revision = revision + 1 WHERE singleton = 1;
END;

CREATE TRIGGER IF NOT EXISTS trg_recommendations_rev_insert AFTER INSERT ON recommendations BEGIN
    UPDATE sync_data_revision SET revision = revision + 1 WHERE singleton = 1;
END;
CREATE TRIGGER IF NOT EXISTS trg_recommendations_rev_update AFTER UPDATE ON recommendations BEGIN
    UPDATE sync_data_revision SET revision = revision + 1 WHERE singleton = 1;
END;
CREATE TRIGGER IF NOT EXISTS trg_recommendations_rev_delete AFTER DELETE ON recommendations BEGIN
    UPDATE sync_data_revision SET revision = revision + 1 WHERE singleton = 1;
END;

CREATE TRIGGER IF NOT EXISTS trg_feedback_events_rev_insert AFTER INSERT ON feedback_events BEGIN
    UPDATE sync_data_revision SET revision = revision + 1 WHERE singleton = 1;
END;
CREATE TRIGGER IF NOT EXISTS trg_feedback_events_rev_update AFTER UPDATE ON feedback_events BEGIN
    UPDATE sync_data_revision SET revision = revision + 1 WHERE singleton = 1;
END;
CREATE TRIGGER IF NOT EXISTS trg_feedback_events_rev_delete AFTER DELETE ON feedback_events BEGIN
    UPDATE sync_data_revision SET revision = revision + 1 WHERE singleton = 1;
END;

CREATE TRIGGER IF NOT EXISTS trg_sync_tombstones_rev_insert AFTER INSERT ON sync_tombstones BEGIN
    UPDATE sync_data_revision SET revision = revision + 1 WHERE singleton = 1;
END;
CREATE TRIGGER IF NOT EXISTS trg_sync_tombstones_rev_delete AFTER DELETE ON sync_tombstones BEGIN
    UPDATE sync_data_revision SET revision = revision + 1 WHERE singleton = 1;
END;

PRAGMA user_version = 4;

COMMIT;
