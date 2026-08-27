//! Portable data snapshot operations for CoreClient.

use crate::error::Result;
use crate::models::{DataExport, DataImportSummary};
use crate::storage::sqlite::SqliteStorage;

use super::CoreClientImpl;

impl CoreClientImpl {
    pub fn export_data_json(&self) -> Result<String> {
        Ok(serde_json::to_string_pretty(&self.storage.export_data()?)?)
    }

    pub fn import_data_json(&self, data_json: &str) -> Result<DataImportSummary> {
        let data: DataExport = serde_json::from_str(data_json)?;
        self.storage.replace_all_data(&data)
    }

    pub fn merge_data(&self, data: &DataExport) -> Result<DataExport> {
        self.storage.merge_data(data)
    }

    /// Incremental export of rows newer than `since_clock_ms` — see
    /// [`SqliteStorage::export_delta`].
    pub fn export_delta(&self, since_clock_ms: i64) -> Result<DataExport> {
        self.storage.export_delta(since_clock_ms)
    }

    /// Row-wise LWW merge of an incremental payload — see
    /// [`SqliteStorage::apply_delta`].
    pub fn apply_delta(&self, delta: &DataExport) -> Result<DataExport> {
        self.storage.apply_delta(delta)
    }

    /// [`Self::apply_delta`] from its JSON wire form; returns the merged
    /// post-state so callers can re-fingerprint if they need to.
    pub fn apply_delta_json(&self, data_json: &str) -> Result<String> {
        let delta: DataExport = serde_json::from_str(data_json)?;
        Ok(serde_json::to_string(&self.storage.apply_delta(&delta)?)?)
    }

    pub fn merge_data_json(&self, data_json: &str) -> Result<DataImportSummary> {
        let data: DataExport = serde_json::from_str(data_json)?;
        Ok(self.storage.merge_data(&data)?.summary())
    }

    pub fn snapshot_fingerprint(&self) -> Result<String> {
        self.storage.snapshot_fingerprint()
    }

    pub fn sync_data_revision(&self) -> Result<i64> {
        self.storage.sync_data_revision()
    }

    /// Fingerprint of a snapshot we did not necessarily produce ourselves —
    /// used by the sync server to decide whether an incoming snapshot really
    /// carries new content before paying for a merge.
    pub fn fingerprint_of_snapshot(&self, data: &DataExport) -> Result<String> {
        SqliteStorage::fingerprint_of_snapshot(data)
    }

    pub fn delete_all_data(&self) -> Result<()> {
        self.storage.delete_all_data()
    }
}
