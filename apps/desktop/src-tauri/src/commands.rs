use crate::download;
use crate::models::{
    CompletionRequest, CompletionResponse, EmbeddingRequest, EmbeddingResponse, LoadResult,
    ManagedModelRecord, RuntimeDescriptor, RuntimeHealth,
};
use crate::services::runtime_service::DesktopRuntimeService;
use crate::state::DesktopRuntimeState;

#[tauri::command]
pub fn list_available_runtimes() -> Vec<RuntimeDescriptor> {
    DesktopRuntimeService::list_available_runtimes()
}

#[tauri::command]
pub fn list_managed_models(
    state: tauri::State<'_, DesktopRuntimeState>,
) -> Result<Vec<ManagedModelRecord>, String> {
    DesktopRuntimeService::list_managed_models(&state)
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

    // 이전 세션의 취소 플래그가 남아 있으면 정리하고 시작
    state.download_cancels.clear(&model_id);
    let state_inner: DesktopRuntimeState = state.inner().clone();
    let is_cancelled = move |id: &str| state_inner.download_cancels.is_cancelled(id);

    // Perform the actual download
    let result = download::download_model(&app_clone, &model_clone, &is_cancelled).await;

    match result {
        Ok(path) => {
            let path_str = path.to_string_lossy().to_string();
            state.download_cancels.clear(&model_id);
            state.mark_model_downloaded(&model_id, &path_str)
        }
        Err(e) => {
            state.download_cancels.clear(&model_id);
            state.mark_model_download_failed(&model_id, &e)?;
            Err(e)
        }
    }
}

/// Request cancellation of an in-flight download. The download loop
/// observes the flag between chunks and aborts with a failure event.
#[tauri::command]
pub fn cancel_download(
    model_id: String,
    state: tauri::State<'_, DesktopRuntimeState>,
) -> Result<(), String> {
    state.download_cancels.request(&model_id);
    Ok(())
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

/// 임베딩 추론은 수 초 블로킹될 수 있어 메인 스레드가 아닌 blocking
/// 스레드풀에서 실행한다(stream_completion의 spawn_blocking 선례).
#[tauri::command]
pub async fn run_embedding(
    request: EmbeddingRequest,
    state: tauri::State<'_, DesktopRuntimeState>,
) -> Result<EmbeddingResponse, String> {
    let state_clone: DesktopRuntimeState = (*state).clone();
    tauri::async_runtime::spawn_blocking(
        DesktopRuntimeService::run_embedding_blocking(state_clone, request),
    )
    .await
    .map_err(|e| format!("Embedding task failed: {}", e))?
}

/// 검색 재정렬 등 최대 수십 개 텍스트를 한 번의 IPC 로 처리하는 배치
/// 임베딩 — 컨텍스트 1회 생성으로 개별 호출 대비 오버헤드를 줄인다.
/// 빈 requests 는 에러가 아닌 빈 배열을 반환하고, 하나라도 실패하면
/// 전체가 Err. 응답 순서는 요청 순서를 그대로 보존한다.
#[tauri::command]
pub async fn run_embedding_batch(
    requests: Vec<EmbeddingRequest>,
    state: tauri::State<'_, DesktopRuntimeState>,
) -> Result<Vec<EmbeddingResponse>, String> {
    let state_clone: DesktopRuntimeState = (*state).clone();
    tauri::async_runtime::spawn_blocking(
        DesktopRuntimeService::run_embedding_batch_blocking(state_clone, requests),
    )
    .await
    .map_err(|e| format!("Batch embedding task failed: {}", e))?
}

#[tauri::command]
pub fn get_runtime_health(
    state: tauri::State<'_, DesktopRuntimeState>,
) -> Result<RuntimeHealth, String> {
    DesktopRuntimeService::get_runtime_health(&state)
}

#[tauri::command]
pub async fn stream_completion(
    request: CompletionRequest,
    request_id: String,
    state: tauri::State<'_, DesktopRuntimeState>,
) -> Result<CompletionResponse, String> {
    let rid = request_id.clone();
    let state_clone: DesktopRuntimeState = (*state).clone();

    // Token events go through the rustra package's push path: the
    // `tauri_event_sink` installed in main.rs setup delivers them to the
    // webview on channel `rustra://llm:stream-token` (same camelCase payload
    // shape as the previous hand-written `app.emit`). Emitting from this
    // blocking thread is safe — the sink only needs an `AppHandle`, which is
    // internally thread-safe.
    let result = tauri::async_runtime::spawn_blocking(move || {
        state_clone.run_completion_stream(request, |token: &str| {
            glimpse_bridge::emit_llm_token(&rid, token);
        })
    })
    .await
    .map_err(|e| format!("Streaming task failed: {}", e))??;

    glimpse_bridge::emit_llm_done(&request_id, &result.text, &result.stop_reason);

    Ok(result)
}
