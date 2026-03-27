#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod models;
mod services;
mod state;

fn main() {
    tauri::Builder::default()
        .manage(state::DesktopRuntimeState::from_defaults())
        .invoke_handler(tauri::generate_handler![
            commands::list_available_runtimes,
            commands::list_managed_models,
            commands::download_model,
            commands::load_model,
            commands::unload_model,
            commands::run_completion,
            commands::run_embedding,
            commands::get_runtime_health
        ])
        .run(tauri::generate_context!())
        .expect("error while running glimpse desktop tauri shell");
}
