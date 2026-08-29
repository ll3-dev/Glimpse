//! Sync peer discovery — `sync_discover` command domain.
//!
//! Per-platform backends behind one command: desktop = `mdns-sd`
//! (`backend`), iOS = dnssd C API (cfg-gated, B2-3), Android = Rust→JNI
//! →NsdManager (cfg-gated, B2-4). HTTP transport stays in JS.

pub mod backend;

pub use backend::{
    compare_peers, dedupe_by_device_id, sync_discover, DiscoveredPeer, SyncDiscoverInput,
    SyncDiscoverOutput,
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
