use crate::models::{
    CompletionRequest, CompletionResponse, EmbeddingRequest, EmbeddingResponse, LoadResult,
    ManagedModelRecord, RuntimeDescriptor, RuntimeHealth, StreamDoneEvent, StreamTokenEvent,
};
use crate::services::runtime_service::DesktopRuntimeService;
use crate::state::DesktopRuntimeState;
use tauri::Emitter;

#[tauri::command]
pub fn list_available_runtimes() -> Vec<RuntimeDescriptor> {
    DesktopRuntimeService::list_available_runtimes()
}

#[tauri::command]
pub fn list_managed_models(
    state: tauri::State<'_, DesktopRuntimeState>,
) -> Vec<ManagedModelRecord> {
    DesktopRuntimeService::list_managed_models(&state)
        .expect("models lock poisoned")
}

#[tauri::command]
pub fn download_model(
    model_id: String,
    state: tauri::State<'_, DesktopRuntimeState>,
) -> Result<ManagedModelRecord, String> {
    DesktopRuntimeService::download_model(&state, model_id)
}

#[tauri::command]
pub fn load_model(
    model_id: String,
    runtime_id: String,
    state: tauri::State<'_, DesktopRuntimeState>,
) -> Result<LoadResult, String> {
    DesktopRuntimeService::load_model(&state, model_id, runtime_id)
}

#[tauri::command]
pub fn unload_model(
    model_id: String,
    state: tauri::State<'_, DesktopRuntimeState>,
) -> Result<(), String> {
    DesktopRuntimeService::unload_model(&state, model_id)
}

#[tauri::command]
pub fn run_completion(
    request: CompletionRequest,
    state: tauri::State<'_, DesktopRuntimeState>,
) -> Result<CompletionResponse, String> {
    DesktopRuntimeService::run_completion(&state, request)
}

#[tauri::command]
pub fn run_embedding(
    request: EmbeddingRequest,
    state: tauri::State<'_, DesktopRuntimeState>,
) -> Result<EmbeddingResponse, String> {
    DesktopRuntimeService::run_embedding(&state, request)
}

#[tauri::command]
pub fn get_runtime_health(state: tauri::State<'_, DesktopRuntimeState>) -> RuntimeHealth {
    DesktopRuntimeService::get_runtime_health(&state)
        .expect("health lock poisoned")
}

#[tauri::command]
pub async fn stream_completion(
    request: CompletionRequest,
    request_id: String,
    app: tauri::AppHandle,
    state: tauri::State<'_, DesktopRuntimeState>,
) -> Result<CompletionResponse, String> {
    let app_handle = app.clone();
    let rid = request_id.clone();
    let state_clone: DesktopRuntimeState = (*state).clone();

    let result = tauri::async_runtime::spawn_blocking(move || {
        state_clone.run_completion_stream(request, |token: &str| {
            let _ = app_handle.emit(
                "llm:stream-token",
                StreamTokenEvent {
                    request_id: rid.clone(),
                    token: token.to_string(),
                },
            );
        })
    })
    .await
    .map_err(|e| format!("Streaming task failed: {}", e))??;

    let _ = app.emit(
        "llm:stream-done",
        StreamDoneEvent {
            request_id: request_id.clone(),
            full_text: result.text.clone(),
            stop_reason: result.stop_reason.to_string(),
        },
    );

    Ok(result)
}
