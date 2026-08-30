//! Discovery backend — desktop `mdns-sd` implementation plus the platform
//! dispatch table. iOS (dnssd) and Android (JNI→NsdManager) live in their own
//! cfg-gated modules; this module always hosts the shared input/output types,
//! helpers, and the `sync_discover` command registration.

use rustra::prelude::*;

/// One discoverable desktop sync server (mDNS SRV + TXT resolved).
#[derive(Debug, Clone, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct DiscoveredPeer {
    /// Instance name — the desktop's user-facing device name.
    pub name: String,
    /// mDNS hostname with trailing dot (e.g. `glimpse-ab12cd34.local.`).
    pub host: String,
    pub port: u16,
    /// Resolved IPv4/IPv6 addresses observed during browse.
    pub addresses: Vec<String>,
    /// TXT `deviceId` — stable identity for dedupe/pairing.
    pub device_id: String,
    /// TXT `protocol` — sync wire protocol version.
    pub protocol_version: i64,
}

#[derive(Debug, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct SyncDiscoverInput {
    /// How long to browse before returning (clamped to [100, 5000] ms).
    pub timeout_ms: u64,
}

#[derive(Debug, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct SyncDiscoverOutput {
    pub peers: Vec<DiscoveredPeer>,
}

/// Deterministic ordering for the result list (name, then host).
pub fn compare_peers(left: &DiscoveredPeer, right: &DiscoveredPeer) -> std::cmp::Ordering {
    left.name
        .cmp(&right.name)
        .then_with(|| left.host.cmp(&right.host))
}

/// Collapse multi-address re-observations of the same desktop. First
/// occurrence wins — callers see the richest record first after sorting.
pub fn dedupe_by_device_id(peers: Vec<DiscoveredPeer>) -> Vec<DiscoveredPeer> {
    let mut seen = std::collections::HashSet::new();
    peers
        .into_iter()
        .filter(|peer| seen.insert(peer.device_id.clone()))
        .collect()
}

#[cfg(not(any(target_os = "ios", target_os = "android")))]
const SERVICE_TYPE: &str = "_glimpse-sync._tcp.local.";

#[command]
pub fn sync_discover(input: SyncDiscoverInput) -> Result<SyncDiscoverOutput> {
    let timeout_ms = input.timeout_ms.clamp(100, 5_000);
    #[cfg(target_os = "ios")]
    let peers = super::dnssd::discover(timeout_ms);
    #[cfg(target_os = "android")]
    let peers = super::jni::discover(timeout_ms);
    #[cfg(not(any(target_os = "ios", target_os = "android")))]
    let peers = mdns_sd::ServiceDaemon::new()
        .map_err(|error| rustra::RustraError::internal(error.to_string()))
        .and_then(|daemon| browse(daemon, timeout_ms))?;
    let mut peers = dedupe_by_device_id(peers);
    peers.sort_by(compare_peers);
    Ok(SyncDiscoverOutput { peers })
}

/// Blocking browse+resolve via `mdns-sd`, bounded by the recv deadline so a
/// silent network cannot hang the (synchronous) bridge command.
#[cfg(not(any(target_os = "ios", target_os = "android")))]
fn browse(
    daemon: mdns_sd::ServiceDaemon,
    timeout_ms: u64,
) -> std::result::Result<Vec<DiscoveredPeer>, rustra::RustraError> {
    let receiver = daemon
        .browse(SERVICE_TYPE)
        .map_err(|error| rustra::RustraError::internal(error.to_string()))?;
    let deadline = std::time::Instant::now() + std::time::Duration::from_millis(timeout_ms);
    let mut peers = Vec::new();
    loop {
        let now = std::time::Instant::now();
        if now >= deadline {
            break;
        }
        match receiver.recv_timeout(deadline - now) {
            Ok(mdns_sd::ServiceEvent::ServiceResolved(info)) => {
                peers.push(peer_from_service(&info));
            }
            Ok(_) => continue,
            Err(_) => break, // timeout or channel closed
        }
    }
    let _ = daemon.stop_browse(SERVICE_TYPE);
    let _ = daemon.shutdown();
    Ok(peers)
}

#[cfg(not(any(target_os = "ios", target_os = "android")))]
fn peer_from_service(info: &mdns_sd::ResolvedService) -> DiscoveredPeer {
    let properties = info.get_properties();
    DiscoveredPeer {
        name: info
            .get_fullname()
            .trim_end_matches(SERVICE_TYPE)
            .trim_end_matches('.')
            .to_string(),
        host: info.get_hostname().to_string(),
        port: info.get_port(),
        addresses: info.get_addresses().iter().map(|addr| addr.to_string()).collect(),
        device_id: properties
            .get_property_val_str("deviceId")
            .unwrap_or("")
            .to_string(),
        protocol_version: properties
            .get_property_val_str("protocol")
            .and_then(|value| value.parse::<i64>().ok())
            .unwrap_or(0),
    }
}

/// Registers this domain's command onto an existing package builder.
///
/// Same pattern as the other domains — must live here because `#[command]`'s
/// generated metadata consts are module-private.
pub(crate) fn register_commands(builder: rustra::PackageBuilder) -> rustra::PackageBuilder {
    rustra::register!(builder, sync_discover)
}
