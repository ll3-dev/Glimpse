# 3주차 — rustra 이벤트 푸시 + 데스크톱 스트리밍 전환 구현 계획

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** rustra(레포 `~/dev/ll3/rustra-bridge`, github.com/loopy-lim/rustra)에 푸시 기반 이벤트 전달을 추가하고(Tauri `app.emit` + RN JSI 콜백), 이걸로 Glimpse 데스크톱의 LLM 토큰 스트리밍을 전환한다. 1MB FFI 상한 대응 방침도 확정한다.

**Architecture:** rustra의 기존 `Package::emit` → `EventBus`(폴링 전용, drop-oldest, JSON payload) 위에 **호스트 푸시 훅**을 얹는다: `Package::set_event_sink(callback)` 형태로 호스트가 콜백을 등록하면 emit이 즉시 콜백을 호출한다. Tauri 어댑터는 콜백에서 `app.emit(name, payload)`로, RN JSI는 HostObject에 JS 함수 레지스트리를 두고 콜백에서 JS로 전달한다. 폴링(`take_pending_events`) 경로는 하위 호환으로 유지.

**Tech Stack:** Rust (rustra crates), Tauri 2 events, RN JSI (JS callback invocation), Glimpse desktop (`llm:stream-token`/`llm:stream-done` → rustra 이벤트).

---

### Task 1 (rustra 레포): 이벤트 싱크 API + 단위 테스트

**Files (in ~/dev/ll3/rustra-bridge):**
- Modify: `crates/rustra/src/events.rs` — `EventSink` 타입(`Arc<dyn Fn(&str, &str) + Send + Sync>`), `Package::set_event_sink(Option<EventSink>)`, emit 경로에서 sink 호출(있으면 즉시, 실패해도 EventBus 폴백 유지 — sink와 bus 둘 다에 기록할지 sink만 할지 결정: 권장은 **sink 있으면 bus 건너뛰기**로 이중 수신 방지, 문서화)
- Test: emit → sink 콜백 수신; sink 해제 후 폴링 폴백; drop-oldest 동작 유지

**Verify:** `cargo test -p rustra` (기존 ~34 + 신규). 커밋은 rustra 레포 규칙(한국어 커밋 메시지 관례 확인 — 최근 커밋 참고).

### Task 2 (rustra 레포): Tauri 푸시 배선

- `tauri_support`에 `register_with_events(package, builder, app_handle_provider)` 또는 기존 `register` 확장: setup 단계에서 `package.set_event_sink(Some(...))` → `app.emit("rustra:event", {name, payload})`. 이벤트명 네임스페이스(`rustra://<name>` 등) 설계. 기존 `register` 시그니처 호환 유지(깨지 않게).
- `examples/tauri-calculator` 또는 스트리밍 예제에 배선 데모 + 테스트(가능하면 headless invoke로 emit 검증).

### Task 3 (rustra 레포): RN JSI 푸시 콜백

- JSI HostObject에 `onEvent(name, jsCallback)`/`offEvent(name)` 추가(또는 `subscribe(name, cb)`): Rust sink가 호출되면 등록된 JS 함수를 JSI로 invoke. 스레드 안전(JS 런타임 스레드에서만 JSI 호출 — 큐잉/디스패치 필요, 예제의 `subscribeTick` BTS 패턴 참조). iOS `.mm`/C++와 Android JNI 모두.
- `@rustra/react-native` TS에 `subscribe(name, cb): () => void` API 추가(엔진 레벨).
- 예제 앱에 이벤트 수신 데모.

### Task 4 (rustra 레포): 버전 범프 + 게시 준비

- rustra 버전 0.1.2(changesets) — Glimpse가 쓰는 건 로컬 path 의존성으로 전환해 개발 중 즉시 반영, 안정화 후 crates.io/npm에 0.1.2 게시(게시는 사용자 확인 필요할 수 있음 — 준비만).
- Glimpse 쪽: `packages/bridge-rust/Cargo.toml`과 `apps/desktop/src-tauri/Cargo.toml`의 `rustra = "=0.1.1"`을 `{ path = "../../.." }` 형태 로컬 path로 임시 전환(또는 git dep). npm `@rustra/*`도 로컬 workspace 링크로.

### Task 5 (Glimpse): 데스크톱 스트리밍 전환

- `apps/desktop/src-tauri/src/commands.rs`의 `stream_completion`: 토큰 콜백에서 `app.emit("llm:stream-token")` 대신 rustra `emit` 사용(브릿지 crate가 LLM 엔진 콜백을 받아 `package.emit("llm:stream-token", ...)` 호출). LLM 엔진 자체(llama-cpp-2)는 그대로.
- 프론트 `desktop-llm-service.ts`: `listen("llm:stream-token")` → rustra 이벤트 구독 API로 교체(Tauri 이벤트名 유지해 어댑터 최소화 — rustra가 Tauri emit으로 전달하면 `listen` 그대로일 수도 있음. 그 경우 프론트 변경 없음 — 설계에 따름).
- 스트리밍 회귀 테스트: 모델 로드 없이 테스트 가능한 형태(가짜 토큰 emit으로 end-to-end 검증).

### Task 6: 1MB 상한 대응 방침 + 문서

- 임베딩 벡터 실측(`run_embedding` 응답 크기), 상한 도달 시: rustra FFI `MAX_PAYLOAD_BYTES` 설정 가능화(feature/env) 또는 청킹 — 실측 기반으로 방침만 확정하고 이슈로 기록(구현은 필요시).
- 디자인 문서에 "3주차 결과" 섹션, `rustra-bridge-development.md` 갱신.

---

## 리스크

- rustra 레포는 별도 git 레포(브랜치에서 작업, Glimpse와 병행 검증). 사용자 소유 레포이므로 직접 커밋하되 푸시는 main 보호 여부 확인 후 진행.
- JSI 콜백 스레딩이 까다로움 — 예제의 검증된 BTS 패턴 재사용.
- rustra API 확장이 기존 소비자(계산기 예제 등)를 깨지 않게 시그니처 호환 유지.
