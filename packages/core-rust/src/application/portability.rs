use crate::error::Result;
use crate::models::DataImportSummary;

use super::SharedCore;

impl SharedCore {
    pub fn export_data_json(&self) -> Result<String> {
        self.client().export_data_json()
    }

    pub fn import_data_json(&self, data_json: &str) -> Result<DataImportSummary> {
        self.client().import_data_json(data_json)
    }

    pub fn delete_all_data(&self) -> Result<()> {
        self.client().delete_all_data()
    }
}
