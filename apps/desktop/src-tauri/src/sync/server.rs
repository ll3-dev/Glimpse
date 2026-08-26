use std::net::SocketAddr;

use axum::extract::{ConnectInfo, DefaultBodyLimit, State};
use axum::http::{HeaderMap, StatusCode};
use axum::response::{IntoResponse, Response};
use axum::routing::{get, post};
use axum::{Json, Router};
use serde::{Deserialize, Serialize};
use tauri::Emitter;

use super::config::{DesktopSyncState, PublicEndpoints};
use super::SYNC_PROTOCOL_VERSION;

#[derive(Clone)]
pub struct ServerState {
    pub sync: DesktopSyncState,
    pub app: tauri::AppHandle,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct HealthResponse {
    protocol_version: u32,
    device_id: String,
    device_name: String,
    pairing_required: bool,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct PairRequest {
    device_id: String,
    device_name: String,
    pairing_code: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct PairResponse {
    protocol_version: u32,
    desktop_device_id: String,
    desktop_device_name: String,
    token: String,
    endpoints: PublicEndpoints,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SyncRequest {
    device_id: String,
    snapshot: glimpse_core::DataExport,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct SyncResponse {
    protocol_version: u32,
    snapshot: glimpse_core::DataExport,
    endpoints: PublicEndpoints,
    graph_queued: bool,
}

#[derive(Debug, Serialize)]
struct ApiErrorBody {
    code: &'static str,
    message: String,
}

struct ApiError(StatusCode, &'static str, String);

impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        (
            self.0,
            Json(ApiErrorBody {
                code: self.1,
                message: self.2,
            }),
        )
            .into_response()
    }
}

pub fn router(state: ServerState) -> Router {
    Router::new()
        .route("/v1/health", get(health))
        .route("/v1/pair", post(pair))
        .route("/v1/sync", post(sync))
        .layer(DefaultBodyLimit::max(64 * 1024 * 1024))
        .with_state(state)
}

async fn health(State(state): State<ServerState>) -> Json<HealthResponse> {
    Json(HealthResponse {
        protocol_version: SYNC_PROTOCOL_VERSION,
        device_id: state.sync.device_id.clone(),
        device_name: state.sync.device_name.clone(),
        pairing_required: true,
    })
}

async fn pair(
    State(state): State<ServerState>,
    ConnectInfo(remote): ConnectInfo<SocketAddr>,
    Json(request): Json<PairRequest>,
) -> Result<Json<PairResponse>, ApiError> {
    if request.device_id.trim().is_empty()
        || request.device_id.len() > 128
        || request.device_name.trim().is_empty()
        || request.device_name.chars().count() > 80
    {
        return Err(ApiError(
            StatusCode::BAD_REQUEST,
            "invalid_request",
            "deviceId와 deviceName이 필요합니다.".into(),
        ));
    }
    if !state
        .sync
        .validate_pairing_code(&request.pairing_code, remote.ip())
    {
        return Err(ApiError(
            StatusCode::UNAUTHORIZED,
            "pairing_failed",
            "페어링 코드가 만료되었거나 올바르지 않습니다.".into(),
        ));
    }
    let token = state
        .sync
        .pair_client(&request.device_id, &request.device_name)
        .map_err(|message| {
            ApiError(StatusCode::INTERNAL_SERVER_ERROR, "persist_failed", message)
        })?;
    Ok(Json(PairResponse {
        protocol_version: SYNC_PROTOCOL_VERSION,
        desktop_device_id: state.sync.device_id.clone(),
        desktop_device_name: state.sync.device_name.clone(),
        token,
        endpoints: state.sync.public_endpoints(),
    }))
}

async fn sync(
    State(state): State<ServerState>,
    headers: HeaderMap,
    Json(request): Json<SyncRequest>,
) -> Result<Json<SyncResponse>, ApiError> {
    let token = bearer_token(&headers).ok_or_else(|| {
        ApiError(
            StatusCode::UNAUTHORIZED,
            "authorization_required",
            "페어링 토큰이 필요합니다.".into(),
        )
    })?;
    if !state.sync.authorize(&request.device_id, token) {
        return Err(ApiError(
            StatusCode::UNAUTHORIZED,
            "authorization_failed",
            "저장된 페어링과 일치하지 않습니다.".into(),
        ));
    }

    let device_id = request.device_id;
    let remote_snapshot = request.snapshot;
    let snapshot = tauri::async_runtime::spawn_blocking(move || {
        let core = glimpse_bridge::core_state();
        core.merge_data(&remote_snapshot)
            .map_err(|error| error.to_string())
    })
    .await
    .map_err(|error| {
        ApiError(
            StatusCode::INTERNAL_SERVER_ERROR,
            "sync_join_failed",
            error.to_string(),
        )
    })?
    .map_err(|message| {
        ApiError(
            StatusCode::UNPROCESSABLE_ENTITY,
            "sync_merge_failed",
            message,
        )
    })?;

    state.sync.mark_seen(&device_id);
    let _ = state.app.emit(
        "glimpse://sync-complete",
        serde_json::json!({ "deviceId": device_id }),
    );

    Ok(Json(SyncResponse {
        protocol_version: SYNC_PROTOCOL_VERSION,
        snapshot,
        endpoints: state.sync.public_endpoints(),
        graph_queued: true,
    }))
}

fn bearer_token(headers: &HeaderMap) -> Option<&str> {
    headers
        .get(axum::http::header::AUTHORIZATION)?
        .to_str()
        .ok()?
        .strip_prefix("Bearer ")
        .map(str::trim)
        .filter(|token| !token.is_empty())
}
