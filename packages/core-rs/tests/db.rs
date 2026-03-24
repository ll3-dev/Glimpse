use glimpse_core_rs::db::{get_due_knowledge_items, initialize_schema, open_in_memory};

#[test]
fn creates_expected_tables() {
    let conn = open_in_memory().expect("in-memory db");
    initialize_schema(&conn).expect("schema init");

    let mut stmt = conn
        .prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name;")
        .expect("prepare");
    let tables = stmt
        .query_map([], |row| row.get::<_, String>(0))
        .expect("query")
        .collect::<Result<Vec<_>, _>>()
        .expect("collect");

    assert!(tables.contains(&"knowledge_items".to_string()));
    assert!(tables.contains(&"recommendations".to_string()));
    assert!(tables.contains(&"feedback_events".to_string()));
    assert!(tables.contains(&"conversations".to_string()));
    assert!(tables.contains(&"messages".to_string()));
    assert!(tables.contains(&"embeddings".to_string()));
}

#[test]
fn sanitizes_invalid_json_columns() {
    let conn = open_in_memory().expect("in-memory db");
    initialize_schema(&conn).expect("schema init");

    conn.execute(
        "INSERT INTO knowledge_items (
          id, type, tags, labels, provisional_labels, created_at, updated_at
        ) VALUES (?1, 'note', ?2, ?3, ?4, 1, 1);",
        ("item-1", "\"bad\"", "[\"alpha\",\" \",\"alpha\",\"stub-tag\"]", "not-json"),
    )
    .expect("insert");

    glimpse_core_rs::db::sanitize_knowledge_item_json_columns(&conn).expect("sanitize");

    let row = conn
        .query_row(
            "SELECT tags, labels, provisional_labels FROM knowledge_items WHERE id = 'item-1';",
            [],
            |row| {
                Ok((
                    row.get::<_, Option<String>>(0)?,
                    row.get::<_, Option<String>>(1)?,
                    row.get::<_, Option<String>>(2)?,
                ))
            },
        )
        .expect("row");

    assert_eq!(row.0, None);
    assert_eq!(row.1, Some("[\"alpha\"]".to_string()));
    assert_eq!(row.2, None);
}

#[test]
fn migrates_legacy_knowledge_items_schema_for_due_queries() {
    let conn = open_in_memory().expect("in-memory db");

    conn.execute_batch(
        r#"
        CREATE TABLE knowledge_items (
          id TEXT PRIMARY KEY NOT NULL,
          type TEXT NOT NULL,
          title TEXT,
          body TEXT,
          url TEXT,
          summary TEXT,
          tags TEXT,
          created_at REAL NOT NULL,
          updated_at REAL NOT NULL,
          stability REAL,
          difficulty REAL,
          last_reviewed_at REAL,
          next_review_at REAL
        );
        "#,
    )
    .expect("legacy schema");

    conn.execute(
        "INSERT INTO knowledge_items (
          id, type, tags, created_at, updated_at, next_review_at
        ) VALUES (?1, 'note', ?2, 1, 1, 5);",
        ("item-1", "[\"alpha\"]"),
    )
    .expect("insert legacy item");

    initialize_schema(&conn).expect("schema init");

    let items = get_due_knowledge_items(&conn, 10, None).expect("due items");
    assert_eq!(items.len(), 1);
    assert_eq!(items[0].id, "item-1");
    assert_eq!(items[0].labels, None);
    assert_eq!(items[0].provisional_labels, None);
}

/// Test that get_due_knowledge_items handles rows with NULL stability/difficulty values.
/// This can happen when columns were added via migration but existing rows have NULL values.
#[test]
fn handles_null_stability_and_difficulty() {
    let conn = open_in_memory().expect("Failed to open in-memory DB");
    initialize_schema(&conn).expect("Failed to initialize schema");

    // Insert a knowledge item with NULL stability/difficulty (simulating old data after migration)
    conn.execute(
        "INSERT INTO knowledge_items (
            id, type, title, body, url, summary, tags,
            created_at, updated_at, next_review_at
        ) VALUES (
            'test-null-fields', 'note', 'Test Title', 'Test Body', NULL, NULL, '[]',
            1000.0, 1000.0, 500.0
        );",
        [],
    )
    .expect("Failed to insert test data");

    // This should NOT panic or return an error, even with NULL stability/difficulty
    let items = get_due_knowledge_items(&conn, 600, None).expect("Failed to get due items");

    assert_eq!(items.len(), 1);
    let item = &items[0];
    assert_eq!(item.id, "test-null-fields");
    assert!(item.stability.is_none(), "stability should be None for NULL DB value");
    assert!(item.difficulty.is_none(), "difficulty should be None for NULL DB value");
    assert!(item.last_reviewed_at.is_none(), "last_reviewed_at should be None for NULL DB value");
}

/// Test that get_due_knowledge_items works with fully populated review fields.
#[test]
fn handles_populated_review_fields() {
    let conn = open_in_memory().expect("Failed to open in-memory DB");
    initialize_schema(&conn).expect("Failed to initialize schema");

    // Insert a knowledge item with all review fields populated
    conn.execute(
        "INSERT INTO knowledge_items (
            id, type, title, body, url, summary, tags,
            created_at, updated_at, stability, difficulty,
            last_reviewed_at, next_review_at
        ) VALUES (
            'test-populated', 'note', 'Test Title', 'Test Body', NULL, NULL, '[]',
            1000.0, 1000.0, 2.5, 0.8,
            400.0, 500.0
        );",
        [],
    )
    .expect("Failed to insert test data");

    let items = get_due_knowledge_items(&conn, 600, None).expect("Failed to get due items");

    assert_eq!(items.len(), 1);
    let item = &items[0];
    assert_eq!(item.id, "test-populated");
    assert_eq!(item.stability, Some(2.5));
    assert_eq!(item.difficulty, Some(0.8));
    assert_eq!(item.last_reviewed_at, Some(400));
    assert_eq!(item.next_review_at, Some(500));
}

/// Test that migration adds missing review columns to existing table.
#[test]
fn migration_adds_review_columns() {
    let conn = open_in_memory().expect("Failed to open in-memory DB");

    // Create table without the review columns (simulating very old schema)
    conn.execute(
        "CREATE TABLE knowledge_items (
            id TEXT PRIMARY KEY NOT NULL,
            type TEXT NOT NULL,
            title TEXT,
            body TEXT,
            url TEXT,
            summary TEXT,
            tags TEXT,
            created_at REAL NOT NULL,
            updated_at REAL NOT NULL
        );",
        [],
    )
    .expect("Failed to create old schema");

    // Insert data with old schema (no review columns)
    conn.execute(
        "INSERT INTO knowledge_items (id, type, title, body, url, summary, tags, created_at, updated_at)
         VALUES ('old-item', 'note', 'Old Item', 'Body', NULL, NULL, '[]', 1000.0, 1000.0);",
        [],
    )
    .expect("Failed to insert old data");

    // Run migration
    initialize_schema(&conn).expect("Failed to run migration");

    // Verify columns were added
    let columns: Vec<String> = conn
        .prepare("PRAGMA table_info(knowledge_items);")
        .expect("Failed to prepare pragma")
        .query_map([], |row| row.get(1))
        .expect("Failed to get columns")
        .collect::<rusqlite::Result<Vec<_>>>()
        .expect("Failed to collect columns");

    assert!(columns.iter().any(|c| c == "stability"), "stability column should be added");
    assert!(columns.iter().any(|c| c == "difficulty"), "difficulty column should be added");
    assert!(
        columns.iter().any(|c| c == "last_reviewed_at"),
        "last_reviewed_at column should be added"
    );
    assert!(
        columns.iter().any(|c| c == "next_review_at"),
        "next_review_at column should be added"
    );
}
