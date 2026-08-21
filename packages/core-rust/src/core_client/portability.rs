//! Portable data snapshot operations for CoreClient.

use crate::error::Result;
use crate::models::{DataExport, DataImportSummary};

use super::CoreClientImpl;

impl CoreClientImpl {
    pub fn export_data_json(&self) -> Result<String> {
        Ok(serde_json::to_string_pretty(&self.storage.export_data()?)?)
    }

    pub fn import_data_json(&self, data_json: &str) -> Result<DataImportSummary> {
        let data: DataExport = serde_json::from_str(data_json)?;
        self.storage.replace_all_data(&data)
    }

    pub fn delete_all_data(&self) -> Result<()> {
        self.storage.delete_all_data()
    }
}
