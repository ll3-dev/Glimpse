//! LLM 토큰 스트리밍 이벤트 — rustra 푸시 경로로 emit 한다.
//!
//! 데스크톱 `stream_completion` 커맨드가 토큰/완료 이벤트를 여기서 발행하면,
//! 호스트(Tauri `main.rs` setup)가 `glimpse_package()` 에 설치한
//! `EventSink`(`rustra::tauri_support::tauri_event_sink`)가 이를 즉시
//! 웹뷰 채널로 전달한다:
//!
//! | 이벤트 이름                | Tauri 채널                     |
//! |---------------------------|--------------------------------|
//! | `llm:stream-token`        | `rustra://llm:stream-token`    |
//! | `llm:stream-done`         | `rustra://llm:stream-done`     |
//!
//! 채널명은 `rustra::tauri_support::event_channel` 규칙(`rustra://{sanitized}`,
//! 영숫자/`-`/`/`/`:`/`_` 외 문자는 `_` 치환)을 따른다 — `:`와 `-`는
//! Tauri 가 허용하므로 이 이름들은 치환 없이 통과한다.
//!
//! 페이로드는 기존 손글 `app.emit` 시절과 동일한 camelCase 모양
//! (`{requestId, token}` / `{requestId, fullText, stopReason}`)이다 —
//! 웹뷰 `listen` 콜백은 이미 파싱된 객체를 받으므로(Tauri `emit_str` 이
//! JSON 을 JS 소스에 원시 splice) 프론트 핸들러는 채널명 외 변경이 없다.

use serde_json::json;

/// LLM 토큰 이벤트 이름 — 웹뷰 채널 `rustra://llm:stream-token`.
pub const STREAM_TOKEN_EVENT: &str = "llm:stream-token";
/// LLM 스트림 완료 이벤트 이름 — 웹뷰 채널 `rustra://llm:stream-done`.
pub const STREAM_DONE_EVENT: &str = "llm:stream-done";

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

#[cfg(test)]
mod tests {
    use super::*;
    use crate::glimpse_package;
    use std::sync::{Arc, Mutex};

    /// 채널명 매핑 — 프론트가 `listen` 하는 이름과 정확히 일치해야 한다.
    /// (`:`/`-` 는 Tauri 채널 규칙이 허용하므로 치환 없이 통과.)
    #[test]
    fn stream_event_channels_keep_colon_and_dash() {
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
        // 즉, 채널은 rustra://llm:stream-token / rustra://llm:stream-done.
    }

    /// emit 이 싱크(설치 시) 또는 버스(미설치 시) 중 정확히 한 곳에
    /// camelCase 페이로드를 전달한다. glimpse_package 는 프로세스 글로벌
    /// 이므로 싱크를 설치했다면 테스트 끝에서 해제한다.
    #[test]
    fn emit_llm_token_delivers_camel_case_payload_exactly_once() {
        let pkg = glimpse_package();
        let seen: Arc<Mutex<Vec<(String, String)>>> = Arc::new(Mutex::new(Vec::new()));
        let sink_seen = Arc::clone(&seen);
        pkg.set_event_sink(Some(Arc::new(move |name: &str, payload: &str| {
            sink_seen
                .lock()
                .unwrap()
                .push((name.to_string(), payload.to_string()));
        })));

        emit_llm_token("req-1", "Hello");
        emit_llm_done("req-1", "Hello world", "completed");

        // 싱크가 받았으면 버스는 우회된다(이중 수신 없음).
        let bus_events = pkg.event_bus().take_pending_events();
        pkg.set_event_sink(None); // 다른 테스트에 영향 주지 않게 복원

        let events = seen.lock().unwrap().clone();
        assert_eq!(events.len(), 2, "sink must receive both events");
        assert_eq!(events[0].0, "llm:stream-token");
        let token: serde_json::Value = serde_json::from_str(&events[0].1).unwrap();
        assert_eq!(token["requestId"], "req-1");
        assert_eq!(token["token"], "Hello");
        // camelCase 계약: snake_case 가 와이어에 새면 안 된다.
        assert!(token.get("request_id").is_none());
        assert!(token.get("full_text").is_none());

        assert_eq!(events[1].0, "llm:stream-done");
        let done: serde_json::Value = serde_json::from_str(&events[1].1).unwrap();
        assert_eq!(done["requestId"], "req-1");
        assert_eq!(done["fullText"], "Hello world");
        assert_eq!(done["stopReason"], "completed");

        // 정확히 한 번: 싱크를 받은 이상 버스는 비어 있어야 한다.
        assert!(
            bus_events.is_empty(),
            "installed sink must bypass the polling bus"
        );
    }
}
