use crate::models::{
    default_runtimes, CompletionRequest, CompletionResponse, EmbeddingRequest, EmbeddingResponse,
    LoadResult, ManagedModelRecord, RuntimeDescriptor, RuntimeHealth,
};
use crate::state::DesktopRuntimeState;

#[tauri::command]
pub fn list_available_runtimes() -> Vec<RuntimeDescriptor> {
    default_runtimes()
}

#[tauri::command]
pub fn list_managed_models(
    state: tauri::State<'_, DesktopRuntimeState>,
) -> Vec<ManagedModelRecord> {
    state.models.lock().expect("models lock poisoned").clone()
}

#[tauri::command]
pub fn download_model(
    model_id: String,
    state: tauri::State<'_, DesktopRuntimeState>,
) -> Result<ManagedModelRecord, String> {
    let mut models = state.models.lock().map_err(|_| "models lock poisoned")?;
    let model = models
        .iter_mut()
        .find(|candidate| candidate.id == model_id)
        .ok_or_else(|| format!("Managed model not found: {model_id}"))?;
    model.status = "ready";
    model.path = Some(Box::leak(
        format!("~/Library/Application Support/Glimpse/models/{}.gguf", model.id).into_boxed_str(),
    ));
    Ok(model.clone())
}

#[tauri::command]
pub fn load_model(
    model_id: String,
    runtime_id: String,
    state: tauri::State<'_, DesktopRuntimeState>,
) -> Result<LoadResult, String> {
    let mut models = state.models.lock().map_err(|_| "models lock poisoned")?;
    let mut found = false;
    for model in models.iter_mut() {
        if model.id == model_id {
            model.status = "active";
            found = true;
        } else if model.status == "active" {
            model.status = "ready";
        }
    }

    if !found {
        return Err(format!("Managed model not found: {model_id}"));
    }

    let mut health = state.health.lock().map_err(|_| "health lock poisoned")?;
    health.status = if runtime_id == "remote-byok" {
        "degraded"
    } else {
        "healthy"
    };
    health.loaded_model_id = Some(model_id.clone());

    Ok(LoadResult {
        loaded_model_id: model_id,
        runtime_id,
    })
}

#[tauri::command]
pub fn unload_model(
    model_id: String,
    state: tauri::State<'_, DesktopRuntimeState>,
) -> Result<(), String> {
    let mut models = state.models.lock().map_err(|_| "models lock poisoned")?;
    for model in models.iter_mut() {
        if model.id == model_id && model.status == "active" {
            model.status = "ready";
        }
    }

    let mut health = state.health.lock().map_err(|_| "health lock poisoned")?;
    if health.loaded_model_id.as_ref() == Some(&model_id) {
        health.loaded_model_id = None;
        health.last_unload_at = Some(
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .map_err(|_| "system clock error")?
                .as_secs(),
        );
    }

    Ok(())
}

#[tauri::command]
pub fn run_completion(
    request: CompletionRequest,
    state: tauri::State<'_, DesktopRuntimeState>,
) -> Result<CompletionResponse, String> {
    let mut health = state.health.lock().map_err(|_| "health lock poisoned")?;
    health.queue_depth = 1;
    health.loaded_model_id = Some(request.model_id.clone());
    let prompt = request
        .messages
        .last()
        .map(|message| message.content.clone())
        .unwrap_or_default();
    health.queue_depth = 0;
    Ok(CompletionResponse {
        text: format!("[{}] {}: {}", request.runtime_id, request.model_id, prompt),
        stop_reason: "completed",
    })
}

#[tauri::command]
pub fn run_embedding(
    request: EmbeddingRequest,
    _state: tauri::State<'_, DesktopRuntimeState>,
) -> Result<EmbeddingResponse, String> {
    let base = request.input.len().max(1) as f32;
    Ok(EmbeddingResponse {
        vector: vec![base, base / 2.0, base / 4.0],
    })
}

#[tauri::command]
pub fn get_runtime_health(state: tauri::State<'_, DesktopRuntimeState>) -> RuntimeHealth {
    state
        .health
        .lock()
        .expect("health lock poisoned")
        .clone()
}
