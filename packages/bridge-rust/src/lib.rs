//! glimpse-bridge — rustra bridge commands over glimpse-core.
//!
//! Thin rustra `#[command]` wrappers around `glimpse_core::SharedCore`,
//! shared by the Tauri desktop shell and the React Native mobile bridge.

pub mod conversation;
pub mod error;
pub mod feedback;
pub mod io;
pub mod knowledge;
pub mod message;
pub mod recommendation;
pub mod review;
pub mod state;

pub use conversation::conversation_package;
pub use error::to_rustra_err;
pub use feedback::feedback_package;
pub use knowledge::knowledge_package;
pub use message::message_package;
pub use recommendation::recommendation_package;
pub use review::review_package;
pub use state::{core_state, init_core};
