pub mod commands;

use std::sync::Mutex;
use glimpse_core::SharedCore;

/// Managed state for the core-rust business logic.
pub struct CoreState {
    pub core: Mutex<SharedCore>,
}

impl CoreState {
    pub fn new(core: SharedCore) -> Self {
        Self {
            core: Mutex::new(core),
        }
    }
}
