//! Knowledge domain rustra commands over `SharedCore`.

use rustra::prelude::*;

use crate::io::{KnowledgeItemIo, KnowledgeItemPatchIo};

#[derive(Debug, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct SaveKnowledgeItemInput {
    pub item: KnowledgeItemIo,
}

#[derive(Debug, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct SaveKnowledgeItemOutput {
    pub item: KnowledgeItemIo,
}

#[command]
pub fn save_knowledge_item(input: SaveKnowledgeItemInput) -> Result<SaveKnowledgeItemOutput> {
    let core = crate::state::core_state();
    let item = core
        .save_knowledge_item(&input.item.into())
        .map_err(crate::error::to_rustra_err)?;
    Ok(SaveKnowledgeItemOutput { item: item.into() })
}

#[derive(Debug, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct ListKnowledgeItemsInput {}

#[derive(Debug, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct ListKnowledgeItemsOutput {
    pub items: Vec<KnowledgeItemIo>,
}

#[command]
pub fn list_knowledge_items(_input: ListKnowledgeItemsInput) -> Result<ListKnowledgeItemsOutput> {
    let core = crate::state::core_state();
    let items = core
        .list_knowledge_items()
        .map_err(crate::error::to_rustra_err)?;
    Ok(ListKnowledgeItemsOutput {
        items: items.into_iter().map(Into::into).collect(),
    })
}

#[derive(Debug, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct GetKnowledgeItemByIdInput {
    pub item_id: String,
}

#[derive(Debug, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct GetKnowledgeItemByIdOutput {
    pub item: Option<KnowledgeItemIo>,
}

#[command]
pub fn get_knowledge_item_by_id(
    input: GetKnowledgeItemByIdInput,
) -> Result<GetKnowledgeItemByIdOutput> {
    let core = crate::state::core_state();
    let item = core
        .get_knowledge_item_by_id(&input.item_id)
        .map_err(crate::error::to_rustra_err)?;
    Ok(GetKnowledgeItemByIdOutput {
        item: item.map(Into::into),
    })
}

#[derive(Debug, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct UpdateKnowledgeItemInput {
    pub item_id: String,
    pub patch: KnowledgeItemPatchIo,
}

#[derive(Debug, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct UpdateKnowledgeItemOutput {
    pub item: KnowledgeItemIo,
}

#[command]
pub fn update_knowledge_item(
    input: UpdateKnowledgeItemInput,
) -> Result<UpdateKnowledgeItemOutput> {
    let core = crate::state::core_state();
    let patch: glimpse_core::KnowledgeItemPatch = input.patch.into();
    let item = core
        .update_knowledge_item(&input.item_id, &patch)
        .map_err(crate::error::to_rustra_err)?;
    Ok(UpdateKnowledgeItemOutput { item: item.into() })
}

#[derive(Debug, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct ListKnowledgeItemsByIdsInput {
    pub item_ids: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct ListKnowledgeItemsOutputByIds {
    pub items: Vec<KnowledgeItemIo>,
}

#[command]
pub fn list_knowledge_items_by_ids(
    input: ListKnowledgeItemsByIdsInput,
) -> Result<ListKnowledgeItemsOutputByIds> {
    let core = crate::state::core_state();
    let items = core
        .list_knowledge_items_by_ids(&input.item_ids)
        .map_err(crate::error::to_rustra_err)?;
    Ok(ListKnowledgeItemsOutputByIds {
        items: items.into_iter().map(Into::into).collect(),
    })
}

#[derive(Debug, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct ListWeeklyKnowledgeItemsInput {
    pub since: i64,
}

#[derive(Debug, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct ListWeeklyKnowledgeItemsOutput {
    pub items: Vec<KnowledgeItemIo>,
}

#[command]
pub fn list_weekly_knowledge_items(
    input: ListWeeklyKnowledgeItemsInput,
) -> Result<ListWeeklyKnowledgeItemsOutput> {
    let core = crate::state::core_state();
    let items = core
        .list_weekly_knowledge_items(input.since)
        .map_err(crate::error::to_rustra_err)?;
    Ok(ListWeeklyKnowledgeItemsOutput {
        items: items.into_iter().map(Into::into).collect(),
    })
}

#[derive(Debug, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct ListPendingKnowledgeItemsForLabelingInput {
    pub limit: usize,
}

#[derive(Debug, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct ListPendingKnowledgeItemsForLabelingOutput {
    pub items: Vec<KnowledgeItemIo>,
}

#[command]
pub fn list_pending_knowledge_items_for_labeling(
    input: ListPendingKnowledgeItemsForLabelingInput,
) -> Result<ListPendingKnowledgeItemsForLabelingOutput> {
    let core = crate::state::core_state();
    let items = core
        .list_pending_knowledge_items_for_labeling(input.limit)
        .map_err(crate::error::to_rustra_err)?;
    Ok(ListPendingKnowledgeItemsForLabelingOutput {
        items: items.into_iter().map(Into::into).collect(),
    })
}

#[derive(Debug, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct GetDueKnowledgeItemsIoInput {
    pub now: i64,
    pub limit: Option<usize>,
}

#[derive(Debug, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct GetDueKnowledgeItemsIoOutput {
    pub items: Vec<KnowledgeItemIo>,
}

#[command]
pub fn get_due_knowledge_items(
    input: GetDueKnowledgeItemsIoInput,
) -> Result<GetDueKnowledgeItemsIoOutput> {
    let core = crate::state::core_state();
    let due_input = glimpse_core::GetDueKnowledgeItemsInput {
        now: input.now,
        limit: input.limit,
    };
    let items = core
        .get_due_knowledge_items(&due_input)
        .map_err(crate::error::to_rustra_err)?;
    Ok(GetDueKnowledgeItemsIoOutput {
        items: items.into_iter().map(Into::into).collect(),
    })
}

/// Assembles the `glimpse.knowledge` package with all knowledge commands.
pub fn knowledge_package() -> rustra::Package {
    static CACHED: std::sync::OnceLock<rustra::Package> = std::sync::OnceLock::new();
    CACHED
        .get_or_init(|| {
            rustra::register!(
                rustra::Package::builder("glimpse.knowledge"),
                save_knowledge_item,
                list_knowledge_items,
                get_knowledge_item_by_id,
                update_knowledge_item,
                list_knowledge_items_by_ids,
                list_weekly_knowledge_items,
                list_pending_knowledge_items_for_labeling,
                get_due_knowledge_items
            )
            .build()
        })
        .clone()
}
