//! LLM 토큰 스트리밍 및 모델 다운로드 이벤트 — rustra 푸시 경로로 emit 한다.
//!
//! 데스크톱 `stream_completion` 커맨드 및 `download_model` 태스크가 이벤트를 여기서 발행하면,
//! 호스트(Tauri `main.rs` setup)가 `glimpse_package()` 에 설치한
//! `EventSink`(`rustra::tauri_support::tauri_event_sink`)가 이를 즉시
//! 웹뷰 채널로 전달한다:
//!
//! | 이벤트 이름                | Tauri 채널                     |
//! |---------------------------|--------------------------------|
//! | `llm:stream-token`        | `rustra://llm:stream-token`    |
//! | `llm:stream-done`         | `rustra://llm:stream-done`     |
//! | `model:download-progress` | `rustra://model:download-progress` |
//! | `model:download-done`     | `rustra://model:download-done`     |
//!
//! 채널명은 `rustra::tauri_support::event_channel` 규칙(`rustra://{sanitized}`,
//! 영숫자/`-`/`/`/`:`/`_` 외 문자는 `_` 치환)을 따른다 — `:`와 `-`는
//! Tauri 가 허용하므로 이 이름들은 치환 없이 통과한다.
//!
//! 페이로드는 기존 손글 `app.emit` 시절과 동일한 camelCase 모양이다 —
//! 웹뷰 `listen` 콜백은 이미 파싱된 객체를 받으므로(Tauri `emit_str` 이
//! JSON 을 JS 소스에 원시 splice) 프론트 핸들러는 채널명 외 변경이 없다.

use serde_json::json;

// ── (이벤트 계약) payload 타입 ──────────────────────────────
// `glimpse_package()` 빌더가 `.event::<E>()` 로 선언하는 페이로드 타입들.
// 런타임 emit 은 아래 json! 매크로가 같은 camelCase 모양을 만들므로 serde
// rename 규칙이 이 레코드의 계약과 정확히 일치해야 한다 — 어긋나면 코드젠
// 타입과 와이어가 달라진다.

/// `llm:stream-token` 페이로드.
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct StreamTokenPayload {
    pub request_id: String,
    pub token: String,
}

/// `llm:stream-done` 페이로드.
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct StreamDonePayload {
    pub request_id: String,
    pub full_text: String,
    pub stop_reason: String,
}

/// `model:download-progress` 페이로드.
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct DownloadProgressPayload {
    pub model_id: String,
    pub bytes_received: u64,
    pub total_bytes: u64,
    pub percentage: f64,
}

/// `model:download-done` 페이로드.
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct DownloadDonePayload {
    pub model_id: String,
    pub path: String,
}

/// `model:download-failed` 페이로드.
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct DownloadFailedPayload {
    pub model_id: String,
    pub error: String,
}

/// LLM 토큰 이벤트 이름 — 웹뷰 채널 `rustra://llm:stream-token`.
pub const STREAM_TOKEN_EVENT: &str = "llm:stream-token";
/// LLM 스트림 완료 이벤트 이름 — 웹뷰 채널 `rustra://llm:stream-done`.
pub const STREAM_DONE_EVENT: &str = "llm:stream-done";
/// 모델 다운로드 진행률 이벤트 이름 — 웹뷰 채널 `rustra://model:download-progress`.
pub const DOWNLOAD_PROGRESS_EVENT: &str = "model:download-progress";
/// 모델 다운로드 완료 이벤트 이름 — 웹뷰 채널 `rustra://model:download-done`.
pub const DOWNLOAD_DONE_EVENT: &str = "model:download-done";
/// 모델 다운로드 실패 이벤트 이름 — 웹뷰 채널 `rustra://model:download-failed`.
pub const DOWNLOAD_FAILED_EVENT: &str = "model:download-failed";

/// 스트리밍 토큰 1개를 발행한다.
///
/// 싱크가 설치된 호스트에서는 즉시 웹뷰로 푸시되고, 미설치 호스트(테스트 등)
/// 에서는 rustra 이벤트 버스에 쌓인다 — 어느 쪽이든 emit 호출은 블록하지
/// 않는다.
pub fn emit_llm_token(request_id: &str, token: &str) {
    super::glimpse_package().emit(
        STREAM_TOKEN_EVENT,
        json!({ "requestId": request_id, "token": token }),
    );
}

/// 스트림 완료 이벤트를 발행한다.
pub fn emit_llm_done(request_id: &str, full_text: &str, stop_reason: &str) {
    super::glimpse_package().emit(
        STREAM_DONE_EVENT,
        json!({
            "requestId": request_id,
            "fullText": full_text,
            "stopReason": stop_reason,
        }),
    );
}

/// 모델 다운로드 진행률 이벤트를 발행한다.
pub fn emit_model_download_progress(
    model_id: &str,
    bytes_received: u64,
    total_bytes: u64,
    percentage: f64,
) {
    super::glimpse_package().emit(
        DOWNLOAD_PROGRESS_EVENT,
        json!({
            "modelId": model_id,
            "bytesReceived": bytes_received,
            "totalBytes": total_bytes,
            "percentage": percentage,
        }),
    );
}

/// 모델 다운로드 완료 이벤트를 발행한다.
pub fn emit_model_download_done(model_id: &str, path: &str) {
    super::glimpse_package().emit(
        DOWNLOAD_DONE_EVENT,
        json!({
            "modelId": model_id,
            "path": path,
        }),
    );
}

/// 모델 다운로드 실패 이벤트를 발행한다.
///
/// 실패 원인 문자열을 페이로드로 전달해 프론트가 invoke 거부 외에
/// 이벤트 경로로도 실패를 수신하고 진행 UI를 수렴시킬 수 있게 한다.
pub fn emit_model_download_failed(model_id: &str, error: &str) {
    super::glimpse_package().emit(
        DOWNLOAD_FAILED_EVENT,
        json!({
            "modelId": model_id,
            "error": error,
        }),
    );
}

/// 빌더 파이프에서 이벤트 계약을 선언한다 — payload 타입과 함께 등록해
/// schema.json `events` 섹션과 TS 코드젠이 이벤트 와이어를 커버하게 한다.
/// emit 경로(`json!` 리터럴)와 rename 규칙이 일치하는지는 아래 테스트가
/// 런타임 페이로드로 검증한다.
pub fn register_event_contracts(builder: rustra::PackageBuilder) -> rustra::PackageBuilder {
    builder
        .event::<StreamTokenPayload>(STREAM_TOKEN_EVENT)
        .event::<StreamDonePayload>(STREAM_DONE_EVENT)
        .event::<DownloadProgressPayload>(DOWNLOAD_PROGRESS_EVENT)
        .event::<DownloadDonePayload>(DOWNLOAD_DONE_EVENT)
        .event::<DownloadFailedPayload>(DOWNLOAD_FAILED_EVENT)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::glimpse_package;
    use std::sync::{Arc, Mutex};

    /// 채널명 매핑 — 프론트가 `listen` 하는 이름과 정확히 일치해야 한다.
    /// (`:`/`-` 는 Tauri 채널 규칙이 허용하므로 치환 없이 통과.)
    #[test]
    fn stream_and_download_event_channels_keep_colon_and_dash() {
        // rustra tauri_support 의 sanitize 규칙과 동일하게 재현: 영숫자와
        // -, /, :, _ 외 문자만 _ 로 치환 (bridge 크레이트은 tauri feature 를
        // 켜지 않으므로 rustra::tauri_support 를 직접 부를 수 없다).
        let sanitize = |name: &str| -> String {
            name.chars()
                .map(|c| {
                    if c.is_alphanumeric() || matches!(c, '-' | '/' | ':' | '_') {
                        c
                    } else {
                        '_'
                    }
                })
                .collect()
        };
        assert_eq!(sanitize(STREAM_TOKEN_EVENT), "llm:stream-token");
        assert_eq!(sanitize(STREAM_DONE_EVENT), "llm:stream-done");
        assert_eq!(sanitize(DOWNLOAD_PROGRESS_EVENT), "model:download-progress");
        assert_eq!(sanitize(DOWNLOAD_DONE_EVENT), "model:download-done");
        assert_eq!(sanitize(DOWNLOAD_FAILED_EVENT), "model:download-failed");
        // 즉, 채널은 rustra://model:download-progress / rustra://model:download-done.
    }

    /// 싱크 설치 테스트는 프로세스 글로벌 싱크 슬롯을 두고 경합하므로
    /// 직렬화한다 — 병렬 실행 시 다른 테스트의 emit이 내 싱크로 온다.
    static SINK_TESTS: std::sync::Mutex<()> = std::sync::Mutex::new(());

    /// 싱크를 설치한 상태로 `emit`을 실행하고 싱크가 받은 (이름, 페이로드)
    /// 목록을 돌려준다. 끝에서 싱크를 해제하므로 다른 테스트에 영향이 없다.
    /// `SINK_TESTS` 가드를 호출자가 쥐고 있어야 한다(내부에서 재잠그지 않음).
    fn with_captured_sink(emit: impl FnOnce()) -> Vec<(String, String)> {
        let pkg = glimpse_package();
        let seen: Arc<Mutex<Vec<(String, String)>>> = Arc::new(Mutex::new(Vec::new()));
        let sink_seen = Arc::clone(&seen);
        pkg.set_event_sink(Some(Arc::new(move |name: &str, payload: &str| {
            sink_seen
                .lock()
                .unwrap()
                .push((name.to_string(), payload.to_string()));
        })));

        emit();

        pkg.set_event_sink(None); // 다른 테스트에 영향 주지 않게 복원
        let events = seen.lock().unwrap().clone();
        events
    }

    /// emit 이 싱크(설치 시) 또는 버스(미설치 시) 중 정확히 한 곳에
    /// camelCase 페이로드를 전달한다. glimpse_package 는 프로세스 글로벌
    /// 이므로 싱크를 설치했다면 테스트 끝에서 해제한다.
    #[test]
    fn emit_events_deliver_camel_case_payload_to_sink_exactly_once() {
        let _guard = SINK_TESTS.lock().unwrap_or_else(|poisoned| poisoned.into_inner());
        let pkg = glimpse_package();
        let bus = pkg.event_bus();

        let events = with_captured_sink(|| {
            // 1. LLM 토큰 및 완료 이벤트
            emit_llm_token("req-1", "Hello");
            emit_llm_done("req-1", "Hello world", "completed");

            // 2. 모델 다운로드 진행률 및 완료 이벤트
            emit_model_download_progress("qwen-1", 1024, 2048, 50.0);
            emit_model_download_done("qwen-1", "/path/to/model.gguf");
        });
        assert_eq!(events.len(), 4, "sink must receive all 4 events");

        // LLM 토큰 이벤트 검증
        assert_eq!(events[0].0, "llm:stream-token");
        let token: serde_json::Value = serde_json::from_str(&events[0].1).unwrap();
        assert_eq!(token["requestId"], "req-1");
        assert_eq!(token["token"], "Hello");
        // camelCase 계약: snake_case 가 와이어에 새면 안 된다.
        assert!(token.get("request_id").is_none());
        assert!(token.get("full_text").is_none());

        // LLM 완료 이벤트 검증
        assert_eq!(events[1].0, "llm:stream-done");
        let done: serde_json::Value = serde_json::from_str(&events[1].1).unwrap();
        assert_eq!(done["requestId"], "req-1");
        assert_eq!(done["fullText"], "Hello world");
        assert_eq!(done["stopReason"], "completed");

        // 모델 다운로드 진행률 이벤트 검증
        assert_eq!(events[2].0, "model:download-progress");
        let progress: serde_json::Value = serde_json::from_str(&events[2].1).unwrap();
        assert_eq!(progress["modelId"], "qwen-1");
        assert_eq!(progress["bytesReceived"], 1024);
        assert_eq!(progress["totalBytes"], 2048);
        assert_eq!(progress["percentage"], 50.0);
        assert!(progress.get("model_id").is_none());
        assert!(progress.get("bytes_received").is_none());
        assert!(progress.get("total_bytes").is_none());

        // 모델 다운로드 완료 이벤트 검증
        assert_eq!(events[3].0, "model:download-done");
        let model_done: serde_json::Value = serde_json::from_str(&events[3].1).unwrap();
        assert_eq!(model_done["modelId"], "qwen-1");
        assert_eq!(model_done["path"], "/path/to/model.gguf");
        assert!(model_done.get("model_id").is_none());

        // 정확히 한 번: 싱크를 받은 이상 버스는 비어 있어야 한다.
        let bus_events = bus.take_pending_events();
        assert!(
            bus_events.is_empty(),
            "installed sink must bypass the polling bus"
        );
    }

    /// emit 경로(`json!` 리터럴)가 `.event::<E>()` 로 선언한 payload struct의
    /// 직렬화와 정확히 일치하는지 검증한다 — 어긋나면 코드젠 타입과 실제
    /// 와이어가 달라진다(계약 부정).
    #[test]
    fn emitted_payloads_match_declared_event_contract_types() {
        let _guard = SINK_TESTS.lock().unwrap_or_else(|poisoned| poisoned.into_inner());
        let events = with_captured_sink(|| {
            emit_llm_token("req-1", "Hello");
            emit_llm_done("req-1", "Hello world", "completed");
            emit_model_download_progress("qwen-1", 1024, 2048, 50.0);
            emit_model_download_done("qwen-1", "/path/to/model.gguf");
            emit_model_download_failed("qwen-1", "disk full");
        });
        assert_eq!(events.len(), 5);

        let expect = |declared: &str, wire: &str, value: serde_json::Value| {
            let wire_value: serde_json::Value = serde_json::from_str(wire).unwrap();
            assert_eq!(
                wire_value, value,
                "emit wire payload for {declared} must match its declared struct serialization"
            );
        };

        expect(
            STREAM_TOKEN_EVENT,
            &events[0].1,
            serde_json::to_value(StreamTokenPayload {
                request_id: "req-1".into(),
                token: "Hello".into(),
            })
            .unwrap(),
        );
        expect(
            STREAM_DONE_EVENT,
            &events[1].1,
            serde_json::to_value(StreamDonePayload {
                request_id: "req-1".into(),
                full_text: "Hello world".into(),
                stop_reason: "completed".into(),
            })
            .unwrap(),
        );
        expect(
            DOWNLOAD_PROGRESS_EVENT,
            &events[2].1,
            serde_json::to_value(DownloadProgressPayload {
                model_id: "qwen-1".into(),
                bytes_received: 1024,
                total_bytes: 2048,
                percentage: 50.0,
            })
            .unwrap(),
        );
        expect(
            DOWNLOAD_DONE_EVENT,
            &events[3].1,
            serde_json::to_value(DownloadDonePayload {
                model_id: "qwen-1".into(),
                path: "/path/to/model.gguf".into(),
            })
            .unwrap(),
        );
        expect(
            DOWNLOAD_FAILED_EVENT,
            &events[4].1,
            serde_json::to_value(DownloadFailedPayload {
                model_id: "qwen-1".into(),
                error: "disk full".into(),
            })
            .unwrap(),
        );
    }

    /// 이벤트 계약이 실제로 선언됐는지 — schema.json `events` 섹션이 5개
    /// 이벤트와 payload 스키마를 가져야 한다(코드젠 산출물의 입력).
    #[test]
    fn package_schema_declares_all_llm_and_download_events() {
        let schema = glimpse_package().live_schema();
        let events = schema
            .get("events")
            .and_then(|events| events.as_array())
            .expect("glimpse.core schema must declare an events section");
        let names: Vec<&str> = events
            .iter()
            .filter_map(|event| event.get("name").and_then(|name| name.as_str()))
            .collect();
        for expected in [
            STREAM_TOKEN_EVENT,
            STREAM_DONE_EVENT,
            DOWNLOAD_PROGRESS_EVENT,
            DOWNLOAD_DONE_EVENT,
            DOWNLOAD_FAILED_EVENT,
        ] {
            assert!(
                names.contains(&expected),
                "schema events must declare {expected}"
            );
        }
        // camelCase 페이로드 필드가 스키마에 그대로 보여야 한다.
        let token = events
            .iter()
            .find(|event| event.get("name").and_then(|name| name.as_str()) == Some(STREAM_TOKEN_EVENT))
            .expect("stream-token event declared");
        let properties = token
            .pointer("/payload/properties")
            .expect("payload object schema");
        assert!(properties.get("requestId").is_some());
        assert!(properties.get("token").is_some());
        assert!(properties.get("request_id").is_none());
    }
}
