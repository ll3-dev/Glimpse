use glimpse_core_rs::KnowledgeItem;

#[test]
fn knowledge_item_can_be_constructed() {
    let item = KnowledgeItem {
        id: "item_1".to_string(),
        title: Some("Title".to_string()),
        body: None,
        url: None,
        item_type: glimpse_core_rs::models::KnowledgeItemType::Note,
        tags: vec!["rust".to_string()],
        created_at: Some(1_000),
        last_reviewed_at: None,
        next_review_at: None,
    };

    assert_eq!(item.id, "item_1");
}
