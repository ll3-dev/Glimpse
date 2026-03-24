use std::path::Path;

use anyhow::Result;
use rusqlite::Connection;

use super::patches::normalize_json_string_array;

pub const DB_NAME: &str = "glimpse.db";

pub const CREATE_KNOWLEDGE_ITEMS_TABLE_SQL: &str = r#"
CREATE TABLE IF NOT EXISTS knowledge_items (
  id TEXT PRIMARY KEY NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('note', 'link', 'highlight', 'screenshot', 'share')),
  title TEXT,
  body TEXT,
  url TEXT,
  summary TEXT,
  tags TEXT,
  labels TEXT,
  provisional_labels TEXT,
  label_status TEXT DEFAULT 'idle' CHECK(label_status IN ('idle', 'pending', 'provisional', 'final', 'failed')),
  label_source TEXT DEFAULT 'none' CHECK(label_source IN ('none', 'rules', 'apple', 'local_small', 'local_full', 'byok')),
  label_version TEXT,
  label_score REAL,
  label_requested_at REAL,
  label_completed_at REAL,
  label_error TEXT,
  created_at REAL NOT NULL,
  updated_at REAL NOT NULL,
  stability REAL,
  difficulty REAL,
  last_reviewed_at REAL,
  next_review_at REAL
);
"#;

pub const CREATE_RECOMMENDATIONS_TABLE_SQL: &str = r#"
CREATE TABLE IF NOT EXISTS recommendations (
  id TEXT PRIMARY KEY NOT NULL,
  item_a_id TEXT NOT NULL,
  item_b_id TEXT NOT NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'accepted', 'ignored', 'dismissed')),
  created_at REAL NOT NULL,
  responded_at REAL,
  FOREIGN KEY (item_a_id) REFERENCES knowledge_items(id),
  FOREIGN KEY (item_b_id) REFERENCES knowledge_items(id)
);
"#;

pub const CREATE_FEEDBACK_EVENTS_TABLE_SQL: &str = r#"
CREATE TABLE IF NOT EXISTS feedback_events (
  id TEXT PRIMARY KEY NOT NULL,
  recommendation_id TEXT NOT NULL,
  action TEXT NOT NULL CHECK(action IN ('accept', 'ignore', 'dismiss')),
  created_at REAL NOT NULL,
  FOREIGN KEY (recommendation_id) REFERENCES recommendations(id)
);
"#;

pub const CREATE_CONVERSATIONS_TABLE_SQL: &str = r#"
CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY NOT NULL,
  title TEXT,
  icon TEXT,
  context_item_id TEXT,
  created_at REAL NOT NULL,
  updated_at REAL NOT NULL,
  deleted_at REAL
);
"#;

pub const CREATE_MESSAGES_TABLE_SQL: &str = r#"
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY NOT NULL,
  conversation_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at REAL NOT NULL,
  updated_at REAL,
  deleted_at REAL,
  FOREIGN KEY (conversation_id) REFERENCES conversations(id)
);
"#;

pub const CREATE_EMBEDDINGS_TABLE_SQL: &str = r#"
CREATE TABLE IF NOT EXISTS embeddings (
  id TEXT PRIMARY KEY NOT NULL,
  source_type TEXT NOT NULL CHECK(source_type IN ('message', 'knowledge_item')),
  source_id TEXT NOT NULL,
  vector TEXT NOT NULL,
  created_at REAL NOT NULL
);
"#;

pub const CREATE_INDEXES_SQL: [&str; 17] = [
    "CREATE INDEX IF NOT EXISTS knowledge_items_type_idx ON knowledge_items(type);",
    "CREATE INDEX IF NOT EXISTS knowledge_items_created_at_idx ON knowledge_items(created_at);",
    "CREATE INDEX IF NOT EXISTS knowledge_items_next_review_at_idx ON knowledge_items(next_review_at);",
    "CREATE INDEX IF NOT EXISTS knowledge_items_label_status_idx ON knowledge_items(label_status);",
    "CREATE INDEX IF NOT EXISTS knowledge_items_label_requested_at_idx ON knowledge_items(label_requested_at);",
    "CREATE INDEX IF NOT EXISTS recommendations_status_idx ON recommendations(status);",
    "CREATE INDEX IF NOT EXISTS recommendations_item_a_idx ON recommendations(item_a_id);",
    "CREATE INDEX IF NOT EXISTS recommendations_item_b_idx ON recommendations(item_b_id);",
    "CREATE UNIQUE INDEX IF NOT EXISTS recommendations_item_pair_unique_idx ON recommendations(item_a_id, item_b_id);",
    "CREATE INDEX IF NOT EXISTS feedback_events_recommendation_id_idx ON feedback_events(recommendation_id);",
    "CREATE INDEX IF NOT EXISTS feedback_events_created_at_idx ON feedback_events(created_at);",
    "CREATE INDEX IF NOT EXISTS conversations_created_at_idx ON conversations(created_at);",
    "CREATE INDEX IF NOT EXISTS conversations_context_item_idx ON conversations(context_item_id);",
    "CREATE INDEX IF NOT EXISTS messages_conversation_idx ON messages(conversation_id);",
    "CREATE INDEX IF NOT EXISTS messages_created_at_idx ON messages(created_at);",
    "CREATE INDEX IF NOT EXISTS embeddings_source_type_idx ON embeddings(source_type);",
    "CREATE INDEX IF NOT EXISTS embeddings_source_id_idx ON embeddings(source_id);",
];

pub fn open_in_memory() -> Result<Connection> {
    Ok(Connection::open_in_memory()?)
}

pub fn open_database(data_path: &str) -> Result<Connection> {
    let db_path = Path::new(data_path).join(DB_NAME);
    let conn = Connection::open(db_path)?;
    initialize_schema(&conn)?;
    Ok(conn)
}

pub fn initialize_schema(conn: &Connection) -> Result<()> {
    conn.execute_batch(CREATE_KNOWLEDGE_ITEMS_TABLE_SQL)?;
    conn.execute_batch(CREATE_RECOMMENDATIONS_TABLE_SQL)?;
    conn.execute_batch(CREATE_FEEDBACK_EVENTS_TABLE_SQL)?;
    conn.execute_batch(CREATE_CONVERSATIONS_TABLE_SQL)?;
    conn.execute_batch(CREATE_MESSAGES_TABLE_SQL)?;
    conn.execute_batch(CREATE_EMBEDDINGS_TABLE_SQL)?;
    migrate_knowledge_items_schema(conn)?;

    for statement in CREATE_INDEXES_SQL {
        conn.execute(statement, [])?;
    }

    sanitize_knowledge_item_json_columns(conn)?;

    Ok(())
}

fn migrate_knowledge_items_schema(conn: &Connection) -> Result<()> {
    let existing_columns = get_table_columns(conn, "knowledge_items")?;

    for (column_name, column_definition) in [
        ("labels", "TEXT"),
        ("provisional_labels", "TEXT"),
        (
            "label_status",
            "TEXT DEFAULT 'idle' CHECK(label_status IN ('idle', 'pending', 'provisional', 'final', 'failed'))",
        ),
        (
            "label_source",
            "TEXT DEFAULT 'none' CHECK(label_source IN ('none', 'rules', 'apple', 'local_small', 'local_full', 'byok'))",
        ),
        ("label_version", "TEXT"),
        ("label_score", "REAL"),
        ("label_requested_at", "REAL"),
        ("label_completed_at", "REAL"),
        ("label_error", "TEXT"),
        ("stability", "REAL"),
        ("difficulty", "REAL"),
        ("last_reviewed_at", "REAL"),
        ("next_review_at", "REAL"),
    ] {
        if !existing_columns.iter().any(|existing| existing == column_name) {
            let sql =
                format!("ALTER TABLE knowledge_items ADD COLUMN {column_name} {column_definition};");
            conn.execute(&sql, [])?;
        }
    }

    Ok(())
}

fn get_table_columns(conn: &Connection, table_name: &str) -> Result<Vec<String>> {
    let pragma = format!("PRAGMA table_info({table_name});");
    let mut statement = conn.prepare(&pragma)?;
    let columns = statement
        .query_map([], |row| row.get::<_, String>(1))?
        .collect::<rusqlite::Result<Vec<_>>>()?;
    Ok(columns)
}

pub fn sanitize_knowledge_item_json_columns(conn: &Connection) -> Result<()> {
    let mut statement =
        conn.prepare("SELECT id, tags, labels, provisional_labels FROM knowledge_items;")?;
    let rows = statement.query_map([], |row| {
        Ok((
            row.get::<_, String>(0)?,
            row.get::<_, Option<String>>(1)?,
            row.get::<_, Option<String>>(2)?,
            row.get::<_, Option<String>>(3)?,
        ))
    })?;

    for row in rows {
        let (id, tags, labels, provisional_labels) = row?;
        update_json_column(conn, &id, "tags", normalize_json_string_array(tags))?;
        update_json_column(conn, &id, "labels", normalize_json_string_array(labels))?;
        update_json_column(
            conn,
            &id,
            "provisional_labels",
            normalize_json_string_array(provisional_labels),
        )?;
    }

    Ok(())
}

fn update_json_column(
    conn: &Connection,
    item_id: &str,
    column_name: &str,
    next_value: Option<String>,
) -> Result<()> {
    let sql = format!("UPDATE knowledge_items SET {column_name} = ?1 WHERE id = ?2;");
    conn.execute(&sql, (&next_value, item_id))?;
    Ok(())
}
