use crate::models::KnowledgeItem;
use std::collections::HashSet;

pub fn calculate_tag_overlap(left: &KnowledgeItem, right: &KnowledgeItem) -> usize {
    let left_tags: HashSet<&str> = left.tags.iter().map(String::as_str).collect();
    right
        .tags
        .iter()
        .filter(|tag| left_tags.contains(tag.as_str()))
        .count()
}
