use crate::models::{
    CompletionRequest, CompletionResponse, EmbeddingRequest, EmbeddingResponse, LoadResult,
    ManagedModelRecord, RuntimeDescriptor, RuntimeHealth,
};
use crate::services::runtime_service::DesktopRuntimeService;
use crate::state::DesktopRuntimeState;

#[tauri::command]
pub fn list_available_runtimes() -> Vec<RuntimeDescriptor> {
    DesktopRuntimeService.list_available_runtimes()
}

#[tauri::command]
pub fn list_managed_models(
    state: tauri::State<'_, DesktopRuntimeState>,
) -> Vec<ManagedModelRecord> {
    DesktopRuntimeService
        .list_managed_models(&state)
        .expect("models lock poisoned")
}

#[tauri::command]
pub fn download_model(
    model_id: String,
    state: tauri::State<'_, DesktopRuntimeState>,
) -> Result<ManagedModelRecord, String> {
    DesktopRuntimeService.download_model(&state, model_id)
}

#[tauri::command]
pub fn load_model(
    model_id: String,
    runtime_id: String,
    state: tauri::State<'_, DesktopRuntimeState>,
) -> Result<LoadResult, String> {
    DesktopRuntimeService.load_model(&state, model_id, runtime_id)
}

#[tauri::command]
pub fn unload_model(
    model_id: String,
    state: tauri::State<'_, DesktopRuntimeState>,
) -> Result<(), String> {
    DesktopRuntimeService.unload_model(&state, model_id)
}

#[tauri::command]
pub fn run_completion(
    request: CompletionRequest,
    state: tauri::State<'_, DesktopRuntimeState>,
) -> Result<CompletionResponse, String> {
    DesktopRuntimeService.run_completion(&state, request)
}

#[tauri::command]
pub fn run_embedding(
    request: EmbeddingRequest,
    _state: tauri::State<'_, DesktopRuntimeState>,
) -> Result<EmbeddingResponse, String> {
    DesktopRuntimeService.run_embedding(&state, request)
}

#[tauri::command]
pub fn get_runtime_health(state: tauri::State<'_, DesktopRuntimeState>) -> RuntimeHealth {
    DesktopRuntimeService
        .get_runtime_health(&state)
        .expect("health lock poisoned")
}
