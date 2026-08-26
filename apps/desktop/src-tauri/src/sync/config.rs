use std::collections::{HashMap, VecDeque};
use std::fs;
use std::net::IpAddr;
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use std::time::{Duration, Instant};

use mdns_sd::ServiceDaemon;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use uuid::Uuid;

use super::tailscale::inspect_tailscale;
use super::{SYNC_PORT, SYNC_PROTOCOL_VERSION};

const PAIRING_CODE_TTL: Duration = Duration::from_secs(10 * 60);
const MAX_PAIR_ATTEMPTS_PER_MINUTE: usize = 5;

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PairedClient {
    pub device_id: String,
    pub device_name: String,
    pub token_hash: String,
    pub paired_at: i64,
    pub last_seen_at: Option<i64>,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PairedClientStatus {
    pub device_id: String,
    pub device_name: String,
    pub paired_at: i64,
    pub last_seen_at: Option<i64>,
}

impl From<PairedClient> for PairedClientStatus {
    fn from(client: PairedClient) -> Self {
        Self {
            device_id: client.device_id,
            device_name: client.device_name,
            paired_at: client.paired_at,
            last_seen_at: client.last_seen_at,
        }
    }
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct PersistedSyncConfig {
    device_id: String,
    paired_clients: Vec<PairedClient>,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PublicEndpoints {
    pub local_port: u16,
    pub tailscale_url: Option<String>,
}

struct PairingCode {
    value: String,
    expires_at: Instant,
}

pub struct DesktopSyncStateInner {
    pub device_id: String,
    pub device_name: String,
    config_path: PathBuf,
    clients: Mutex<HashMap<String, PairedClient>>,
    pairing_code: Mutex<PairingCode>,
    pair_attempts: Mutex<HashMap<IpAddr, VecDeque<Instant>>>,
    port: Mutex<u16>,
    startup_error: Mutex<Option<String>>,
    mdns_daemon: Mutex<Option<ServiceDaemon>>,
}

pub type DesktopSyncState = std::sync::Arc<DesktopSyncStateInner>;

impl DesktopSyncStateInner {
    pub fn load(app_data_dir: &Path) -> DesktopSyncState {
        let config_path = app_data_dir.join("sync-config.json");
        let (persisted, startup_error) = match fs::read_to_string(&config_path) {
            Ok(raw) => match serde_json::from_str::<PersistedSyncConfig>(&raw) {
                Ok(config) => (Some(config), None),
                Err(error) => (
                    None,
                    Some(format!("sync config could not be parsed: {error}")),
                ),
            },
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => (None, None),
            Err(error) => (
                None,
                Some(format!("sync config could not be read: {error}")),
            ),
        };
        let device_id = persisted
            .as_ref()
            .map(|config| config.device_id.clone())
            .filter(|id| !id.is_empty())
            .unwrap_or_else(|| Uuid::new_v4().to_string());
        let clients = persisted
            .map(|config| {
                config
                    .paired_clients
                    .into_iter()
                    .map(|client| (client.device_id.clone(), client))
                    .collect()
            })
            .unwrap_or_default();
        let suffix = device_id.chars().take(6).collect::<String>();

        std::sync::Arc::new(Self {
            device_id,
            device_name: format!("Glimpse Desktop {suffix}"),
            config_path,
            clients: Mutex::new(clients),
            pairing_code: Mutex::new(new_pairing_code()),
            pair_attempts: Mutex::new(HashMap::new()),
            port: Mutex::new(SYNC_PORT),
            startup_error: Mutex::new(startup_error),
            mdns_daemon: Mutex::new(None),
        })
    }

    pub fn set_port(&self, port: u16) {
        if let Ok(mut current) = self.port.lock() {
            *current = port;
        }
    }

    pub fn port(&self) -> u16 {
        self.port.lock().map(|port| *port).unwrap_or(SYNC_PORT)
    }

    pub fn set_startup_error(&self, error: impl Into<String>) {
        if let Ok(mut current) = self.startup_error.lock() {
            *current = Some(error.into());
        }
    }

    pub fn startup_error(&self) -> Option<String> {
        self.startup_error
            .lock()
            .ok()
            .and_then(|error| error.clone())
    }

    pub fn set_mdns_daemon(&self, daemon: ServiceDaemon) {
        if let Ok(mut current) = self.mdns_daemon.lock() {
            *current = Some(daemon);
        }
    }

    pub fn current_pairing_code(&self) -> (String, i64) {
        let mut code = self
            .pairing_code
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner());
        if Instant::now() >= code.expires_at {
            *code = new_pairing_code();
        }
        let seconds = code
            .expires_at
            .saturating_duration_since(Instant::now())
            .as_secs() as i64;
        (code.value.clone(), seconds)
    }

    pub fn rotate_pairing_code(&self) -> (String, i64) {
        if let Ok(mut code) = self.pairing_code.lock() {
            *code = new_pairing_code();
        }
        self.current_pairing_code()
    }

    pub fn validate_pairing_code(&self, code: &str, remote_ip: IpAddr) -> bool {
        if !self.allow_pair_attempt(remote_ip) {
            return false;
        }
        let (current, _) = self.current_pairing_code();
        constant_time_equal(current.as_bytes(), code.trim().as_bytes())
    }

    pub fn pair_client(&self, device_id: &str, device_name: &str) -> Result<String, String> {
        let token = format!("{}{}", Uuid::new_v4().simple(), Uuid::new_v4().simple());
        let client = PairedClient {
            device_id: device_id.to_string(),
            device_name: device_name.trim().chars().take(80).collect(),
            token_hash: hash_token(&token),
            paired_at: now_millis(),
            last_seen_at: None,
        };
        self.clients
            .lock()
            .map_err(|_| "paired client lock poisoned".to_string())?
            .insert(device_id.to_string(), client);
        self.persist()?;
        self.rotate_pairing_code();
        Ok(token)
    }

    pub fn authorize(&self, device_id: &str, token: &str) -> bool {
        let expected = self.clients.lock().ok().and_then(|clients| {
            clients
                .get(device_id)
                .map(|client| client.token_hash.clone())
        });
        expected.is_some_and(|expected| {
            constant_time_equal(expected.as_bytes(), hash_token(token).as_bytes())
        })
    }

    pub fn mark_seen(&self, device_id: &str) {
        if let Ok(mut clients) = self.clients.lock() {
            if let Some(client) = clients.get_mut(device_id) {
                client.last_seen_at = Some(now_millis());
            }
        }
        let _ = self.persist();
    }

    pub fn paired_clients(&self) -> Vec<PairedClient> {
        self.clients
            .lock()
            .map(|clients| clients.values().cloned().collect())
            .unwrap_or_default()
    }

    pub fn forget_client(&self, device_id: &str) -> Result<(), String> {
        self.clients
            .lock()
            .map_err(|_| "paired client lock poisoned".to_string())?
            .remove(device_id);
        self.persist()
    }

    pub fn public_endpoints(&self) -> PublicEndpoints {
        let tailscale = inspect_tailscale(self.port());
        PublicEndpoints {
            local_port: self.port(),
            tailscale_url: tailscale.url,
        }
    }

    fn allow_pair_attempt(&self, remote_ip: IpAddr) -> bool {
        let now = Instant::now();
        let Ok(mut attempts) = self.pair_attempts.lock() else {
            return false;
        };
        let entries = attempts.entry(remote_ip).or_default();
        while entries
            .front()
            .is_some_and(|attempt| now.duration_since(*attempt) >= Duration::from_secs(60))
        {
            entries.pop_front();
        }
        if entries.len() >= MAX_PAIR_ATTEMPTS_PER_MINUTE {
            return false;
        }
        entries.push_back(now);
        true
    }

    fn persist(&self) -> Result<(), String> {
        let config = PersistedSyncConfig {
            device_id: self.device_id.clone(),
            paired_clients: self.paired_clients(),
        };
        let bytes = serde_json::to_vec_pretty(&config).map_err(|error| error.to_string())?;
        let temporary_path = self.config_path.with_extension("json.tmp");
        fs::write(&temporary_path, bytes).map_err(|error| error.to_string())?;
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            fs::set_permissions(&temporary_path, fs::Permissions::from_mode(0o600))
                .map_err(|error| error.to_string())?;
        }
        fs::rename(&temporary_path, &self.config_path).map_err(|error| error.to_string())?;
        Ok(())
    }
}

fn new_pairing_code() -> PairingCode {
    let bytes = Uuid::new_v4().into_bytes();
    let number = u32::from_be_bytes([bytes[0], bytes[1], bytes[2], bytes[3]]) % 1_000_000;
    PairingCode {
        value: format!("{number:06}"),
        expires_at: Instant::now() + PAIRING_CODE_TTL,
    }
}

fn hash_token(token: &str) -> String {
    format!("{:x}", Sha256::digest(token.as_bytes()))
}

fn constant_time_equal(left: &[u8], right: &[u8]) -> bool {
    if left.len() != right.len() {
        return false;
    }
    left.iter()
        .zip(right)
        .fold(0_u8, |difference, (left, right)| {
            difference | (left ^ right)
        })
        == 0
}

fn now_millis() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|duration| duration.as_millis() as i64)
        .unwrap_or_default()
}

pub fn protocol_version() -> u32 {
    SYNC_PROTOCOL_VERSION
}

#[cfg(test)]
mod tests {
    use super::constant_time_equal;

    #[test]
    fn token_comparison_rejects_different_lengths_and_values() {
        assert!(constant_time_equal(b"same", b"same"));
        assert!(!constant_time_equal(b"same", b"diff"));
        assert!(!constant_time_equal(b"same", b"short"));
    }
}
