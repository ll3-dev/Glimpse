use std::sync::Mutex;

use crate::models::{default_health, default_models, ManagedModelRecord, RuntimeHealth};

pub struct DesktopRuntimeState {
    pub models: Mutex<Vec<ManagedModelRecord>>,
    pub health: Mutex<RuntimeHealth>,
}

impl DesktopRuntimeState {
    pub fn from_defaults() -> Self {
        Self {
            models: Mutex::new(default_models()),
            health: Mutex::new(default_health()),
        }
    }
}
