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
pub struct MergeDeltaInput {
    pub data_json: String,
}

#[derive(Debug, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct MergeDeltaOutput {
    pub knowledge_items: usize,
    pub conversations: usize,
    pub messages: usize,
    pub recommendations: usize,
    pub feedback_events: usize,
}

/// Merge an incremental sync delta row-by-row with LWW semantics instead of
/// rewriting the store — the watermark delta path's counterpart to
/// [`merge_data`]. The counts are rows this delta actually wrote (LWW
/// winners); an all-stale or empty delta reports all zeros, letting callers
/// skip post-sync refetches.
#[command]
pub fn merge_delta(input: MergeDeltaInput) -> Result<MergeDeltaOutput> {
    let core = crate::state::core_state();
    let summary = core
        .apply_delta_json(&input.data_json)
        .map_err(crate::error::to_rustra_err)?;
    Ok(MergeDeltaOutput {
        knowledge_items: summary.knowledge_items,
        conversations: summary.conversations,
        messages: summary.messages,
        recommendations: summary.recommendations,
        feedback_events: summary.feedback_events,
    })
}

#[derive(Debug, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct ExportDeltaInput {
    pub since_clock_ms: i64,
}

#[derive(Debug, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct ExportDeltaOutput {
    pub data_json: String,
}

/// Incremental export for the upstream (client→desktop) delta path: rows
/// whose merge clock is strictly newer than `since_clock_ms`, plus all
/// tombstones. Mirrors `export_data` but bounded by a clock cursor.
#[command]
pub fn export_delta(input: ExportDeltaInput) -> Result<ExportDeltaOutput> {
    let core = crate::state::core_state();
    let data_json = core
        .export_delta_json(input.since_clock_ms)
        .map_err(crate::error::to_rustra_err)?;
    Ok(ExportDeltaOutput { data_json })
}

#[derive(Debug, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct SyncDataRevisionInput {}

#[derive(Debug, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct SyncDataRevisionOutput {
    pub revision: i64,
}

/// Storage write counter maintained by sync-table triggers. Lets clients
/// detect local changes cheaply (revision moved) before paying for a delta
/// export.
#[command]
pub fn sync_data_revision(_input: SyncDataRevisionInput) -> Result<SyncDataRevisionOutput> {
    let core = crate::state::core_state();
    Ok(SyncDataRevisionOutput {
        revision: core.sync_data_revision().map_err(crate::error::to_rustra_err)?,
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
        export_delta,
        import_data,
        merge_data,
        merge_delta,
        sync_data_revision,
        delete_all_data
    )
}
