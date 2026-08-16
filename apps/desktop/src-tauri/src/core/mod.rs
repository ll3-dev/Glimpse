pub mod commands;

// NOTE: `CoreState` (managed SharedCore) was removed when the rustra bridge
// took ownership of the single SharedCore instance (see main.rs setup).
// Legacy commands in `commands` dispatch through `glimpse_bridge::core_state()`
// so the bridge and the legacy surface share ONE SQLite connection.
