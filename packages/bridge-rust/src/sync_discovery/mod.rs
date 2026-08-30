//! Sync peer discovery — `sync_discover` command domain.
//!
//! Per-platform backends behind one command: desktop = `mdns-sd` (`backend`),
//! iOS = system dnssd C API (`dnssd`, entitlement-free Bonjour), Android =
//! Rust→JNI→NsdManager (`jni`). HTTP transport stays in JS.

pub mod backend;

#[cfg(target_os = "ios")]
pub mod dnssd;

#[cfg(target_os = "android")]
pub mod jni;

/// Service type without the `.local.` domain — dnssd's browse API takes the
/// short form while mdns-sd takes the fully-qualified one. (Android's
/// NsdManager also browses this literal; the Kotlin bridge keeps its own copy
/// since a Rust `const` cannot cross the JNI boundary.)
#[cfg(target_os = "ios")]
pub(crate) const SERVICE_TYPE_SHORT: &str = "_glimpse-sync._tcp";

// Host-compilable on purpose: the Kotlin adapter's JSON wire contract is
// unit-tested on every platform (see `jni_wire_tests`), so a key rename on
// either side cannot silently strand Android discovery.
#[cfg(any(target_os = "android", test))]
pub(crate) fn parse_adapter_results(json: &str) -> Vec<DiscoveredPeer> {
    let value = match serde_json::from_str::<serde_json::Value>(json) {
        Ok(value) => value,
        Err(_) => return Vec::new(),
    };
    let Some(items) = value.as_array() else {
        return Vec::new();
    };
    items
        .iter()
        .filter_map(|item| {
            let name = item.get("name")?.as_str()?.to_string();
            let host = item.get("host")?.as_str()?.to_string();
            let port = item.get("port")?.as_u64()? as u16;
            Some(DiscoveredPeer {
                name,
                host,
                port,
                addresses: Vec::new(),
                device_id: item
                    .get("deviceId")
                    .and_then(|value| value.as_str())
                    .unwrap_or("")
                    .to_string(),
                protocol_version: item
                    .get("protocolVersion")
                    .and_then(|value| value.as_i64())
                    .unwrap_or(0),
            })
        })
        .collect()
}

#[cfg(test)]
mod jni_wire_tests {
    /// The Kotlin adapter emits `org.json` objects with these exact keys;
    /// `deviceId` is nullable (same contract as the JS native module).
    #[test]
    fn parses_adapter_json_into_peers() {
        let peers = super::parse_adapter_results(
            r#"[{"name":"Desktop","host":"glimpse-ab12cd34.local","port":34129,
                 "deviceId":"dev-1","protocolVersion":1},
                {"name":"Desktop2","host":"glimpse-ef901234.local","port":34129,
                 "deviceId":null,"protocolVersion":1}]"#,
        );
        assert_eq!(peers.len(), 2);
        assert_eq!(peers[0].device_id, "dev-1");
        assert_eq!(peers[0].host, "glimpse-ab12cd34.local");
        assert_eq!(peers[0].port, 34129);
        // Null deviceId mirrors the Kotlin module's key fallback contract —
        // dedupe falls back to host:port at the call site, so it arrives "".
        assert_eq!(peers[1].device_id, "");
    }

    #[test]
    fn empty_and_garbage_payloads_yield_no_peers() {
        assert!(super::parse_adapter_results("").is_empty());
        assert!(super::parse_adapter_results("[]").is_empty());
        assert!(super::parse_adapter_results("not json").is_empty());
        // A top-level value that is not an array must not panic.
        assert!(super::parse_adapter_results(r#"{"name":"x"}"#).is_empty());
    }
}

pub use backend::{
    compare_peers, dedupe_by_device_id, DiscoveredPeer, SyncDiscoverInput, SyncDiscoverOutput,
};

#[cfg(test)]
mod tests {
    use super::*;

    /// The wire shape the TS generated client receives — camelCase is part
    /// of the bridge contract, verified here so a serde rename regression
    /// cannot silently break codegen consumers.
    #[test]
    fn discovered_peer_serializes_camel_case() {
        let peer = DiscoveredPeer {
            name: "Desktop".into(),
            host: "glimpse-ab12cd34.local.".into(),
            port: 34129,
            addresses: vec!["192.168.1.4".into()],
            device_id: "dev-1".into(),
            protocol_version: 1,
        };
        let json = serde_json::to_value(&peer).unwrap();
        assert_eq!(json["name"], "Desktop");
        assert_eq!(json["host"], "glimpse-ab12cd34.local.");
        assert_eq!(json["port"], 34129);
        assert_eq!(json["addresses"][0], "192.168.1.4");
        assert_eq!(json["deviceId"], "dev-1");
        assert_eq!(json["protocolVersion"], 1);
    }

    #[test]
    fn peer_sort_is_deterministic_by_name_then_host() {
        let mut peers = [
            DiscoveredPeer {
                name: "b".into(),
                host: "h2".into(),
                port: 1,
                addresses: vec![],
                device_id: "d2".into(),
                protocol_version: 1,
            },
            DiscoveredPeer {
                name: "a".into(),
                host: "h1".into(),
                port: 2,
                addresses: vec![],
                device_id: "d1".into(),
                protocol_version: 1,
            },
        ];
        peers.sort_by(compare_peers);
        assert_eq!(peers[0].name, "a");
        assert_eq!(peers[1].name, "b");
    }

    #[test]
    fn dedupe_keeps_first_occurrence_by_device_id() {
        let peers = [
            DiscoveredPeer {
                name: "first".into(),
                host: "h1".into(),
                port: 1,
                addresses: vec![],
                device_id: "same".into(),
                protocol_version: 1,
            },
            DiscoveredPeer {
                name: "second".into(),
                host: "h2".into(),
                port: 2,
                addresses: vec![],
                device_id: "same".into(),
                protocol_version: 1,
            },
        ];
        let deduped = dedupe_by_device_id(peers.to_vec());
        assert_eq!(deduped.len(), 1);
        assert_eq!(deduped[0].name, "first");
    }
}
