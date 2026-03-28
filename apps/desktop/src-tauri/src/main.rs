#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod core;
mod models;
mod services;
mod state;

use tauri::Manager;

fn main() {
    tauri::Builder::default()
        .manage(state::DesktopRuntimeState::from_defaults())
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
            let core_state = core::CoreState::new(glimpse_core::SharedCore::new(storage));
            app.manage(core_state);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // LLM runtime commands
            commands::list_available_runtimes,
            commands::list_managed_models,
            commands::download_model,
            commands::load_model,
            commands::unload_model,
            commands::run_completion,
            commands::run_embedding,
            commands::get_runtime_health,
            // Knowledge Items
            core::commands::save_knowledge_item,
            core::commands::list_knowledge_items,
            core::commands::get_knowledge_item_by_id,
            core::commands::update_knowledge_item,
            core::commands::list_knowledge_items_by_ids,
            core::commands::list_weekly_knowledge_items,
            core::commands::list_pending_knowledge_items_for_labeling,
            core::commands::get_due_knowledge_items,
            // Conversations
            core::commands::create_conversation,
            core::commands::list_conversations,
            core::commands::update_conversation,
            core::commands::delete_conversation,
            // Messages
            core::commands::list_conversation_messages,
            core::commands::add_message,
            core::commands::update_message,
            core::commands::delete_message,
            // Recommendations
            core::commands::save_recommendations,
            core::commands::list_recommendations,
            core::commands::list_pending_recommendations,
            core::commands::respond_to_recommendation,
            // Feedback
            core::commands::list_recent_feedback_events,
            core::commands::log_recommendation_feedback,
            // Review Calculations
            core::commands::calculate_tag_overlap,
            core::commands::calculate_next_review,
            core::commands::initialize_review_schedule
        ])
        .run(tauri::generate_context!())
        .expect("error while running glimpse desktop tauri shell");
}
