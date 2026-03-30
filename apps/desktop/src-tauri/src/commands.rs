use crate::download;
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
pub async fn download_model(
    model_id: String,
    app: tauri::AppHandle,
    state: tauri::State<'_, DesktopRuntimeState>,
) -> Result<ManagedModelRecord, String> {
    // Get model metadata (repo, filename) before starting download
    let model = state.get_model(&model_id)?;

    // Mark as downloading
    state.mark_model_downloading(&model_id)?;

    let app_clone = app.clone();
    let model_clone = model.clone();

    // Perform the actual download
    let result = download::download_model(&app_clone, &model_clone).await;

    match result {
        Ok(path) => {
            let path_str = path.to_string_lossy().to_string();
            state.mark_model_downloaded(&model_id, &path_str)
        }
        Err(e) => {
            state.mark_model_download_failed(&model_id, &e)?;
            Err(e)
        }
    }
}

#[tauri::command]
pub async fn delete_model(
    model_id: String,
    state: tauri::State<'_, DesktopRuntimeState>,
) -> Result<(), String> {
    // Unload if active
    {
        let model = state.get_model(&model_id)?;
        if model.status == "active" {
            state.unload_model(model_id.clone())?;
        }
    }

    // Delete from disk
    download::delete_model_file(&model_id).await?;

    // Update state
    state.delete_model(&model_id)
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
            stop_reason: result.stop_reason.clone(),
        },
    );

    Ok(result)
}
