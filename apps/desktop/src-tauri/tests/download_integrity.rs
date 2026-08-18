//! 다운로드 무결성 검증 (headless):
//!
//! 1. `model:download-failed` 이벤트가 `rustra://model:download-failed`
//!    채널로 camelCase 페이로드와 함께 도달한다.
//! 2. `cleanup_stale_tmp_files` 가 models_dir 의 stale `*.gguf.tmp` 를 제거한다.
//! 3. 상태 가드 — 다운로드 중 모델은 중복 mark_model_downloading / delete 가 거부된다.

use std::sync::{Arc, Mutex};
use tauri::Listener;
use tauri::test::{MockRuntime, mock_context, noop_assets};

type Received = Arc<Mutex<Vec<String>>>;

fn app_with_failed_listener() -> (tauri::App<MockRuntime>, Received) {
    let core = glimpse_core::SharedCore::in_memory().expect("in-memory SharedCore");
    let _ = glimpse_bridge::init_core(core);

    let app = tauri::test::mock_builder()
        .build(mock_context(noop_assets()))
        .expect("mock app builds");

    glimpse_bridge::glimpse_package().set_event_sink(Some(rustra::tauri_support::tauri_event_sink(
        app.handle().clone(),
    )));

    let failures: Received = Arc::new(Mutex::new(Vec::new()));
    let f = Arc::clone(&failures);
    app.listen("rustra://model:download-failed", move |event| {
        f.lock().unwrap().push(event.payload().to_string());
    });

    (app, failures)
}

#[test]
fn download_failed_event_reaches_channel_with_camel_case_payload() {
    let (_app, failures) = app_with_failed_listener();

    glimpse_bridge::emit_model_download_failed("qwen-test", "HTTP 503");

    let failures = failures.lock().unwrap().clone();
    assert_eq!(failures.len(), 1, "failure event must arrive");
    let payload: serde_json::Value = serde_json::from_str(&failures[0]).unwrap();
    assert_eq!(payload["modelId"], "qwen-test");
    assert_eq!(payload["error"], "HTTP 503");
    assert!(payload.get("model_id").is_none(), "camelCase contract must hold");

    glimpse_bridge::glimpse_package().set_event_sink(None);
}

#[test]
fn stale_tmp_files_are_cleaned_up() {
    let dir = glimpse_desktop::download::models_dir();
    let _ = std::fs::create_dir_all(&dir);

    let stale = dir.join("stale-test.gguf.tmp");
    let keep = dir.join("keep-test.gguf");
    std::fs::write(&stale, b"partial").expect("write stale tmp");
    std::fs::write(&keep, b"full").expect("write final gguf");

    glimpse_desktop::download::cleanup_stale_tmp_files();

    assert!(!stale.exists(), "stale .gguf.tmp must be removed");
    assert!(keep.exists(), "final .gguf must survive cleanup");

    let _ = std::fs::remove_file(&keep);
}

#[test]
fn downloading_models_reject_duplicate_mark_and_delete() {
    let state = glimpse_desktop::state::DesktopRuntimeStateInner::from_defaults();

    let first = state
        .mark_model_downloading("qwen3.5-0.8b-q4")
        .expect("first mark succeeds");
    assert_eq!(first.status, "downloading");

    // 중복 다운로드 가드
    let dup = match state.mark_model_downloading("qwen3.5-0.8b-q4") {
        Err(e) => e,
        Ok(_) => panic!("duplicate mark must be rejected"),
    };
    assert!(dup.contains("already downloading"));

    // 다운로드 중 삭제 가드
    let del = state
        .delete_model("qwen3.5-0.8b-q4")
        .expect_err("delete during download must be rejected");
    assert!(del.contains("downloading"));

    // 실패 기록은 사유를 저장하고 상태를 복구 가능하게 둔다
    state
        .mark_model_download_failed("qwen3.5-0.8b-q4", "boom")
        .expect("fail mark succeeds");
    let model = state
        .get_model("qwen3.5-0.8b-q4")
        .expect("model exists after failure");
    assert_eq!(model.status, "download_failed");
    assert_eq!(model.download_error.as_deref(), Some("boom"));

    // 실패 상태에서는 삭제 가능해야 한다
    state
        .delete_model("qwen3.5-0.8b-q4")
        .expect("delete after failure succeeds");
    let model = state
        .get_model("qwen3.5-0.8b-q4")
        .expect("model record persists");
    assert_eq!(model.status, "not_downloaded");
    assert!(model.download_error.is_none(), "error must be cleared on delete");
}
