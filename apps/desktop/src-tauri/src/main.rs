#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod core;
mod download;
mod llm;
mod models;
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
            // bridge global takes sole ownership. Legacy `core::commands`
            // dispatch through the same global (see core/commands.rs), keeping
            // exactly one connection per process until Task 8 removes them.
            if glimpse_bridge::init_core(glimpse_core::SharedCore::new(storage)).is_some() {
                panic!("glimpse core was initialized more than once");
            }
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
            // Legacy hand-written domain commands (strangler pattern; served
            // from the same SharedCore as the rustra bridge, removed in Task 8)
            core::commands::save_knowledge_item,
            core::commands::list_knowledge_items,
            core::commands::get_knowledge_item_by_id,
            core::commands::update_knowledge_item,
            core::commands::list_knowledge_items_by_ids,
            core::commands::list_weekly_knowledge_items,
            core::commands::list_pending_knowledge_items_for_labeling,
            core::commands::get_due_knowledge_items,
            core::commands::create_conversation,
            core::commands::list_conversations,
            core::commands::update_conversation,
            core::commands::delete_conversation,
            core::commands::list_conversation_messages,
            core::commands::add_message,
            core::commands::update_message,
            core::commands::delete_message,
            core::commands::save_recommendations,
            core::commands::list_recommendations,
            core::commands::list_pending_recommendations,
            core::commands::respond_to_recommendation,
            core::commands::list_recent_feedback_events,
            core::commands::log_recommendation_feedback,
            core::commands::calculate_tag_overlap,
            core::commands::calculate_next_review,
            core::commands::initialize_review_schedule
        ])
        .run(tauri::generate_context!())
        .expect("error while running glimpse desktop tauri shell");
}
