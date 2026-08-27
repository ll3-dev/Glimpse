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
    /// Deprecated: clients echo the fingerprint from the previous sync
    /// response, which describes the *desktop's* past content, not the
    /// client's. The skip decision is made by hashing the received snapshot
    /// server-side; this field is kept only for wire compatibility and is
    /// never consulted.
    #[allow(dead_code)]
    fingerprint: Option<String>,
    snapshot: glimpse_core::DataExport,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct SyncResponse {
    protocol_version: u32,
    /// `None` when the received snapshot is content-identical to what we
    /// already hold: there is nothing to merge in either direction, so we
    /// skip the rewrite (the common idle-polling case).
    snapshot: Option<glimpse_core::DataExport>,
    fingerprint: String,
    endpoints: PublicEndpoints,
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
    use axum::extract::Request;
    use tower_http::compression::CompressionLayer;
    use tower_http::decompression::DecompressionLayer;
    let port = state.sync.port();
    let local_names = advertised_host_names(&state.sync);
    Router::new()
        .route("/v1/health", get(health))
        .route("/v1/pair", post(pair))
        .route("/v1/sync", post(sync))
        .layer(axum::middleware::from_fn(move |request: Request, next| {
            reject_foreign_hosts(request, next, port, local_names.clone())
        }))
        // Snapshots are JSON that compresses ~10x. The mobile client gzips
        // request bodies above a size threshold (Content-Encoding: gzip) and
        // advertises Accept-Encoding for compressed responses.
        .layer(DecompressionLayer::new())
        .layer(CompressionLayer::new().gzip(true))
        .layer(DefaultBodyLimit::max(64 * 1024 * 1024))
        .with_state(state)
}

/// Hostnames under which this desktop legitimately advertises itself: the
/// mDNS record advertised during discovery plus the device name. A request
/// addressed by anything else (an arbitrary domain) is a rebinding attempt.
fn advertised_host_names(state: &DesktopSyncState) -> std::sync::Arc<Vec<String>> {
    let mut names = vec![format!(
        "glimpse-{}.local",
        state.device_id.chars().take(8).collect::<String>()
    )];
    let device = state.device_name.trim().to_ascii_lowercase();
    if !device.is_empty() {
        names.push(device);
    }
    std::sync::Arc::new(names)
}

/// DNS-rebinding defense: a browser page rebound to this machine must not be
/// able to drive the sync API. Requests must address us as a local origin
/// (`localhost[:any]`, a private/loopback/link-local IP) or via a proxy name
/// we actually answer to (`*.ts.net` / our own advertised names) **on our
/// sync port** — anything else is refused.
async fn reject_foreign_hosts(
    request: axum::extract::Request,
    next: axum::middleware::Next,
    port: u16,
    local_names: std::sync::Arc<Vec<String>>,
) -> Response {
    let host = request
        .headers()
        .get(axum::http::header::HOST)
        .and_then(|value| value.to_str().ok())
        .unwrap_or_default();

    if is_allowed_host(host, port, &local_names) {
        next.run(request).await
    } else {
        ApiError(
            StatusCode::FORBIDDEN,
            "host_not_allowed",
            format!("Host '{host}'은(는) 이 동기화 서버에 접근할 수 없습니다."),
        )
        .into_response()
    }
}

/// Local origins and private/link-local LAN addresses are always allowed;
/// any other hostname is only allowed when addressed with our sync port AND
/// it is a name we plausibly serve under — a Tailnet (`*.ts.net`) proxy name
/// or our own mDNS advertisement. An arbitrary public-looking domain on our
/// port (`evil.com:{port}`) is exactly the DNS-rebinding payload and must
/// stay refused, as must bare integer/octal IP spellings of remote hosts.
fn is_allowed_host(host: &str, port: u16, local_names: &[String]) -> bool {
    let host_only = host.rsplit_once(':').map(|(h, _)| h).unwrap_or(host);
    let host_only = host_only.trim_start_matches('[').trim_end_matches(']');
    let host_only = host_only
        .strip_suffix('.')
        .unwrap_or(host_only)
        .to_ascii_lowercase();
    let local_ip = host_only
        .parse::<std::net::IpAddr>()
        .is_ok_and(|ip| match ip {
            std::net::IpAddr::V4(v4) => {
                v4.is_private() || v4.is_loopback() || v4.is_link_local()
            }
            std::net::IpAddr::V6(v6) => v6.is_loopback() || (v6.segments()[0] & 0xfe80) == 0xfe80,
        });
    if matches!(host_only.as_str(), "localhost" | "127.0.0.1" | "::1") || local_ip {
        return true;
    }
    // Anything not literally ours must at least arrive on the sync port —
    // proxies (Tailscale Serve, mDNS resolution) forward to exactly that.
    if !host.ends_with(&format!(":{port}")) {
        return false;
    }
    host_only.ends_with(".ts.net")
        || local_names.iter().any(|name| {
            let name = name.strip_suffix('.').unwrap_or(name);
            name.eq_ignore_ascii_case(&host_only)
        })
}

async fn health(State(state): State<ServerState>) -> Json<HealthResponse> {
    Json(HealthResponse {
        protocol_version: SYNC_PROTOCOL_VERSION,
        device_id: state.sync.device_id.clone(),
        device_name: state.sync.device_name.clone(),
        pairing_required: state.sync.paired_clients().is_empty(),
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
    let endpoints = endpoints_via_blocking_pool(&state).await;
    Ok(Json(PairResponse {
        protocol_version: SYNC_PROTOCOL_VERSION,
        desktop_device_id: state.sync.device_id.clone(),
        desktop_device_name: state.sync.device_name.clone(),
        token,
        endpoints,
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
    let sync_state = state.sync.clone();
    let (snapshot, fingerprint) = tauri::async_runtime::spawn_blocking(move || {
        let core = glimpse_bridge::core_state();
        // Hash the *received* snapshot first — that needs no database access.
        // An idle poll then skips both the merge AND our own full export+
        // SHA256 by trusting the cached fingerprint; the storage write-
        // revision keeps that cache honest (any mutation, local webview edits
        // included, bumps it and forces a recompute).
        let remote_fingerprint =
            glimpse_core::SqliteStorage::fingerprint_of_snapshot(&remote_snapshot);
        let revision = core
            .sync_data_revision()
            .map_err(|error| error.to_string())?;
        let cached = sync_state.cached_fingerprint_for_revision(revision);
        let skip = cached.is_some()
            && remote_fingerprint.is_ok_and(|remote| {
                remote_snapshot.format_version != 0
                    && remote_snapshot.format_version <= glimpse_core::DataExport::FORMAT_VERSION
                    && Some(remote.as_str()) == cached.as_deref()
            });
        if skip {
            return Ok((None, cached.expect("checked above")));
        }
        // Cache miss: run the real merge. An unhashable payload fails open
        // into this path on purpose — an unnecessary merge is cheap next to a
        // lost change.
        let merged = core
            .merge_data(&remote_snapshot)
            .map_err(|error| error.to_string())?;
        let fresh_revision = core
            .sync_data_revision()
            .map_err(|error| error.to_string())?;
        match core.snapshot_fingerprint() {
            Ok(fresh) => sync_state.store_cached_fingerprint(fresh_revision, fresh.clone()),
            Err(_) => sync_state.invalidate_cached_fingerprint(),
        }
        let fingerprint = sync_state
            .cached_fingerprint_for_revision(fresh_revision)
            .ok_or_else(|| "fingerprint unavailable after merge".to_string())?;
        Ok((Some(merged), fingerprint))
    })
    .await
    .map_err(|error| {
        ApiError(
            StatusCode::INTERNAL_SERVER_ERROR,
            "sync_join_failed",
            error.to_string(),
        )
    })?
    .map_err(|message: String| {
        ApiError(
            StatusCode::UNPROCESSABLE_ENTITY,
            "sync_merge_failed",
            message,
        )
    })?;
    let merged_something = snapshot.is_some();

    state.sync.mark_seen(&device_id);
    if merged_something {
        state.sync.take_data_dirty();
        // Graph analysis is driven by this event in the webview; only emit it
        // when a merge actually changed desktop data.
        let _ = state.app.emit(
            "glimpse://sync-complete",
            serde_json::json!({ "deviceId": device_id }),
        );
    }

    let endpoints = endpoints_via_blocking_pool(&state).await;
    Ok(Json(SyncResponse {
        protocol_version: SYNC_PROTOCOL_VERSION,
        snapshot,
        fingerprint,
        endpoints,
    }))
}

/// `public_endpoints()` shells out to the tailscale CLI; never run that on
/// the async runtime — park it on the blocking pool instead.
async fn endpoints_via_blocking_pool(state: &ServerState) -> PublicEndpoints {
    let sync = state.sync.clone();
    tauri::async_runtime::spawn_blocking(move || sync.public_endpoints())
        .await
        .unwrap_or_else(|error| {
            eprintln!("sync endpoint inspection failed: {error}");
            PublicEndpoints {
                local_port: state.sync.port(),
                tailscale_url: None,
            }
        })
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

/// Should the incoming snapshot be discarded without merging?
///
/// Only when the payload declares a supported envelope AND hashing its actual
/// content yields the same fingerprint as our cached dataset fingerprint. An
/// unsupported or unhashable payload cannot be meaningfully compared, so we
/// fail open and let the merge (which validates strictly) decide. The
/// `fingerprint` the client sends is deliberately ignored (deprecated wire
/// field): it echoes a past desktop fingerprint rather than describing the
/// snapshot payload, and trusting it silently dropped every client-side change
/// until the desktop changed on its own.
#[cfg(test)]
fn should_skip_merge(our_fingerprint: &str, remote_snapshot: &glimpse_core::DataExport) -> bool {
    remote_snapshot.format_version != 0
        && remote_snapshot.format_version <= glimpse_core::DataExport::FORMAT_VERSION
        && glimpse_core::SqliteStorage::fingerprint_of_snapshot(remote_snapshot)
            .ok()
            .is_some_and(|remote_fingerprint| remote_fingerprint == our_fingerprint)
}

#[cfg(test)]
mod tests {
    use std::sync::Arc;

    use glimpse_core::{DataExport, KnowledgeItem, KnowledgeItemType, SqliteStorage};

    use super::{is_allowed_host, should_skip_merge};

    const PORT: u16 = 34_129;
    /// Empty advertisement set: only IPs, localhost, and `*.ts.net` apply.
    const NO_ADVERTISED_NAMES: &[String] = &[];
    fn advertised(names: &[&str]) -> Vec<String> {
        names.iter().map(|name| name.to_string()).collect()
    }

    #[test]
    fn local_and_private_hosts_are_allowed() {
        for host in [
            "localhost",
            "localhost:34129",
            "127.0.0.1",
            "127.0.0.1:34129",
            "192.168.1.4:34129",
            "10.0.0.2:34129",
            "172.16.0.9:34129",
            "[::1]:34129",
            "[fe80::1]:34129",
        ] {
            assert!(is_allowed_host(host, PORT, NO_ADVERTISED_NAMES), "should allow {host}");
        }
    }

    #[test]
    fn foreign_and_rebound_hosts_are_rejected() {
        for host in [
            "attacker.example.com",
            "attacker.example.com:80",
            // The DNS-rebinding payload itself: an arbitrary domain dressed up
            // with our sync port used to pass the old port-only check.
            "evil.com:34129",
            "attacker.example.com:34129",
            "8.8.8.8:34129",
            // Decimal-integer and octal spellings of a loopback/remote address
            // parse as public IPs; they must not slip through as "hostnames".
            "2130706433:34129",
            "0177.0.0.1:34129",
            "glimpse.evil.ts.net:443",
            // A different service's port is not ours even for real names.
            "desktop.example.ts.net:443",
        ] {
            assert!(!is_allowed_host(host, PORT, NO_ADVERTISED_NAMES), "should reject {host}");
        }
    }

    #[test]
    fn proxied_tailnet_hosts_using_the_sync_port_are_allowed() {
        // Tailscale Serve rewrites Host to the backend form for our port.
        assert!(is_allowed_host(
            "desktop.example.ts.net:34129",
            PORT,
            NO_ADVERTISED_NAMES
        ));
        assert!(is_allowed_host(
            "Machine-Name.Tail-scope.ts.net:34129",
            PORT,
            NO_ADVERTISED_NAMES
        ));
    }

    #[test]
    fn advertised_mdns_names_on_the_sync_port_are_allowed() {
        let names = advertised(&["glimpse-a1b2c3d4.local", "Glimpse Desktop e5f6"]);
        assert!(is_allowed_host("glimpse-a1b2c3d4.local:34129", PORT, &names));
        // Case-insensitive match, with or without a trailing FDNS dot.
        assert!(is_allowed_host("glimpse desktop e5f6:34129", PORT, &names));
        assert!(is_allowed_host(
            "GLIMPSE-A1B2C3D4.LOCAL.:34129",
            PORT,
            &names
        ));
        // Suffix resemblance is not a match.
        assert!(!is_allowed_host(
            "fake-glimpse-a1b2c3d4.local:34129",
            PORT,
            &names
        ));
        assert!(!is_allowed_host("glimpse-a1b2c3d4.local:443", PORT, &names));
    }

    #[test]
    fn ts_net_lookalikes_outside_the_real_suffix_are_rejected() {
        // Only the authoritative `.ts.net` suffix counts — not a lookalike
        // TLD ending in a similarly spelled label.
        assert!(!is_allowed_host(
            "desktop.example.ts.net.evil.com:34129",
            PORT,
            NO_ADVERTISED_NAMES
        ));
        assert!(!is_allowed_host(
            "desktop.example.bats.net:34129",
            PORT,
            NO_ADVERTISED_NAMES
        ));
    }

    #[test]
    fn arc_names_compile_and_match() {
        // The middleware passes the advertised set as an Arc; make sure the
        // slice-based helper accepts that shape.
        let arc: Arc<Vec<String>> = Arc::new(advertised(&["glimpse-test.local"]));
        assert!(is_allowed_host("glimpse-test.local:34129", PORT, &arc));
    }

    // --- Fingerprint skip decision (see `should_skip_merge`) -----------------

    fn note(id: &str, title: &str, updated_at: i64) -> KnowledgeItem {
        KnowledgeItem {
            id: id.into(),
            item_type: KnowledgeItemType::Note,
            title: Some(title.into()),
            body: None,
            url: None,
            summary: None,
            tags: None,
            labels: None,
            provisional_labels: None,
            label_status: None,
            label_source: None,
            label_version: None,
            label_score: None,
            label_requested_at: None,
            label_completed_at: None,
            label_error: None,
            created_at: 1_000,
            updated_at,
            stability: None,
            difficulty: None,
            last_reviewed_at: None,
            next_review_at: None,
        }
    }

    fn empty_export() -> DataExport {
        DataExport {
            format_version: DataExport::FORMAT_VERSION,
            exported_at: 0,
            knowledge_items: vec![],
            conversations: vec![],
            messages: vec![],
            recommendations: vec![],
            feedback_events: vec![],
            tombstones: vec![],
        }
    }

    /// Reimplements the server-side merge flow around a standalone core so
    /// the skip decision is exercised end to end: fingerprint our storage →
    /// decide via `should_skip_merge` → merge or keep the existing data.
    fn run_server_flow(our_storage: &SqliteStorage, incoming: DataExport) -> Option<DataExport> {
        let our_fingerprint = our_storage.snapshot_fingerprint().expect("our fingerprint");
        if should_skip_merge(&our_fingerprint, &incoming) {
            return None;
        }
        Some(our_storage.merge_data(&incoming).expect("merge"))
    }

    #[test]
    fn mobile_change_is_merged_even_when_client_echoes_a_stale_desktop_fingerprint() {
        // The P0 regression: after a completed sync the client holds no new
        // desktop fingerprint — yet it edited its own content. The old logic
        // compared the *echoed* fingerprint and dropped this snapshot.
        let desktop = SqliteStorage::in_memory().expect("desktop storage");
        let mut shared = empty_export();
        shared.knowledge_items.push(note("a", "shared", 100));
        desktop.replace_all_data(&shared).expect("seed desktop");

        let mut client_snapshot = desktop.export_data().expect("client copy");
        client_snapshot.knowledge_items.push(note("b", "mobile-only", 200));

        assert!(
            run_server_flow(&desktop, client_snapshot).is_some(),
            "a changed snapshot must be merged regardless of any echoed fingerprint"
        );
        let titles = desktop
            .export_data()
            .expect("export")
            .knowledge_items
            .iter()
            .filter_map(|item| item.title.clone())
            .collect::<Vec<_>>();
        assert!(
            titles.contains(&"mobile-only".into()),
            "mobile change must survive on the desktop, got {titles:?}"
        );
    }

    #[test]
    fn identical_content_snapshot_is_skipped() {
        let desktop = SqliteStorage::in_memory().expect("desktop storage");
        let mut shared = empty_export();
        shared.knowledge_items.push(note("a", "shared", 100));
        desktop.replace_all_data(&shared).expect("seed desktop");

        // Same content exported again: volatile envelope differs, content does not.
        let mut echo = desktop.export_data().expect("export");
        echo.exported_at += 999;

        assert!(
            run_server_flow(&desktop, echo).is_none(),
            "an unchanged re-send must still skip the merge"
        );
    }

    #[test]
    fn corrupt_snapshot_fails_open_into_a_merge_attempt() {
        let desktop = SqliteStorage::in_memory().expect("desktop storage");
        let mut shared = empty_export();
        shared.knowledge_items.push(note("a", "shared", 100));
        desktop.replace_all_data(&shared).expect("seed desktop");
        let our_fingerprint = desktop.snapshot_fingerprint().expect("fingerprint");

        let mut broken = desktop.export_data().expect("export");
        broken.format_version = DataExport::FORMAT_VERSION + 10;
        assert!(
            !should_skip_merge(&our_fingerprint, &broken),
            "an unhashable/unverifiable snapshot must fall open into a merge"
        );
    }
}
