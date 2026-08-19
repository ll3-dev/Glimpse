//! SQLite storage backend for the Glimpse core library.

mod conversation;
mod feedback;
mod knowledge;
mod message;
mod recommendation;

use std::path::Path;
use std::time::Duration;

use rusqlite::types::Type;
use rusqlite::{Connection, Row};
use serde::de::DeserializeOwned;

use crate::error::{Error, Result};

const SCHEMA_SQL: &str = include_str!("../schema.sql");
const SCHEMA_VERSION: i64 = 1;

/// SQLite-based storage backend.
pub struct SqliteStorage {
    conn: Connection,
}

impl SqliteStorage {
    /// Creates a new SQLite storage instance at the given path.
    pub fn new<P: AsRef<Path>>(path: P) -> Result<Self> {
        let conn = Connection::open(path)?;
        let storage = Self { conn };
        storage.configure_connection(true)?;
        storage.initialize_schema()?;
        Ok(storage)
    }

    /// Creates an in-memory SQLite storage instance (useful for testing).
    pub fn in_memory() -> Result<Self> {
        let conn = Connection::open_in_memory()?;
        let storage = Self { conn };
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
        let current_version: i64 = self
            .conn
            .pragma_query_value(None, "user_version", |row| row.get(0))?;

        if current_version > SCHEMA_VERSION {
            return Err(Error::InvalidInput(format!(
                "Database schema version {current_version} is newer than supported version {SCHEMA_VERSION}"
            )));
        }

        self.conn.execute_batch(SCHEMA_SQL)?;
        if current_version < SCHEMA_VERSION {
            self.conn
                .pragma_update(None, "user_version", SCHEMA_VERSION)?;
        }
        Ok(())
    }
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
}
