use glimpse_core_rs::models::{KnowledgeItem, KnowledgeItemType};
use glimpse_core_rs::recommendation::calculate_tag_overlap;

fn build_item(tags: &[&str]) -> KnowledgeItem {
    KnowledgeItem {
        id: "item".to_string(),
        title: None,
        body: None,
        url: None,
        item_type: KnowledgeItemType::Note,
        tags: tags.iter().map(|tag| tag.to_string()).collect(),
        created_at: None,
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
