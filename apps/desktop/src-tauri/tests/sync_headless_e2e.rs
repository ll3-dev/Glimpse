//! 헤드리스 양방향 동기화 E2E (GUI 불필요).
//!
//! 데스크톱 동기화 서버를 실제로 구동한다 — mock AppHandle + 임시 데이터
//! 디렉터리 + 실제 axum 라우터, 실제 HTTP 전송. 모바일 클라이언트 코드를
//! 대신해 wire 프로토콜(sync-client.ts와 동일한 JSON 계약)을 그대로 사용해
//! 아래 시나리오를 검증한다:
//!
//! 1. 헬스 → 페어링 필수
//! 2. 6자리 코드 페어링 → Bearer 토큰 수령
//! 3. 상행 델타 (upstreamDelta) → 병합 + upstreamAck (post-merge 시계)
//! 4. 커서 이후 행만 담은 재전송 → 멱등 (0행 재기록, ack 비후퇴)
//! 5. snapshot + upstreamDelta 동시 전송 → 422 sync_protocol_conflict
//! 6. 잘못된 토큰 → 401
//! 7. upstreamDelta 없는 요청(레거시) → upstreamAck 없이 정상 응답
//! 8. 하행: 데스크톱 행이 워터마크 폴링의 delta로 전달됨
//!
//! 시뮬레이터 GUI를 동반한 수동 E2E 절차는
//! docs/desktop-mobile-sync.md 의 "Manual verification" 참조.

use std::net::SocketAddr;

use axum::serve;
use glimpse_core::{DataExport, KnowledgeItem, KnowledgeItemType};
use glimpse_desktop::sync::config::DesktopSyncStateInner;
use glimpse_desktop::sync::server::{router, ServerState};
use tauri::test::{mock_context, noop_assets, MockRuntime};

const PORT: u16 = 0; // ephemeral

/// Spins up the real sync server against a fresh in-memory core and a temp
/// app-data directory, returning the bound base URL plus the current pairing
/// code. This mirrors `sync::initialize` minus mDNS advertisement and the
/// fixed port bind.
struct TestServer {
    base_url: String,
    state: glimpse_desktop::sync::config::DesktopSyncState,
    _app: tauri::App<MockRuntime>,
    _tmp_dir: tempfile::TempDir,
}

fn spawn_test_server() -> TestServer {
    let app = tauri::test::mock_builder()
        .build(mock_context(noop_assets()))
        .expect("mock app builds");

    let tmp_dir = tempfile::tempdir().expect("temp dir");
    let state = DesktopSyncStateInner::load(tmp_dir.path());

    let listener = std::net::TcpListener::bind(("127.0.0.1", PORT)).expect("bind ephemeral");
    let addr = listener.local_addr().expect("local addr");
    // tokio's from_std requires the fd to be non-blocking already (tokio#7172).
    listener.set_nonblocking(true).expect("set nonblocking");
    state.set_port(addr.port());

    let server_state = ServerState {
        sync: state.clone(),
        app: app.handle().clone(),
    };
    // Spawn on the test's own tokio runtime: tauri::async_runtime's global
    // runtime shuts down with the app and cannot be reached from #[tokio::test].
    tokio::spawn(async move {
        let listener = tokio::net::TcpListener::from_std(listener).expect("tokio listener");
        if let Err(error) = serve(
            listener,
            router(server_state).into_make_service_with_connect_info::<SocketAddr>(),
        )
        .await
        {
            eprintln!("test sync server stopped: {error}");
        }
    });

    TestServer {
        base_url: format!("http://{addr}"),
        state,
        _app: app,
        _tmp_dir: tmp_dir,
    }
}

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
    serde_json::from_str::<DataExport>(
        r#"{
            "formatVersion": 2,
            "exportedAt": 0,
            "knowledgeItems": [],
            "conversations": [],
            "messages": [],
            "recommendations": [],
            "feedbackEvents": [],
            "tombstones": []
        }"#,
    )
    .expect("empty export parses")
}

/// Installs a fresh in-memory store as the bridge's process-wide core so the
/// server handlers' `glimpse_bridge::core_state()` calls resolve. Desktop-side
/// assertions go through `glimpse_bridge::core_state()` afterwards.
fn install_bridge_core() {
    let core = glimpse_core::SharedCore::in_memory().expect("in-memory SharedCore");
    glimpse_bridge::init_core(core);
}

#[tokio::test]
async fn headless_pairing_and_bidirectional_flow() {
    // The bridge global owns one core per process: this test seeds it empty.
    install_bridge_core();

    let server = spawn_test_server();
    let client = reqwest::Client::new();

    // --- 1. health: pairing required ------------------------------------
    let health: serde_json::Value = client
        .get(format!("{}/v1/health", server.base_url))
        .send()
        .await
        .expect("health request")
        .json()
        .await
        .expect("health json");
    assert_eq!(health["pairingRequired"], true);
    assert_eq!(health["protocolVersion"], 1);

    // --- 2. pairing with the six-digit code ------------------------------
    let (code, _) = server.state.current_pairing_code();
    let pair: serde_json::Value = client
        .post(format!("{}/v1/pair", server.base_url))
        .json(&serde_json::json!({
            "deviceId": "mobile-e2e",
            "deviceName": "E2E Phone",
            "pairingCode": code,
        }))
        .send()
        .await
        .expect("pair request")
        .json()
        .await
        .expect("pair json");
    assert_eq!(pair["protocolVersion"], 1);
    let token = pair["token"].as_str().expect("token issued").to_string();
    assert_eq!(token.len(), 64, "device-scoped random token");

    // --- 3. upstream delta: mobile-only rows merge, ack covers them ------
    let mut upstream = empty_export();
    upstream
        .knowledge_items
        .push(note("mobile-capture", "captured on phone", 500_000_000));

    let sync_res: serde_json::Value = client
        .post(format!("{}/v1/sync", server.base_url))
        .header("Authorization", format!("Bearer {token}"))
        .json(&serde_json::json!({
            "deviceId": "mobile-e2e",
            "upstreamDelta": upstream,
            "sinceWatermark": 0,
        }))
        .send()
        .await
        .expect("sync request")
        .json()
        .await
        .expect("sync json");
    assert_eq!(
        sync_res["upstreamAck"], 500_000_000,
        "ack must cover the rows the merge just wrote"
    );
    assert!(
        sync_res["newWatermark"].as_i64().unwrap_or(0) >= 500_000_000,
        "watermark covers post-merge state"
    );
    let desktop_items = glimpse_bridge::core_state()
        .export_data_json()
        .expect("desktop export");
    let desktop_items: Vec<serde_json::Value> =
        serde_json::from_str::<serde_json::Value>(&desktop_items)
            .expect("export json")["knowledgeItems"]
            .as_array()
            .expect("items array")
            .clone();
    assert!(
        desktop_items
            .iter()
            .any(|item| item["id"] == "mobile-capture"),
        "upstream row must land in desktop storage, got {desktop_items:?}"
    );

    // --- 4. idempotent retransmission (cursor frozen on failure path) ----
    let sync_res: serde_json::Value = client
        .post(format!("{}/v1/sync", server.base_url))
        .header("Authorization", format!("Bearer {token}"))
        .json(&serde_json::json!({
            "deviceId": "mobile-e2e",
            "upstreamDelta": upstream,
            "sinceWatermark": 0,
        }))
        .send()
        .await
        .expect("retransmission")
        .json()
        .await
        .expect("retransmission json");
    assert_eq!(
        sync_res["upstreamAck"], 500_000_000,
        "an idempotent retransmission must not move the ack backwards"
    );
    assert_eq!(
        glimpse_bridge::core_state()
            .export_data_json()
            .map(|json| serde_json::from_str::<serde_json::Value>(&json)
                .expect("export json")["knowledgeItems"]
                .as_array()
                .map(Vec::len)
                .unwrap_or(0))
            .unwrap_or(0),
        1,
        "retransmitted rows must not duplicate"
    );

    // --- 5. snapshot + upstreamDelta together → 422 ----------------------
    let response = client
        .post(format!("{}/v1/sync", server.base_url))
        .header("Authorization", format!("Bearer {token}"))
        .json(&serde_json::json!({
            "deviceId": "mobile-e2e",
            "snapshot": empty_export(),
            "upstreamDelta": empty_export(),
        }))
        .send()
        .await
        .expect("conflict request");
    assert_eq!(response.status(), 422);
    let body: serde_json::Value = response.json().await.expect("error body");
    assert_eq!(body["code"], "sync_protocol_conflict");

    // --- 6. wrong token → 401 -------------------------------------------
    let response = client
        .post(format!("{}/v1/sync", server.base_url))
        .header("Authorization", "Bearer not-a-real-token")
        .json(&serde_json::json!({
            "deviceId": "mobile-e2e",
            "sinceWatermark": 0,
        }))
        .send()
        .await
        .expect("auth request");
    assert_eq!(response.status(), 401);

    // --- 7. legacy request without upstreamDelta → no upstreamAck --------
    let sync_res: serde_json::Value = client
        .post(format!("{}/v1/sync", server.base_url))
        .header("Authorization", format!("Bearer {token}"))
        .json(&serde_json::json!({
            "deviceId": "mobile-e2e",
            "sinceWatermark": 400_000_000,
        }))
        .send()
        .await
        .expect("legacy request")
        .json()
        .await
        .expect("legacy json");
    assert_eq!(
        sync_res["upstreamAck"], serde_json::Value::Null,
        "no upstream payload → no ack, client cursor stays frozen"
    );

    // --- 8. downstream: desktop-side row reaches a watermarked client ----
    // Seed a desktop-side row via a full snapshot merge (the legacy path),
    // then poll from watermark 0: the response delta must carry the row.
    // Same server + same bridge core, so this stays one process-global story.
    let mut seed = empty_export();
    seed.knowledge_items
        .push(note("desktop-note", "made on desktop", 900_000_000));
    let sync_res: serde_json::Value = client
        .post(format!("{}/v1/sync", server.base_url))
        .header("Authorization", format!("Bearer {token}"))
        .json(&serde_json::json!({
            "deviceId": "mobile-e2e",
            "snapshot": seed,
        }))
        .send()
        .await
        .expect("seed sync")
        .json()
        .await
        .expect("seed json");
    let watermark = sync_res["newWatermark"].as_i64().expect("watermark issued");
    assert!(watermark >= 900_000_000, "watermark covers the seeded row");

    // Guardband (24h) subtracts from the cursor server-side; poll from 0 so
    // every row is eligible and we can assert on exact membership.
    let sync_res: serde_json::Value = client
        .post(format!("{}/v1/sync", server.base_url))
        .header("Authorization", format!("Bearer {token}"))
        .json(&serde_json::json!({
            "deviceId": "mobile-e2e",
            "sinceWatermark": 0,
        }))
        .send()
        .await
        .expect("delta poll")
        .json()
        .await
        .expect("delta json");
    let delta_ids: Vec<&str> = sync_res["delta"]["knowledgeItems"]
        .as_array()
        .expect("delta items")
        .iter()
        .filter_map(|item| item["id"].as_str())
        .collect();
    assert!(
        delta_ids.contains(&"desktop-note"),
        "downstream delta must carry the desktop row, got {delta_ids:?}"
    );
}
