use glimpse_core_rs::models::{KnowledgeItem, KnowledgeItemType};
use glimpse_core_rs::recommendation::calculate_tag_overlap;

fn build_item(tags: &[&str]) -> KnowledgeItem {
    KnowledgeItem {
        id: "item".to_string(),
        item_type: KnowledgeItemType::Note,
        title: None,
        body: None,
        url: None,
        summary: None,
        tags: tags.iter().map(|tag| tag.to_string()).collect(),
        labels: None,
        provisional_labels: None,
        label_status: None,
        label_source: None,
        label_version: None,
        label_score: None,
        label_requested_at: None,
        label_completed_at: None,
        label_error: None,
        created_at: 0,
        updated_at: 0,
        stability: None,
        difficulty: None,
        last_reviewed_at: None,
        next_review_at: None,
    }
}

#[test]
fn it_counts_shared_tags() {
    let left = build_item(&["rust", "sqlite", "ffi"]);
    let right = build_item(&["ffi", "desktop", "rust"]);

    assert_eq!(calculate_tag_overlap(&left, &right), 2);
}
