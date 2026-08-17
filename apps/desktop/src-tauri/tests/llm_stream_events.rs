//! LLM 스트리밍 이벤트의 rustra 푸시 경로 검증 (headless).
//!
//! `main.rs` setup 이 설치하는 것과 동일한 배선(`tauri_event_sink`)을
//! `tauri::test::MockRuntime` 앱에 설치하고 `glimpse_bridge::emit_llm_token` /
//! `emit_llm_done` 을 호출해 실제 Tauri 이벤트 시스템까지 왕복을 증명한다:
//!
//! 1. 이벤트가 정확히 `rustra://llm:stream-token` / `rustra://llm:stream-done`
//!    채널로 도달한다 — 프론트 `listen` 이름과의 계약. (`:`/`-` 는 Tauri
//!    채널 규칙이 허용하므로 rustra sanitize 를 통과해 변형되지 않는다.)
//! 2. 페이로드는 기존 손글 `app.emit` 시절과 동일한 camelCase 모양으로 JSON
//!    문자열 그대로 전달된다(웹뷰 listen 은 파싱된 객체를 수신).
//! 3. 싱크 설치 중에는 폴링 버스가 우회된다(이중 수신 없음).

use std::sync::{Arc, Mutex};
use tauri::Listener;
use tauri::test::{MockRuntime, mock_context, noop_assets};

type Received = Arc<Mutex<Vec<String>>>;

/// main.rs setup 과 동일한 배선으로 mock 앱을 만들고 두 채널에 리스너를
/// 단다. bridge global 은 이벤트 emit 에만 필요하므로 in-memory 코어로
/// 초기화한다(명령 dispatch 는 검증 대상 아님).
fn app_with_stream_listeners() -> (tauri::App<MockRuntime>, Received, Received) {
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

    let t = Arc::clone(&tokens);
    app.listen("rustra://llm:stream-token", move |event| {
        t.lock().unwrap().push(event.payload().to_string());
    });
    let d = Arc::clone(&dones);
    app.listen("rustra://llm:stream-done", move |event| {
        d.lock().unwrap().push(event.payload().to_string());
    });

    (app, tokens, dones)
}

#[test]
fn llm_stream_events_reach_rustra_prefixed_channels() {
    let (_app, tokens, dones) = app_with_stream_listeners();

    glimpse_bridge::emit_llm_token("req-test", "He");
    glimpse_bridge::emit_llm_token("req-test", "llo");
    glimpse_bridge::emit_llm_done("req-test", "Hello", "completed");

    // 채널명 계약: 토큰은 rustra://llm:stream-token 로만, 완료는
    // rustra://llm:stream-done 로만 도착한다(리스너가 각각 걸렸으므로
    // 도착 수 자체가 채널 매핑의 증명).
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

    let dones = dones.lock().unwrap().clone();
    assert_eq!(dones.len(), 1);
    let done_payload: serde_json::Value = serde_json::from_str(&dones[0]).unwrap();
    assert_eq!(done_payload["requestId"], "req-test");
    assert_eq!(done_payload["fullText"], "Hello");
    assert_eq!(done_payload["stopReason"], "completed");
    assert!(done_payload.get("full_text").is_none());

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
