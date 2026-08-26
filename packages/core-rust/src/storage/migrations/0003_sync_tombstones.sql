BEGIN IMMEDIATE;

CREATE TABLE IF NOT EXISTS sync_tombstones (
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    deleted_at INTEGER NOT NULL,
    PRIMARY KEY (entity_type, entity_id)
);

CREATE INDEX IF NOT EXISTS idx_sync_tombstones_deleted_at
ON sync_tombstones(deleted_at);

PRAGMA user_version = 3;
COMMIT;
