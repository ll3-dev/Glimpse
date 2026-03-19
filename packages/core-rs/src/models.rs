#[derive(Debug, Clone, PartialEq, Eq)]
pub struct KnowledgeItem {
    pub id: String,
    pub title: Option<String>,
    pub body: Option<String>,
    pub url: Option<String>,
    pub item_type: KnowledgeItemType,
    pub tags: Vec<String>,
    pub created_at: Option<i64>,
    pub last_reviewed_at: Option<i64>,
    pub next_review_at: Option<i64>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum KnowledgeItemType {
    Note,
    Link,
    Highlight,
    Screenshot,
    Share,
}
