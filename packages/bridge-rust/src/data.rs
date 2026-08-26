//! User-data portability commands shared by desktop and mobile.

use rustra::prelude::*;

#[derive(Debug, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct ExportDataInput {}

#[derive(Debug, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct ExportDataOutput {
    pub data_json: String,
}

#[command]
pub fn export_data(_input: ExportDataInput) -> Result<ExportDataOutput> {
    let core = crate::state::core_state();
    let data_json = core
        .export_data_json()
        .map_err(crate::error::to_rustra_err)?;
    Ok(ExportDataOutput { data_json })
}

#[derive(Debug, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct ImportDataInput {
    pub data_json: String,
}

#[derive(Debug, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct ImportDataOutput {
    pub knowledge_items: usize,
    pub conversations: usize,
    pub messages: usize,
    pub recommendations: usize,
    pub feedback_events: usize,
}

#[command]
pub fn import_data(input: ImportDataInput) -> Result<ImportDataOutput> {
    let core = crate::state::core_state();
    let summary = core
        .import_data_json(&input.data_json)
        .map_err(crate::error::to_rustra_err)?;
    Ok(ImportDataOutput {
        knowledge_items: summary.knowledge_items,
        conversations: summary.conversations,
        messages: summary.messages,
        recommendations: summary.recommendations,
        feedback_events: summary.feedback_events,
    })
}

#[derive(Debug, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct MergeDataInput {
    pub data_json: String,
}

#[derive(Debug, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct MergeDataOutput {
    pub knowledge_items: usize,
    pub conversations: usize,
    pub messages: usize,
    pub recommendations: usize,
    pub feedback_events: usize,
}

/// Merge a remote snapshot without discarding newer local changes.
#[command]
pub fn merge_data(input: MergeDataInput) -> Result<MergeDataOutput> {
    let core = crate::state::core_state();
    let summary = core
        .merge_data_json(&input.data_json)
        .map_err(crate::error::to_rustra_err)?;
    Ok(MergeDataOutput {
        knowledge_items: summary.knowledge_items,
        conversations: summary.conversations,
        messages: summary.messages,
        recommendations: summary.recommendations,
        feedback_events: summary.feedback_events,
    })
}

#[derive(Debug, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct DeleteAllDataInput {}

#[derive(Debug, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct DeleteAllDataOutput {}

#[command]
pub fn delete_all_data(_input: DeleteAllDataInput) -> Result<DeleteAllDataOutput> {
    let core = crate::state::core_state();
    core.delete_all_data()
        .map_err(crate::error::to_rustra_err)?;
    Ok(DeleteAllDataOutput {})
}

pub fn data_package() -> rustra::Package {
    static CACHED: std::sync::OnceLock<rustra::Package> = std::sync::OnceLock::new();
    CACHED
        .get_or_init(|| register_commands(rustra::Package::builder("glimpse.data")).build())
        .clone()
}

pub(crate) fn register_commands(builder: rustra::PackageBuilder) -> rustra::PackageBuilder {
    rustra::register!(
        builder,
        export_data,
        import_data,
        merge_data,
        delete_all_data
    )
}
