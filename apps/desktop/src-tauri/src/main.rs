#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod download;
mod llm;
mod models;
mod secrets;
mod services;
mod state;
mod sync;

use tauri::Manager;

fn main() {
    let app = tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
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
            std::fs::create_dir_all(&app_data_dir).expect("failed to create app data directory");
            let db_path = app_data_dir.join("glimpse-core.db");
            let storage = glimpse_core::SqliteStorage::new(&db_path)
                .expect("failed to initialize core database");

            // SharedCore owns the SQLite connection and is not Clone, so the
            // bridge global takes sole ownership — exactly one connection per
            // process.
            assert!(
                glimpse_bridge::init_core(glimpse_core::SharedCore::new(storage)).is_none(),
                "glimpse core was initialized more than once"
            );

            let sync_state = sync::initialize(app.handle().clone(), &app_data_dir);
            app.manage(sync_state);

            // rustra event push: route `Package::emit` (LLM token streaming)
            // straight to the webview. With the sink installed, `emit` bypasses
            // the polling EventBus and calls `app.emit_str` immediately —
            // channel names follow `event_channel()` (`rustra://llm:stream-token`,
            // `rustra://llm:stream-done`; `:`/`-` pass sanitization unchanged).
            // `glimpse_package()` is Arc-backed and shares state with the
            // `RustraState` managed above, so installing here covers every emit.
            // `register_with_events` cannot be used because this shell wires
            // `rustra_dispatch` through its own single `generate_handler!`.
            glimpse_bridge::glimpse_package().set_event_sink(Some(
                rustra::tauri_support::tauri_event_sink(app.handle().clone()),
            ));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // rustra bridge — all generated domain commands via glimpse.core dispatch
            rustra::tauri_support::rustra_dispatch,
            // LLM runtime commands
            commands::list_available_runtimes,
            commands::list_managed_models,
            commands::download_model,
            commands::cancel_download,
            commands::delete_model,
            commands::load_model,
            commands::unload_model,
            commands::run_completion,
            commands::stream_completion,
            commands::run_embedding,
            commands::run_embedding_batch,
            commands::get_runtime_health,
            secrets::get_secret,
            secrets::set_secret,
            secrets::delete_secret,
            sync::get_sync_status,
            sync::rotate_pairing_code,
            sync::enable_tailscale_sync,
            sync::forget_paired_client
        ])
        .build(tauri::generate_context!())
        .expect("error while building glimpse desktop tauri shell");

    // 종료 핸들러: 진행 중 다운로드에 취소 플래그를 설정해 chunk 루프가
    // 빠르게 빠져나오게 한다. SQLite 연결은 bridge 전역이 소유하며 프로세스
    // 종료 시 OS 가 정리한다(WAL 모드라 트랜잭션 커밋 후에는 일관성 유지).
    app.run(|app_handle, event| {
        if let tauri::RunEvent::ExitRequested { .. } = event {
            if let Some(state) = app_handle.try_state::<state::DesktopRuntimeState>() {
                for model_id in state.downloading_model_ids() {
                    state.download_cancels.request(&model_id);
                }
            }
        }
    });
}
