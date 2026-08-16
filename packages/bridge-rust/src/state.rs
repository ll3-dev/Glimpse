//! Global SharedCore state for bridge commands.
//!
//! Hosts (Tauri setup hook, mobile bridge install) call [`init_core`] once with
//! a configured [`SharedCore`]; rustra commands then access it via [`core_state`].

use glimpse_core::SharedCore;
use rustra::prelude::*;
use std::ops::{Deref, DerefMut};
use std::sync::{Mutex, MutexGuard};

static CORE: Mutex<Option<SharedCore>> = Mutex::new(None);

/// RAII guard over the installed [`SharedCore`].
///
/// Hand-rolled because `MutexGuard::map` is unstable (`mapped_lock_guards`);
/// derefs to `SharedCore` so command bodies read `core.save_knowledge_item(..)`
/// exactly like a plain `MutexGuard<SharedCore>`.
pub struct CoreGuard {
    _outer: MutexGuard<'static, Option<SharedCore>>,
}

impl Deref for CoreGuard {
    type Target = SharedCore;

    fn deref(&self) -> &SharedCore {
        self._outer
            .as_ref()
            .expect("glimpse-bridge core state not initialized; call init_core() first")
    }
}

impl DerefMut for CoreGuard {
    fn deref_mut(&mut self) -> &mut SharedCore {
        self._outer
            .as_mut()
            .expect("glimpse-bridge core state not initialized; call init_core() first")
    }
}

#[derive(Debug, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct InitializeCoreInput {
    /// Absolute path of the SQLite database file to open. Ignored when the
    /// core is already initialized (the first path wins).
    pub db_path: String,
}

#[derive(Debug, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct InitializeCoreOutput {
    /// True when this call opened the database; false when a previous call
    /// (or the desktop Tauri setup hook) had already initialized the core.
    pub initialized: bool,
}

/// Opens the SQLite database at `dbPath` and installs it as the process-wide
/// [`SharedCore`].
///
/// Mobile hosts have no native setup hook before the JS runtime starts, so
/// this is the rustra-side entry point: the JS client calls it once at app
/// bootstrap with the same DB path the previous Nitro path used. Idempotent —
/// when the core is already installed (previous call, or the desktop Tauri
/// setup hook) it returns `initialized: false` without touching the disk,
/// preserving the "exactly one SQLite connection per process" invariant
/// across host styles. If two callers race past the fast path, the OnceLock
/// keeps the first connection and the loser's is closed on drop.
#[command]
pub fn initialize_core(input: InitializeCoreInput) -> Result<InitializeCoreOutput> {
    if CORE
        .lock()
        .unwrap_or_else(|poisoned| poisoned.into_inner())
        .is_some()
    {
        return Ok(InitializeCoreOutput { initialized: false });
    }

    let storage = glimpse_core::SqliteStorage::new(&input.db_path)
        .map_err(crate::error::to_rustra_err)?;
    let replaced = init_core(SharedCore::new(storage));
    let initialized = replaced.is_none();
    // A racing caller's connection we must not leak — the global kept the
    // first one, so close the newcomer.
    drop(replaced);
    Ok(InitializeCoreOutput { initialized })
}

/// Installs the process-wide [`SharedCore`].
///
/// Returns the previously installed core, if any. Calling this more than once
/// keeps the first instance (first-wins) and hands the new one back.
pub fn init_core(core: SharedCore) -> Option<SharedCore> {
    let mut slot = CORE.lock().unwrap_or_else(|poisoned| poisoned.into_inner());
    slot.replace(core)
}

/// Locks and returns the global SharedCore.
///
/// # Panics
///
/// Panics if [`init_core`] was never called — hosts must initialize the core
/// before dispatching any bridge command.
pub fn core_state() -> CoreGuard {
    CoreGuard {
        _outer: CORE
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner()),
    }
}

/// Registers this module's commands onto an existing package builder.
///
/// Used by the unified `glimpse.core` package — must live in this module
/// because `#[command]`'s generated metadata consts are module-private.
pub(crate) fn register_commands(
    builder: rustra::PackageBuilder,
) -> rustra::PackageBuilder {
    rustra::register!(builder, initialize_core)
}

/// Removes and returns the installed [`SharedCore`].
///
/// Test-support escape hatch for asserting on `initializeCore`'s first-call
/// behavior; hosts never call this. Panics if another thread holds the core.
#[doc(hidden)]
pub fn reset_core() -> Option<SharedCore> {
    CORE.lock()
        .unwrap_or_else(|poisoned| poisoned.into_inner())
        .take()
}
