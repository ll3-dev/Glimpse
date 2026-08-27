mod config;
mod server;
mod tailscale;

use std::net::{Ipv4Addr, SocketAddrV4, TcpListener as StdTcpListener};

use config::{DesktopSyncState, DesktopSyncStateInner, PairedClientStatus};
use mdns_sd::{ServiceDaemon, ServiceInfo};
use serde::Serialize;
use tailscale::TailscaleStatus;

pub const SYNC_PROTOCOL_VERSION: u32 = 1;
pub const SYNC_PORT: u16 = 34_129;
const SERVICE_TYPE: &str = "_glimpse-sync._tcp.local.";

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncStatus {
    pub protocol_version: u32,
    pub device_id: String,
    pub device_name: String,
    pub port: u16,
    pub pairing_code: String,
    pub pairing_code_expires_in_seconds: i64,
    pub paired_clients: Vec<PairedClientStatus>,
    pub tailscale: TailscaleStatus,
    pub startup_error: Option<String>,
}

pub fn initialize(app: tauri::AppHandle, app_data_dir: &std::path::Path) -> DesktopSyncState {
    let state = DesktopSyncStateInner::load(app_data_dir);
    match bind_listener() {
        Ok(listener) => {
            let port = listener
                .local_addr()
                .map(|address| address.port())
                .unwrap_or(SYNC_PORT);
            state.set_port(port);
            if let Err(error) = advertise_mdns(&state) {
                state.set_startup_error(format!("mDNS advertisement failed: {error}"));
            }
            let server_state = server::ServerState {
                sync: state.clone(),
                app,
            };
            tauri::async_runtime::spawn(async move {
                let listener = match tokio::net::TcpListener::from_std(listener) {
                    Ok(listener) => listener,
                    Err(error) => {
                        server_state
                            .sync
                            .set_startup_error(format!("sync listener failed: {error}"));
                        return;
                    }
                };
                if let Err(error) = axum::serve(
                    listener,
                    server::router(server_state.clone())
                        .into_make_service_with_connect_info::<std::net::SocketAddr>(),
                )
                .await
                {
                    server_state
                        .sync
                        .set_startup_error(format!("sync server stopped: {error}"));
                }
            });
        }
        Err(error) => state.set_startup_error(format!("sync port bind failed: {error}")),
    }
    state
}

#[tauri::command]
pub fn get_sync_status(state: tauri::State<'_, DesktopSyncState>) -> SyncStatus {
    status(&state)
}

#[tauri::command]
pub fn rotate_pairing_code(state: tauri::State<'_, DesktopSyncState>) -> SyncStatus {
    state.rotate_pairing_code();
    status(&state)
}

#[tauri::command]
pub async fn enable_tailscale_sync(
    state: tauri::State<'_, DesktopSyncState>,
) -> Result<SyncStatus, String> {
    let port = state.port();
    tauri::async_runtime::spawn_blocking(move || tailscale::enable_tailscale_serve(port))
        .await
        .map_err(|error| error.to_string())??;
    // Serve config just changed — the per-poll endpoint cache must not keep
    // serving the previous answer.
    state.invalidate_cached_endpoints();
    Ok(status(&state))
}

#[tauri::command]
pub fn forget_paired_client(
    device_id: String,
    state: tauri::State<'_, DesktopSyncState>,
) -> Result<SyncStatus, String> {
    state.forget_client(&device_id)?;
    Ok(status(&state))
}

fn status(state: &DesktopSyncState) -> SyncStatus {
    let (pairing_code, pairing_code_expires_in_seconds) = state.current_pairing_code();
    SyncStatus {
        protocol_version: config::protocol_version(),
        device_id: state.device_id.clone(),
        device_name: state.device_name.clone(),
        port: state.port(),
        pairing_code,
        pairing_code_expires_in_seconds,
        paired_clients: state.paired_clients().into_iter().map(Into::into).collect(),
        tailscale: tailscale::inspect_tailscale(state.port()),
        startup_error: state.startup_error(),
    }
}

fn bind_listener() -> std::io::Result<StdTcpListener> {
    let primary = SocketAddrV4::new(Ipv4Addr::UNSPECIFIED, SYNC_PORT);
    let listener = StdTcpListener::bind(primary)?;
    listener.set_nonblocking(true)?;
    Ok(listener)
}

fn advertise_mdns(state: &DesktopSyncState) -> Result<(), String> {
    let daemon = ServiceDaemon::new().map_err(|error| error.to_string())?;
    let hostname = format!(
        "glimpse-{}.local.",
        state.device_id.chars().take(8).collect::<String>()
    );
    let properties = [
        ("protocol", SYNC_PROTOCOL_VERSION.to_string()),
        ("deviceId", state.device_id.clone()),
        ("path", "/v1".to_string()),
    ];
    let service = ServiceInfo::new(
        SERVICE_TYPE,
        &state.device_name,
        &hostname,
        "",
        state.port(),
        properties.as_slice(),
    )
    .map_err(|error| error.to_string())?
    .enable_addr_auto();
    daemon
        .register(service)
        .map_err(|error| error.to_string())?;
    state.set_mdns_daemon(daemon);
    Ok(())
}
