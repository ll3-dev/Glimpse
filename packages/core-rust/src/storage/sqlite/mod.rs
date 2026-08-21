//! SQLite storage backend for the Glimpse core library.

mod conversation;
mod feedback;
mod knowledge;
mod message;
mod portability;
mod recommendation;

use std::ffi::OsString;
use std::fs::{self, OpenOptions};
use std::io;
use std::path::{Path, PathBuf};
use std::time::Duration;

use rusqlite::types::Type;
use rusqlite::{Connection, Row};
use serde::de::DeserializeOwned;

use crate::error::{Error, Result};

const SCHEMA_SQL: &str = include_str!("../schema.sql");
const MIGRATION_V2_SQL: &str = include_str!("../migrations/0002_unique_recommendation_pairs.sql");
const SCHEMA_VERSION: i64 = 2;

/// SQLite-based storage backend.
pub struct SqliteStorage {
    conn: Connection,
    database_path: Option<PathBuf>,
}

impl SqliteStorage {
    /// Creates a new SQLite storage instance at the given path.
    pub fn new<P: AsRef<Path>>(path: P) -> Result<Self> {
        let database_path = path.as_ref().to_path_buf();
        let conn = Connection::open(&database_path)?;
        let storage = Self {
            conn,
            database_path: Some(database_path),
        };
        storage.configure_connection(true)?;
        storage.initialize_schema()?;
        Ok(storage)
    }

    /// Creates an in-memory SQLite storage instance (useful for testing).
    pub fn in_memory() -> Result<Self> {
        let conn = Connection::open_in_memory()?;
        let storage = Self {
            conn,
            database_path: None,
        };
        storage.configure_connection(false)?;
        storage.initialize_schema()?;
        Ok(storage)
    }

    fn configure_connection(&self, persistent: bool) -> Result<()> {
        self.conn.pragma_update(None, "foreign_keys", true)?;
        self.conn.busy_timeout(Duration::from_secs(5))?;

        if persistent {
            self.conn
                .execute_batch("PRAGMA journal_mode = WAL; PRAGMA synchronous = NORMAL;")?;
        }

        Ok(())
    }

    fn initialize_schema(&self) -> Result<()> {
        let mut current_version: i64 =
            self.conn
                .pragma_query_value(None, "user_version", |row| row.get(0))?;

        if current_version > SCHEMA_VERSION {
            return Err(Error::InvalidInput(format!(
                "Database schema version {current_version} is newer than supported version {SCHEMA_VERSION}"
            )));
        }

        let backup_path = if current_version > 0 && current_version < SCHEMA_VERSION {
            self.validate_integrity()?;
            self.create_pre_migration_backup(current_version)?
        } else {
            None
        };

        if current_version == 0 {
            self.conn.execute_batch(SCHEMA_SQL)?;
            self.conn.pragma_update(None, "user_version", 1_i64)?;
            current_version = 1;
        }

        if current_version < 2 {
            if let Err(error) = self.conn.execute_batch(MIGRATION_V2_SQL) {
                return Err(error.into());
            }
        }

        self.validate_integrity()?;
        if let Some(backup_path) = backup_path {
            fs::remove_file(backup_path)?;
        }
        Ok(())
    }

    fn validate_integrity(&self) -> Result<()> {
        let mut quick_check = self.conn.prepare("PRAGMA quick_check")?;
        let results = quick_check
            .query_map([], |row| row.get::<_, String>(0))?
            .collect::<std::result::Result<Vec<_>, _>>()?;
        if results.as_slice() != ["ok"] {
            return Err(Error::InvalidInput(format!(
                "Database integrity check failed: {}",
                results.join("; ")
            )));
        }

        let foreign_key_violations: i64 =
            self.conn
                .query_row("SELECT COUNT(*) FROM pragma_foreign_key_check", [], |row| {
                    row.get(0)
                })?;
        if foreign_key_violations > 0 {
            return Err(Error::InvalidInput(format!(
                "Database foreign key check failed with {foreign_key_violations} violation(s)"
            )));
        }

        Ok(())
    }

    fn create_pre_migration_backup(&self, current_version: i64) -> Result<Option<PathBuf>> {
        let Some(database_path) = &self.database_path else {
            return Ok(None);
        };

        let checkpoint: (i64, i64, i64) =
            self.conn
                .query_row("PRAGMA wal_checkpoint(TRUNCATE)", [], |row| {
                    Ok((row.get(0)?, row.get(1)?, row.get(2)?))
                })?;
        if checkpoint.0 != 0 {
            return Err(Error::InvalidInput(
                "Could not checkpoint the database before migration".to_string(),
            ));
        }

        let backup_path = pre_migration_backup_path(database_path, current_version, SCHEMA_VERSION);
        if backup_path.exists() {
            return Ok(Some(backup_path));
        }

        let mut source = fs::File::open(database_path)?;
        let mut backup = OpenOptions::new()
            .write(true)
            .create_new(true)
            .open(&backup_path)?;
        io::copy(&mut source, &mut backup)?;
        backup.sync_all()?;
        Ok(Some(backup_path))
    }
}

fn pre_migration_backup_path(path: &Path, from: i64, to: i64) -> PathBuf {
    let mut value: OsString = path.as_os_str().to_owned();
    value.push(format!(".pre-v{from}-to-v{to}.backup"));
    PathBuf::from(value)
}

pub(super) fn parse_json_column<T: DeserializeOwned>(
    row: &Row<'_>,
    index: usize,
) -> rusqlite::Result<T> {
    let raw: String = row.get(index)?;
    parse_json_value(&raw, index)
}

pub(super) fn parse_optional_json_column<T: DeserializeOwned>(
    row: &Row<'_>,
    index: usize,
) -> rusqlite::Result<Option<T>> {
    let raw: Option<String> = row.get(index)?;
    raw.map(|value| parse_json_value(&value, index)).transpose()
}

fn parse_json_value<T: DeserializeOwned>(raw: &str, index: usize) -> rusqlite::Result<T> {
    serde_json::from_str(raw)
        .or_else(|_| serde_json::from_value(serde_json::Value::String(raw.to_owned())))
        .map_err(|error| {
            rusqlite::Error::FromSqlConversionFailure(index, Type::Text, Box::new(error))
        })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn initializes_schema_version_and_connection_safety() {
        let storage = SqliteStorage::in_memory().expect("in-memory database should initialize");

        let schema_version: i64 = storage
            .conn
            .pragma_query_value(None, "user_version", |row| row.get(0))
            .expect("schema version should be readable");
        let foreign_keys: i64 = storage
            .conn
            .pragma_query_value(None, "foreign_keys", |row| row.get(0))
            .expect("foreign key setting should be readable");
        let busy_timeout: i64 = storage
            .conn
            .pragma_query_value(None, "busy_timeout", |row| row.get(0))
            .expect("busy timeout should be readable");

        assert_eq!(schema_version, SCHEMA_VERSION);
        assert_eq!(foreign_keys, 1);
        assert_eq!(busy_timeout, 5_000);
    }

    #[test]
    fn rejects_rows_that_violate_foreign_keys() {
        let storage = SqliteStorage::in_memory().expect("in-memory database should initialize");
        let result = storage.conn.execute(
            "INSERT INTO messages (id, conversation_id, role, content, created_at) VALUES (?1, ?2, ?3, ?4, ?5)",
            ("message", "missing-conversation", "\"user\"", "content", 1_i64),
        );

        assert!(result.is_err());
    }

    #[test]
    fn reports_corrupt_enum_values_instead_of_defaulting_or_panicking() {
        let storage = SqliteStorage::in_memory().expect("in-memory database should initialize");
        storage
            .conn
            .execute(
                "INSERT INTO recommendations (id, item_a_id, item_b_id, status, created_at) VALUES (?1, ?2, ?3, ?4, ?5)",
                ("recommendation", "item-a", "item-b", "corrupt", 1_i64),
            )
            .expect("corrupt fixture should be inserted");

        assert!(storage.list_recommendations().is_err());
    }

    #[test]
    fn migrates_v1_recommendation_pairs_without_losing_feedback() {
        let conn = Connection::open_in_memory().expect("database should open");
        conn.execute_batch(SCHEMA_SQL)
            .expect("v1 schema should initialize");
        conn.pragma_update(None, "user_version", 1_i64)
            .expect("v1 schema version should be set");
        conn.execute(
            "INSERT INTO recommendations (id, item_a_id, item_b_id, status, created_at) VALUES (?1, ?2, ?3, ?4, ?5)",
            ("a-keep", "item-b", "item-a", "pending", 1_i64),
        )
        .expect("first recommendation should insert");
        conn.execute(
            "INSERT INTO recommendations (id, item_a_id, item_b_id, status, created_at) VALUES (?1, ?2, ?3, ?4, ?5)",
            ("z-removed", "item-a", "item-b", "accepted", 2_i64),
        )
        .expect("duplicate recommendation should insert before migration");
        conn.execute(
            "INSERT INTO feedback_events (id, recommendation_id, action, created_at) VALUES (?1, ?2, ?3, ?4)",
            ("feedback", "z-removed", "accepted", 3_i64),
        )
        .expect("feedback should insert");

        let storage = SqliteStorage {
            conn,
            database_path: None,
        };
        storage
            .configure_connection(false)
            .expect("connection should configure");
        storage
            .initialize_schema()
            .expect("v1 database should migrate");

        let pair_count: i64 = storage
            .conn
            .query_row("SELECT COUNT(*) FROM recommendations", [], |row| row.get(0))
            .expect("recommendations should count");
        let canonical_pair: (String, String) = storage
            .conn
            .query_row(
                "SELECT item_a_id, item_b_id FROM recommendations",
                [],
                |row| Ok((row.get(0)?, row.get(1)?)),
            )
            .expect("canonical recommendation should remain");
        let feedback_parent: String = storage
            .conn
            .query_row(
                "SELECT recommendation_id FROM feedback_events WHERE id = 'feedback'",
                [],
                |row| row.get(0),
            )
            .expect("feedback should remain attached");

        assert_eq!(pair_count, 1);
        assert_eq!(canonical_pair, ("item-a".into(), "item-b".into()));
        assert_eq!(feedback_parent, "a-keep");

        let duplicate_result = storage.conn.execute(
            "INSERT INTO recommendations (id, item_a_id, item_b_id, status, created_at) VALUES (?1, ?2, ?3, ?4, ?5)",
            ("duplicate", "item-a", "item-b", "pending", 4_i64),
        );
        assert!(duplicate_result.is_err());
    }

    #[test]
    fn creates_a_consistent_pre_migration_backup() {
        let temp_dir = tempfile::tempdir().expect("temp dir should create");
        let database_path = temp_dir.path().join("glimpse.sqlite");
        let conn = Connection::open(&database_path).expect("database should open");
        conn.execute_batch(SCHEMA_SQL)
            .expect("v1 schema should initialize");
        conn.pragma_update(None, "user_version", 1_i64)
            .expect("v1 schema version should be set");
        drop(conn);

        let conn = Connection::open(&database_path).expect("database should reopen");
        let storage = SqliteStorage {
            conn,
            database_path: Some(database_path.clone()),
        };
        storage
            .configure_connection(true)
            .expect("connection should configure");
        storage
            .validate_integrity()
            .expect("v1 database should be valid");
        let backup_path = storage
            .create_pre_migration_backup(1)
            .expect("backup should succeed")
            .expect("persistent database should have a backup");

        let backup = Connection::open(&backup_path).expect("backup should open");
        let backup_version: i64 = backup
            .pragma_query_value(None, "user_version", |row| row.get(0))
            .expect("backup version should be readable");
        assert_eq!(backup_version, 1);
    }

    #[test]
    fn rejects_foreign_key_corruption_before_migration() {
        let temp_dir = tempfile::tempdir().expect("temp dir should create");
        let database_path = temp_dir.path().join("glimpse.sqlite");
        let conn = Connection::open(&database_path).expect("database should open");
        conn.execute_batch(SCHEMA_SQL)
            .expect("v1 schema should initialize");
        conn.pragma_update(None, "user_version", 1_i64)
            .expect("v1 schema version should be set");
        conn.pragma_update(None, "foreign_keys", false)
            .expect("fixture should allow injecting a corrupt relation");
        conn.execute(
            "INSERT INTO messages (id, conversation_id, role, content, created_at) VALUES (?1, ?2, ?3, ?4, ?5)",
            ("message", "missing", "\"user\"", "content", 1_i64),
        )
        .expect("corrupt fixture relation should insert");
        drop(conn);

        let error = SqliteStorage::new(&database_path)
            .err()
            .expect("corrupt database should be rejected");
        assert!(error.to_string().contains("foreign key check failed"));

        let conn = Connection::open(&database_path).expect("database should remain readable");
        let version: i64 = conn
            .pragma_query_value(None, "user_version", |row| row.get(0))
            .expect("version should remain readable");
        assert_eq!(version, 1);
        assert!(!pre_migration_backup_path(&database_path, 1, 2).exists());
    }
}
