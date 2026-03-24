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
