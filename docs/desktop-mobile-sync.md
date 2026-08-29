# Desktop-Mobile Sync

Glimpse keeps mobile and desktop data in separate local SQLite databases and exchanges versioned snapshots through the desktop sync server.

## Connection flow

1. Start Glimpse Desktop and open **Settings**.
2. On the same LAN, Mobile **Settings > Desktop 동기화** discovers Desktop through `_glimpse-sync._tcp` mDNS/Bonjour.
3. Enter the six-digit code shown by Desktop. The code expires after ten minutes and rotates after a successful pairing.
4. Mobile stores the returned bearer token in SecureStore. Desktop stores only its SHA-256 hash.
5. For remote sync, sign in to Tailscale on both devices and click **연결 활성화** once in Desktop settings. Glimpse adds an HTTPS Tailscale Serve handler without replacing a pre-existing handler on port 443.

mDNS is LAN-only. Remote reconnection uses the paired desktop's Tailscale MagicDNS/Serve URL instead of trying to relay multicast discovery over the tailnet.

## Manual verification (simulator)

The pairing and sync loop can be exercised end-to-end without a physical device. These steps were used to verify the flow on the iOS simulator (2026-08):

1. Run Glimpse Desktop (`bun run desktop:dev`) and confirm the sync server is healthy: `curl localhost:34129/v1/health` returns `pairingRequired: true`.
2. Boot the app against Metro (`bun run ios`), open **Settings**, scroll to **DESKTOP 동기화**, and tap **같은 네트워크에서 찾기**. The desktop appears as a selectable entry (`Glimpse Desktop xxxxxx`) and selecting it fills the address field.
3. Enter the six-digit code displayed in Desktop settings and tap **페어링하고 동기화**. The section switches to the paired state showing the desktop name and **마지막 동기화**.
4. Verify pairing on the desktop: `curl localhost:34129/v1/health` now returns `pairingRequired: false`, and `sync-config.json` in the desktop app-data directory gains a `pairedClients` entry.
5. Tap **지금 동기화** (or relaunch the app) and confirm **마지막 동기화** updates; the desktop's `pairedClients[].lastSeenAt` should advance at the same time.

Simulator notes:

- The simulator shares the host network, so the desktop is reachable both via the host's LAN IP (from mDNS) and via `127.0.0.1`. If the host's application firewall blocks non-loopback interfaces, the client automatically falls back from the discovered LAN URL to the loopback URL.
- The six-digit code rotates after every successful pairing and expires after ten minutes — use the code currently displayed by Desktop.

## Automatic sync

- Sync is bidirectional and incremental in both directions. Mobile changes (captures, chats, review actions) ship to the desktop as an upstream delta attached to each watermark poll and merge within one round-trip; desktop changes flow down via the watermark delta. The client's upstream cursor (`lastAckedUpstreamClock`) advances only after the server confirms the merge (`upstreamAck`), so a failed transfer re-sends the same rows — LWW merging makes retries idempotent.
- Mobile syncs on launch, app resume, once per minute while active (backing off to once per 5 minutes when both sides are idle), immediately after local changes (debounced 2 seconds), and at operating-system background opportunities.
- An upstream delta larger than 10 MB is not attached to polls; it falls back to the periodic full-snapshot upload instead.
- Every 30 minutes a watermarked client deliberately uploads a full snapshot anyway — the reconciliation that reseals clock-skew gaps beyond the 24h delta guardband and repairs any drift.
- Before every merge (full snapshot or upstream delta) the desktop copies its database to `backups/pre-sync/` (rolling, 5 kept, WAL/SHM included) as a file-level restore point. Backup failure never blocks the sync.
- iOS decides when background work runs. Android's minimum background interval is 15 minutes; neither platform guarantees an exact execution time.
- Desktop must be running for its local sync server and graph worker to receive work. Tailscale Serve remains configured, but cannot proxy while the desktop app is stopped.
- A completed sync emits `glimpse://sync-complete`; the desktop webview invalidates its queries and queues graph analysis. The event also fires when an upstream merge wrote rows.

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
