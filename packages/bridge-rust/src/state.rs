//! Global SharedCore state for bridge commands.
//!
//! Hosts (Tauri setup hook, mobile bridge install) call [`init_core`] once with
//! a configured [`SharedCore`]; rustra commands then access it via [`core_state`].

use glimpse_core::SharedCore;
use std::sync::{Mutex, MutexGuard, OnceLock};

static CORE: OnceLock<Mutex<SharedCore>> = OnceLock::new();

/// Installs the process-wide [`SharedCore`].
///
/// Returns the previously installed core, if any. Calling this more than once
/// keeps the first instance (OnceLock semantics) and hands the new one back.
pub fn init_core(core: SharedCore) -> Option<SharedCore> {
    CORE.set(Mutex::new(core))
        .err()
        .map(|mutex| mutex.into_inner().ok())
        .flatten()
}

/// Locks and returns the global SharedCore.
///
/// # Panics
///
/// Panics if [`init_core`] was never called — hosts must initialize the core
/// before dispatching any bridge command.
pub fn core_state() -> MutexGuard<'static, SharedCore> {
    CORE.get()
        .expect("glimpse-bridge core state not initialized; call init_core() first")
        .lock()
        .expect("glimpse-bridge core state mutex poisoned")
}
