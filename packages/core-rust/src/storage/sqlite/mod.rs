//! SQLite storage backend for the Glimpse core library.

mod knowledge;
mod conversation;
mod message;
mod recommendation;
mod feedback;

use std::path::Path;

use rusqlite::Connection;

use crate::error::Result;

const SCHEMA_SQL: &str = include_str!("../schema.sql");

/// SQLite-based storage backend.
pub struct SqliteStorage {
    conn: Connection,
}

impl SqliteStorage {
    /// Creates a new SQLite storage instance at the given path.
    pub fn new<P: AsRef<Path>>(path: P) -> Result<Self> {
        let conn = Connection::open(path)?;
        let storage = Self { conn };
        storage.initialize_schema()?;
        Ok(storage)
    }

    /// Creates an in-memory SQLite storage instance (useful for testing).
    pub fn in_memory() -> Result<Self> {
        let conn = Connection::open_in_memory()?;
        let storage = Self { conn };
        storage.initialize_schema()?;
        Ok(storage)
    }

    fn initialize_schema(&self) -> Result<()> {
        self.conn.execute_batch(SCHEMA_SQL)?;
        Ok(())
    }
}
