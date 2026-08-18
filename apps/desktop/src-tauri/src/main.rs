#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod download;
mod llm;
mod models;
mod secrets;
mod services;
mod state;

use tauri::Manager;

fn main() {
    tauri::Builder::default()
        .manage(state::DesktopRuntimeStateInner::from_defaults())
        // rustra bridge: the managed package backing `rustra_dispatch`.
        // `rustra::tauri_support::register` cannot be used here because it
        // installs its own invoke_handler; instead we manage the state and
        // list `rustra_dispatch` in the single generate_handler! below.
        .manage(rustra::tauri_support::RustraState {
            package: glimpse_bridge::glimpse_package(),
        })
        .setup(|app| {
            let app_data_dir = app
                .path()
                .app_data_dir()
                .expect("failed to resolve app data directory");
            std::fs::create_dir_all(&app_data_dir)
                .expect("failed to create app data directory");
            let db_path = app_data_dir.join("glimpse-core.db");
            let storage =
                glimpse_core::SqliteStorage::new(&db_path).expect("failed to initialize core database");

            // SharedCore owns the SQLite connection and is not Clone, so the
            // bridge global takes sole ownership — exactly one connection per
            // process.
            assert!(
                glimpse_bridge::init_core(glimpse_core::SharedCore::new(storage)).is_none(),
                "glimpse core was initialized more than once"
            );

            // rustra event push: route `Package::emit` (LLM token streaming)
            // straight to the webview. With the sink installed, `emit` bypasses
            // the polling EventBus and calls `app.emit_str` immediately —
            // channel names follow `event_channel()` (`rustra://llm:stream-token`,
            // `rustra://llm:stream-done`; `:`/`-` pass sanitization unchanged).
            // `glimpse_package()` is Arc-backed and shares state with the
            // `RustraState` managed above, so installing here covers every emit.
            // `register_with_events` cannot be used because this shell wires
            // `rustra_dispatch` through its own single `generate_handler!`.
            glimpse_bridge::glimpse_package().set_event_sink(Some(rustra::tauri_support::tauri_event_sink(
                app.handle().clone(),
            )));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // rustra bridge — all 25 domain commands via glimpse.core dispatch
            rustra::tauri_support::rustra_dispatch,
            // LLM runtime commands
            commands::list_available_runtimes,
            commands::list_managed_models,
            commands::download_model,
            commands::delete_model,
            commands::load_model,
            commands::unload_model,
            commands::run_completion,
            commands::stream_completion,
            commands::run_embedding,
            commands::get_runtime_health,
            secrets::get_secret,
            secrets::set_secret,
            secrets::delete_secret
        ])
        .run(tauri::generate_context!())
        .expect("error while running glimpse desktop tauri shell");
}
