use anyhow::{anyhow, Result};
use serde_json::{Map, Value};

use crate::ffi::bridging::NullableNumber;

use super::{parse_json, to_i64, to_json, to_optional_i64, GlimpseCore};

impl GlimpseCore {
    pub(crate) fn save_knowledge_item_json(&mut self, payload_json: &str) -> Result<String> {
        let item: glimpse_core_rs::KnowledgeItem = parse_json(payload_json)?;
        let saved = glimpse_core_rs::db::save_knowledge_item(&self.conn, &item)
            .map_err(|error| anyhow!("Failed to save knowledge item: {error}"))?;
        to_json(&saved)
    }

    pub(crate) fn list_knowledge_items_json(&mut self) -> Result<String> {
        let items = glimpse_core_rs::db::list_knowledge_items(&self.conn)
            .map_err(|error| anyhow!("Failed to list knowledge items: {error}"))?;
        to_json(&items)
    }

    pub(crate) fn list_knowledge_items_by_ids_json(&mut self, item_ids_json: &str) -> Result<String> {
        let item_ids: Vec<String> = parse_json(item_ids_json)?;
        let items = glimpse_core_rs::db::list_knowledge_items_by_ids(&self.conn, &item_ids)
            .map_err(|error| anyhow!("Failed to list knowledge items by ids: {error}"))?;
        to_json(&items)
    }

    pub(crate) fn list_weekly_knowledge_items_json(&mut self, since: f64) -> Result<String> {
        let items = glimpse_core_rs::db::list_weekly_knowledge_items(&self.conn, to_i64(since))
            .map_err(|error| anyhow!("Failed to list weekly knowledge items: {error}"))?;
        to_json(&items)
    }

    pub(crate) fn list_pending_knowledge_items_for_labeling_json(&mut self, limit: f64) -> Result<String> {
        let items =
            glimpse_core_rs::db::list_pending_knowledge_items_for_labeling(&self.conn, to_i64(limit))
                .map_err(|error| anyhow!("Failed to list pending labeling items: {error}"))?;
        to_json(&items)
    }

    pub(crate) fn get_knowledge_item_by_id_json(&mut self, item_id: &str) -> Result<String> {
        let item = glimpse_core_rs::db::get_knowledge_item_by_id(&self.conn, item_id)
            .map_err(|error| anyhow!("Failed to get knowledge item: {error}"))?;
        to_json(&item)
    }

    pub(crate) fn get_due_knowledge_items_json(&mut self, now: f64, limit: NullableNumber) -> Result<String> {
        let items = glimpse_core_rs::db::get_due_knowledge_items(
            &self.conn,
            to_i64(now),
            to_optional_i64(limit),
        )
        .map_err(|error| anyhow!("Failed to list due knowledge items: {error}"))?;
        to_json(&items)
    }

    pub(crate) fn update_knowledge_item_json(&mut self, item_id: &str, patch_json: &str) -> Result<String> {
        let patch: Map<String, Value> = parse_json(patch_json)?;
        let item = glimpse_core_rs::db::update_knowledge_item(&self.conn, item_id, &patch)
            .map_err(|error| anyhow!("Failed to update knowledge item: {error}"))?;
        to_json(&item)
    }
}
