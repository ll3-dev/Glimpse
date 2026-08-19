//! KnowledgeItem operations for CoreClient.

use crate::error::Result;
use crate::models::{KnowledgeItem, KnowledgeItemPatch};

use super::{CoreClientImpl, GetDueKnowledgeItemsInput};

impl CoreClientImpl {
    pub fn save_knowledge_item(&self, item: &KnowledgeItem) -> Result<KnowledgeItem> {
        self.storage.insert_knowledge_item(item)?;
        Ok(item.clone())
    }

    pub fn list_knowledge_items(&self) -> Result<Vec<KnowledgeItem>> {
        self.storage.list_knowledge_items()
    }

    pub fn list_knowledge_items_by_ids(&self, item_ids: &[String]) -> Result<Vec<KnowledgeItem>> {
        self.storage.list_knowledge_items_by_ids(item_ids)
    }

    pub fn list_weekly_knowledge_items(&self, since: i64) -> Result<Vec<KnowledgeItem>> {
        self.storage.list_weekly_knowledge_items(since)
    }

    pub fn list_pending_knowledge_items_for_labeling(
        &self,
        limit: usize,
    ) -> Result<Vec<KnowledgeItem>> {
        self.storage
            .list_pending_knowledge_items_for_labeling(limit)
    }

    pub fn get_knowledge_item_by_id(&self, item_id: &str) -> Result<Option<KnowledgeItem>> {
        self.storage.get_knowledge_item(item_id)
    }

    pub fn get_due_knowledge_items(
        &self,
        input: &GetDueKnowledgeItemsInput,
    ) -> Result<Vec<KnowledgeItem>> {
        self.storage.get_due_knowledge_items(input.now, input.limit)
    }

    pub fn update_knowledge_item(
        &self,
        item_id: &str,
        patch: &KnowledgeItemPatch,
    ) -> Result<KnowledgeItem> {
        self.storage.update_knowledge_item(item_id, patch)
    }

    pub fn delete_knowledge_item(&self, item_id: &str) -> Result<()> {
        self.storage.delete_knowledge_item(item_id)
    }
}
