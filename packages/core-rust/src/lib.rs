//! Glimpse Core Library
//!
//! This library provides the core business logic for the Glimpse application,
//! shared between mobile (React Native) and desktop (Tauri) platforms.

pub mod core_client;
mod error;
mod models;
mod storage;

pub use core_client::CoreClientImpl;
pub use error::Error;
pub use models::*;
pub use storage::sqlite::SqliteStorage;
