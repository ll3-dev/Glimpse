use glimpse_core_rs::KnowledgeItem;

#[test]
fn knowledge_item_can_be_constructed() {
    let item = KnowledgeItem {
        id: "item_1".to_string(),
        item_type: glimpse_core_rs::models::KnowledgeItemType::Note,
        title: Some("Title".to_string()),
        body: None,
        url: None,
        summary: None,
        tags: vec!["rust".to_string()],
        labels: None,
        provisional_labels: None,
        label_status: None,
        label_source: None,
        label_version: None,
        label_score: None,
        label_requested_at: None,
        label_completed_at: None,
        label_error: None,
        created_at: 1_000,
        updated_at: 1_000,
        stability: None,
        difficulty: None,
        last_reviewed_at: None,
        next_review_at: None,
    };

    assert_eq!(item.id, "item_1");
}
