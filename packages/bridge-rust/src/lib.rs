//! glimpse-bridge — rustra bridge commands over glimpse-core.
//!
//! Thin rustra `#[command]` wrappers around `glimpse_core::SharedCore`,
//! shared by the Tauri desktop shell and the React Native mobile bridge.

pub mod error;
pub mod io;
pub mod knowledge;
pub mod state;

pub use error::to_rustra_err;
pub use knowledge::knowledge_package;
pub use state::{core_state, init_core};
