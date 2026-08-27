# Desktop-Mobile Sync

Glimpse keeps mobile and desktop data in separate local SQLite databases and exchanges versioned snapshots through the desktop sync server.

## Connection flow

1. Start Glimpse Desktop and open **Settings**.
2. On the same LAN, Mobile **Settings > Desktop 동기화** discovers Desktop through `_glimpse-sync._tcp` mDNS/Bonjour.
3. Enter the six-digit code shown by Desktop. The code expires after ten minutes and rotates after a successful pairing.
4. Mobile stores the returned bearer token in SecureStore. Desktop stores only its SHA-256 hash.
5. For remote sync, sign in to Tailscale on both devices and click **연결 활성화** once in Desktop settings. Glimpse adds an HTTPS Tailscale Serve handler without replacing a pre-existing handler on port 443.

mDNS is LAN-only. Remote reconnection uses the paired desktop's Tailscale MagicDNS/Serve URL instead of trying to relay multicast discovery over the tailnet.

## Automatic sync

- Mobile syncs on launch, app resume, once per minute while active, and at operating-system background opportunities.
- iOS decides when background work runs. Android's minimum background interval is 15 minutes; neither platform guarantees an exact execution time.
- Desktop must be running for its local sync server and graph worker to receive work. Tailscale Serve remains configured, but cannot proxy while the desktop app is stopped.
- A completed sync emits `glimpse://sync-complete`; the desktop webview invalidates its queries and queues graph analysis.

## Merge rules

- Snapshots use format version 2.
- Records merge by their domain update clock. Equal-clock conflicts use a deterministic JSON ordering so both devices converge.
- Hard deletes create tombstones and older remote copies cannot resurrect deleted records.
- Recommendation edges are canonicalized by unordered item pair, and orphan edges/feedback are removed.

## Transport and access

- Every sync request requires a device-scoped 64-character random token. Pairing attempts are rate-limited per source IP.
- Tailnet sync runs through Tailscale Serve HTTPS.
- Direct LAN sync uses local HTTP so iOS Bonjour and Android NSD clients can connect without distributing a private certificate. Use it only on a trusted LAN; prefer the Tailscale endpoint when it is available.
- Existing Tailscale Serve HTTPS port 443 configuration is never overwritten automatically. Desktop reports the conflict for manual resolution.

## Knowledge graph

The desktop graph worker analyzes the most recent synced items. A configured Desktop Local LLM or BYOK provider proposes edges; if no model is available, shared tags provide a deterministic fallback. Edges are saved as normal recommendations, shown in **Graph**, and included in the next bidirectional sync.
