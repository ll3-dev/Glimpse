//! LLM 스트리밍 및 모델 다운로드 이벤트의 rustra 푸시 경로 검증 (headless).
//!
//! `main.rs` setup 이 설치하는 것과 동일한 배선(`tauri_event_sink`)을
//! `tauri::test::MockRuntime` 앱에 설치하고 `glimpse_bridge::emit_llm_token` /
//! `emit_llm_done` / `emit_model_download_progress` / `emit_model_download_done` 을
//! 호출해 실제 Tauri 이벤트 시스템까지 왕복을 증명한다:
//!
//! 1. 이벤트가 정확히 `rustra://llm:stream-token`, `rustra://llm:stream-done`,
//!    `rustra://model:download-progress`, `rustra://model:download-done`
//!    채널로 도달한다 — 프론트 `listen` 이름과의 계약. (`:`/`-` 는 Tauri
//!    채널 규칙이 허용하므로 rustra sanitize 를 통과해 변형되지 않는다.)
//! 2. 페이로드는 기존 손글 `app.emit` 시절과 동일한 camelCase 모양으로 JSON
//!    문자열 그대로 전달된다(웹뷰 listen 은 파싱된 객체를 수신).
//! 3. 싱크 설치 중에는 폴링 버스가 우회된다(이중 수신 없음).

use std::sync::{Arc, Mutex};
use tauri::Listener;
use tauri::test::{MockRuntime, mock_context, noop_assets};

type Received = Arc<Mutex<Vec<String>>>;

/// main.rs setup 과 동일한 배선으로 mock 앱을 만들고 이벤트 채널에 리스너를
/// 단다. bridge global 은 이벤트 emit 에만 필요하므로 in-memory 코어로
/// 초기화한다(명령 dispatch 는 검증 대상 아님).
fn app_with_event_listeners() -> (
    tauri::App<MockRuntime>,
    Received,
    Received,
    Received,
    Received,
) {
    let core = glimpse_core::SharedCore::in_memory().expect("in-memory SharedCore");
    let _ = glimpse_bridge::init_core(core);

    let app = tauri::test::mock_builder()
        .build(mock_context(noop_assets()))
        .expect("mock app builds");

    // main.rs setup 과 동일한 싱크 설치 (플러그인 없이 직접).
    glimpse_bridge::glimpse_package().set_event_sink(Some(rustra::tauri_support::tauri_event_sink(
        app.handle().clone(),
    )));

    let tokens: Received = Arc::new(Mutex::new(Vec::new()));
    let dones: Received = Arc::new(Mutex::new(Vec::new()));
    let download_progress: Received = Arc::new(Mutex::new(Vec::new()));
    let download_dones: Received = Arc::new(Mutex::new(Vec::new()));

    let t = Arc::clone(&tokens);
    app.listen("rustra://llm:stream-token", move |event| {
        t.lock().unwrap().push(event.payload().to_string());
    });
    let d = Arc::clone(&dones);
    app.listen("rustra://llm:stream-done", move |event| {
        d.lock().unwrap().push(event.payload().to_string());
    });
    let dp = Arc::clone(&download_progress);
    app.listen("rustra://model:download-progress", move |event| {
        dp.lock().unwrap().push(event.payload().to_string());
    });
    let dd = Arc::clone(&download_dones);
    app.listen("rustra://model:download-done", move |event| {
        dd.lock().unwrap().push(event.payload().to_string());
    });

    (app, tokens, dones, download_progress, download_dones)
}

#[test]
fn events_reach_rustra_prefixed_channels_with_camel_case_payloads() {
    let (_app, tokens, dones, download_progress, download_dones) = app_with_event_listeners();

    // 1. LLM 스트리밍 이벤트 발행
    glimpse_bridge::emit_llm_token("req-test", "He");
    glimpse_bridge::emit_llm_token("req-test", "llo");
    glimpse_bridge::emit_llm_done("req-test", "Hello", "completed");

    // 2. 모델 다운로드 이벤트 발행
    glimpse_bridge::emit_model_download_progress("qwen-test", 512, 1024, 50.0);
    glimpse_bridge::emit_model_download_done("qwen-test", "/tmp/qwen.gguf");

    // LLM 토큰 채널 검증
    let tokens = tokens.lock().unwrap().clone();
    assert_eq!(tokens.len(), 2, "both token events must arrive");
    let first: serde_json::Value = serde_json::from_str(&tokens[0]).unwrap();
    assert_eq!(first["requestId"], "req-test");
    assert_eq!(first["token"], "He");
    assert!(
        first.get("request_id").is_none(),
        "camelCase contract must hold"
    );
    let second: serde_json::Value = serde_json::from_str(&tokens[1]).unwrap();
    assert_eq!(second["token"], "llo");

    // LLM 완료 채널 검증
    let dones = dones.lock().unwrap().clone();
    assert_eq!(dones.len(), 1);
    let done_payload: serde_json::Value = serde_json::from_str(&dones[0]).unwrap();
    assert_eq!(done_payload["requestId"], "req-test");
    assert_eq!(done_payload["fullText"], "Hello");
    assert_eq!(done_payload["stopReason"], "completed");
    assert!(done_payload.get("full_text").is_none());

    // 모델 다운로드 진행률 채널 검증
    let dp = download_progress.lock().unwrap().clone();
    assert_eq!(dp.len(), 1);
    let dp_payload: serde_json::Value = serde_json::from_str(&dp[0]).unwrap();
    assert_eq!(dp_payload["modelId"], "qwen-test");
    assert_eq!(dp_payload["bytesReceived"], 512);
    assert_eq!(dp_payload["totalBytes"], 1024);
    assert_eq!(dp_payload["percentage"], 50.0);
    assert!(dp_payload.get("model_id").is_none());
    assert!(dp_payload.get("bytes_received").is_none());

    // 모델 다운로드 완료 채널 검증
    let dd = download_dones.lock().unwrap().clone();
    assert_eq!(dd.len(), 1);
    let dd_payload: serde_json::Value = serde_json::from_str(&dd[0]).unwrap();
    assert_eq!(dd_payload["modelId"], "qwen-test");
    assert_eq!(dd_payload["path"], "/tmp/qwen.gguf");
    assert!(dd_payload.get("model_id").is_none());

    // 싱크 설치 중 폴링 버스는 우회된다(이중 수신 없음).
    assert!(
        glimpse_bridge::glimpse_package()
            .event_bus()
            .take_pending_events()
            .is_empty()
    );

    // 다른 테스트(같은 프로세스 글로벌 공유)에 영향 주지 않도록 복원.
    glimpse_bridge::glimpse_package().set_event_sink(None);
}
