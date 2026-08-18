//! Library surface for integration tests.
//!
//! 이 크레이트는 Tauri bin 이지만, `tests/` 통합 테스트가 상태 관리
//! (state)와 다운로드 무결성(download) 모듈에 접근할 수 있도록 lib
//! 타깃으로도 빌드된다. `main.rs` 의 모듈 선언과 동일한 집합을 유지한다.

pub mod commands;
pub mod download;
pub mod llm;
pub mod models;
pub mod secrets;
pub mod services;
pub mod state;
