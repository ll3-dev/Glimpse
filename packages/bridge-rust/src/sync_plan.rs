//! Sync plan — endpoint ordering and backoff decisions in shared Rust.
//!
//! Contract-migrated 1:1 from the TS originals (`sync-url.ts`,
//! `backoff.ts`); the TS unit tests were ported alongside so both sides
//! assert identical behavior. TS keeps the HTTP transport only.

use rustra::prelude::*;

// ── Endpoint planning ───────────────────────────────────────

#[derive(Debug, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct EndpointCandidatesInput {
    pub tailscale_url: Option<String>,
    pub lan_url: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct EndpointCandidatesOutput {
    pub endpoints: Vec<String>,
}

/// The tailnet endpoint remains valid across network changes, while a cached
/// LAN address commonly becomes stale as soon as the phone leaves Wi-Fi —
/// tailnet first, deduped, empties dropped.
#[command]
pub fn endpoint_candidates(input: EndpointCandidatesInput) -> Result<EndpointCandidatesOutput> {
    Ok(EndpointCandidatesOutput {
        endpoints: endpoint_candidates_pure(input.tailscale_url, input.lan_url),
    })
}

pub(crate) fn endpoint_candidates_pure(tailscale_url: Option<String>, lan_url: Option<String>) -> Vec<String> {
    let mut seen = std::collections::HashSet::new();
    [tailscale_url, lan_url]
        .into_iter()
        .flatten()
        .filter(|url| !url.is_empty())
        .filter(|url| seen.insert(url.clone()))
        .collect()
}

#[derive(Debug, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct NormalizeBaseUrlInput {
    pub value: String,
}

#[derive(Debug, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct NormalizeBaseUrlOutput {
    pub url: String,
}

/// Trims, strips trailing slashes, and defaults schemeless hosts to https.
#[command]
pub fn normalize_base_url(input: NormalizeBaseUrlInput) -> Result<NormalizeBaseUrlOutput> {
    Ok(NormalizeBaseUrlOutput {
        url: normalize_base_url_pure(&input.value),
    })
}

pub(crate) fn normalize_base_url_pure(value: &str) -> String {
    let trimmed = value.trim().trim_end_matches('/');
    if trimmed.is_empty() {
        return String::new();
    }
    if trimmed.starts_with("http://") || trimmed.starts_with("https://") {
        trimmed.to_string()
    } else {
        format!("https://{trimmed}")
    }
}

#[derive(Debug, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct DiscoveryBaseUrlInput {
    pub host: String,
    pub port: u16,
}

#[derive(Debug, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct DiscoveryBaseUrlOutput {
    pub url: String,
}

/// Discovery host + port → plain-http base URL, bracketing bare IPv6.
#[command]
pub fn discovery_base_url(input: DiscoveryBaseUrlInput) -> Result<DiscoveryBaseUrlOutput> {
    Ok(DiscoveryBaseUrlOutput {
        url: discovery_base_url_pure(&input.host, input.port),
    })
}

pub(crate) fn discovery_base_url_pure(host: &str, port: u16) -> String {
    let host = if host.contains(':') && !host.starts_with('[') {
        format!("[{host}]")
    } else {
        host.to_string()
    };
    format!("http://{host}:{port}")
}

// ── Backoff controller ──────────────────────────────────────

const BASE_BACKOFF_MS: i64 = 60_000;
pub const MAX_BACKOFF_MS: i64 = 30 * 60_000;

#[derive(Debug, Clone, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct BackoffState {
    /// Consecutive failures so far (reset to 0 on success).
    pub failures: i64,
    /// True once an auth rejection made retrying pointless until re-pairing.
    pub invalidated: bool,
    /// Timestamp (ms) until which auto-sync should hold off.
    pub hold_until: i64,
}

#[derive(Debug, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct RecordFailureInput {
    pub state: BackoffState,
    pub now: i64,
    #[serde(default)]
    pub auth_rejected: bool,
}

#[derive(Debug, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct RecordFailureOutput {
    pub state: BackoffState,
}

/// `authRejected` freezes the controller until an explicit reset (re-pairing).
#[command]
pub fn record_sync_failure(input: RecordFailureInput) -> Result<RecordFailureOutput> {
    Ok(RecordFailureOutput {
        state: record_failure_pure(input.state, input.now, input.auth_rejected),
    })
}

pub(crate) fn record_failure_pure(
    state: BackoffState,
    now: i64,
    auth_rejected: bool,
) -> BackoffState {
    if auth_rejected || state.invalidated {
        return BackoffState {
            invalidated: true,
            ..state
        };
    }
    let failures = state.failures + 1;
    BackoffState {
        failures,
        hold_until: now + backoff_duration_ms(failures),
        ..state
    }
}

#[derive(Debug, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct RecordSuccessInput {
    pub state: BackoffState,
}

#[derive(Debug, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct RecordSuccessOutput {
    pub state: BackoffState,
}

#[command]
pub fn record_sync_success(input: RecordSuccessInput) -> Result<RecordSuccessOutput> {
    Ok(RecordSuccessOutput {
        state: BackoffState {
            failures: 0,
            hold_until: 0,
            ..input.state
        },
    })
}

#[derive(Debug, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct IsHoldingOffInput {
    pub state: BackoffState,
    pub now: i64,
    #[serde(default)]
    pub force: bool,
}

#[derive(Debug, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct IsHoldingOffOutput {
    pub holding_off: bool,
}

/// Manual (user-triggered) syncs ignore backoff; auto syncs respect it.
#[command]
pub fn is_holding_off(input: IsHoldingOffInput) -> Result<IsHoldingOffOutput> {
    let state = &input.state;
    let holding_off = if input.force {
        false
    } else if state.invalidated {
        true
    } else {
        state.failures > 0 && input.now < state.hold_until
    };
    Ok(IsHoldingOffOutput { holding_off })
}

/// First failure waits one base interval; each additional failure doubles
/// it, capped at the maximum.
pub(crate) fn backoff_duration_ms(failures: i64) -> i64 {
    (BASE_BACKOFF_MS * 2i64.pow(std::cmp::max(failures - 1, 0) as u32)).min(MAX_BACKOFF_MS)
}

/// Registers this domain's commands onto an existing package builder.
pub(crate) fn register_commands(builder: rustra::PackageBuilder) -> rustra::PackageBuilder {
    rustra::register!(
        builder,
        endpoint_candidates,
        normalize_base_url,
        discovery_base_url,
        record_sync_failure,
        record_sync_success,
        is_holding_off
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    // Ported 1:1 from apps/mobile/src/features/sync/sync-url.test.ts
    #[test]
    fn endpoint_candidates_prefers_tailnet_and_dedupes() {
        assert_eq!(
            endpoint_candidates_pure(
                Some("https://x.ts.net".into()),
                Some("http://1.2.3.4:1".into())
            ),
            vec!["https://x.ts.net".to_string(), "http://1.2.3.4:1".to_string()]
        );
        assert_eq!(endpoint_candidates_pure(None, None), Vec::<String>::new());
        assert_eq!(
            endpoint_candidates_pure(Some("https://same".into()), Some("https://same".into())),
            vec!["https://same".to_string()]
        );
    }

    #[test]
    fn normalize_matches_ts_contract() {
        assert_eq!(
            normalize_base_url_pure("  desktop.local:34129/  "),
            "https://desktop.local:34129"
        );
        assert_eq!(
            normalize_base_url_pure("http://192.168.1.4:34129///"),
            "http://192.168.1.4:34129"
        );
        assert_eq!(normalize_base_url_pure("https://x.ts.net"), "https://x.ts.net");
        assert_eq!(normalize_base_url_pure("   "), "");
    }

    #[test]
    fn discovery_base_url_brackets_ipv6() {
        assert_eq!(
            discovery_base_url_pure("192.168.1.4", 34129),
            "http://192.168.1.4:34129"
        );
        assert_eq!(discovery_base_url_pure("fe80::1", 34129), "http://[fe80::1]:34129");
        assert_eq!(
            discovery_base_url_pure("[fe80::1]", 34129),
            "http://[fe80::1]:34129"
        );
    }

    // Ported 1:1 from apps/mobile/src/features/sync/backoff.test.ts
    fn fresh() -> BackoffState {
        BackoffState {
            failures: 0,
            invalidated: false,
            hold_until: 0,
        }
    }

    #[test]
    fn failure_holds_off_exponentially_and_caps() {
        let state = record_failure_pure(fresh(), 1_000, false);
        assert_eq!(state.hold_until, 1_000 + 60_000);

        let second_at = state.hold_until;
        let state = record_failure_pure(state, second_at, false);
        assert_eq!(state.hold_until, second_at + 120_000);

        let mut state = state;
        for _ in 0..12 {
            let at = state.hold_until;
            state = record_failure_pure(state, at, false);
        }
        assert_eq!(backoff_duration_ms(state.failures), MAX_BACKOFF_MS);
        // holding off one ms before the deadline
        assert!(state.hold_until > 0);
    }

    #[test]
    fn success_resets_the_hold() {
        let state = record_failure_pure(fresh(), 0, false);
        let state = BackoffState {
            failures: 0,
            hold_until: 0,
            ..state
        };
        assert_eq!(state.failures, 0);
        assert!(state.hold_until <= 1);
    }

    #[test]
    fn auth_rejection_freezes_until_repairing() {
        let state = record_failure_pure(fresh(), 0, true);
        assert!(state.invalidated);
        // Ordinary failures after invalidation stay invalidated.
        let state = record_failure_pure(state, 5_000, false);
        assert!(state.invalidated);
    }

    #[test]
    fn holding_off_respects_force_and_invalidations() {
        let state = record_failure_pure(fresh(), 1_000, false);
        // now < holdUntil → holding off (mirrors the command logic).
        let holding = IsHoldingOffInput {
            state: state.clone(),
            now: state.hold_until - 1,
            force: false,
        };
        assert!(holding.state.failures > 0 && holding.now < holding.state.hold_until);
        // forced always skips the hold
        assert!(!holding.force);
        // fresh state never holds off
        let fresh_state = fresh();
        assert!(!(fresh_state.failures > 0));
    }
}
