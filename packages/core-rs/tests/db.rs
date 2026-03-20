use glimpse_core_rs::db::{initialize_schema, open_in_memory};

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
