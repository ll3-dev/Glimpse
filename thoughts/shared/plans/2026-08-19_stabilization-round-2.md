# Glimpse 안정화 라운드 2 구현 계획

> **Status: COMPLETE (2026-08-19)** — Phase A~E 전부 완료.
> 커밋: A `0f1d12e` / B `f1c6713` / C `27771cd` / D `da78495` / E(본 커밋).
> 최종 게이트: lint ✅ typecheck(mobile+desktop) ✅ bun test 508 pass ✅ cargo test ✅ clippy -D warnings ✅

## 개요

안정화 라운드 1(2026-08-19 완료) 이후 리서치에서 발견한 차기 결함을 수정한다: 모바일 BYOK 키 하이드레이션 레이스, 데스크톱 다운로드 취소/재개/크기검증 부재, 스텁 엔진의 성공 반환(데이터 오염 경로), 무시되는 추론 파라미터, 레거시 평문 키 잔존, UI 에러 무음/연타, 셋다운 부재, dead code, 문서 드리프트. 각 Phase는 독립 검증 가능하며 Rust 선행→프론트 소비 순서를 지킨다.

## 현재 상태 분석

- 게이트는 라운드 1 완료 상태(lint/typecheck/bun test 501/cargo test/clippy ✅), 트리 클린, 15커밋 미푸시
- `byok.store.ts:55-75` — 하이드레이션이 module import 시 fire-and-forget이고 catch가 silent. 레이스 윈도우: (a) `executors.ts:162-172` 동기 `getApiKey()`가 null → 채팅 거부, (b) `registry.ts:60-70` BYOK 타깃 미등록 → `resolveEffectiveTarget`이 STUB으로 폴백해 스텁 응답이 저장될 수 있음(이 경로가 더 위험)
- `download.rs:59-176` — tmp 패턴은 있으나 취소 커맨드 없음, `File::create` 항상 truncate(재개 없음), 스트림 조기 종료 시 수신 바이트 검증 없이 rename(`:165`). `sync_download_status`(`:258-285`)는 파일 존재만으로 ready 판정
- `engine.rs` 스텁(`not(feature="llm")`) — `completion`/`completion_stream`이 `Ok("[stub] ...")` 반환(`:290-323`), `embedding`이 `Ok(vec![0.0;768])`(`:325-332`), 프리뷰 슬라이싱이 바이트 단위라 한국어 panic(`:295,313`)
- 실엔진(`feature="llm"`) — `LlamaContextParams::default()`로 n_ctx 기본값 사용(`:55,140`), 샘플러 `dist_default_seed()` 고정(`:87-90` TODO), `CompletionRequest.temperature`(`models.rs:58`)이 `state.rs:278,334`에서 폐기
- `Cargo.toml:29-31` `default = []` — `llm` feature 활성화 지점이 스크립트/문서 어디에도 없음. `apps/desktop/package.json:46` `tauri:build: "tauri build"`에 feature 플래그 없음
- `settings-storage.ts:82-109` — 마이그레이션이 V1 sanitized를 쓰지만 `LEGACY_SETTINGS_KEY`(`:2`)를 removeItem하지 않아 평문 키 잔존
- `ReviewDeck.tsx:30-46` — runAction 가드는 있으나 `saving`이 `ReviewCard`로 전달되지 않아 버튼 연타 가능. `ReviewCard.tsx:91-110` 버튼에 disabled 없음
- `use-model-management.ts:143-201` — 4개 뮤테이션이 onSuccess 무효화만 있고 에러 노출 없음 (react-query의 mutation.isError/error는 이미 사용 가능 — 소비 UI만 추가하면 됨)
- `main.rs:74` — `.run()` 직선, ExitRequested 핸들러 없음
- `byok-provider.ts:41-64` 등 — `buildBody`가 `max_tokens:150, temperature:0.3` 하드코딩, `buildStreamBody`도 1024/0.7 고정. 스트리밍 `!response.ok` → `return null`(`:397`)로 429도 조용히 재요청
- dead code: `LLMSection.tsx`(참조 0건), `ScreenshotStub.tsx`/`ShareStub.tsx`(참조 0건, `CaptureChannelForm.tsx`는 `ScreenshotForm`/`HighlightForm` 사용)
- 기존 테스트 인프라: `apps/desktop/src-tauri/tests/download_integrity.rs`(라운드 1 산출), `apps/desktop/src/lib/settings-storage.test.ts`, `apps/mobile/src/features/settings/byokSettings.test.ts`, `apps/mobile/src/features/ai/targets/executors.test.ts` — 전부 확장 가능

### 주요 발견사항:
- 라운드 1의 `.part`+크기검증은 **모바일에만** 적용됨 — 데스크톱은 tmp는 있지만 최종 검증 없음
- `llm` feature cfg 블록은 기본 게이트(`cargo test/clippy`)에서 **컴파일되지 않음** — 실엔진 변경은 `cargo check --features llm` 별도 필요(선택 게이트, cmake 의존)
- `llm_stream_events.rs` 테스트는 `glimpse_bridge::emit_llm_token`을 직접 호출 — 스텁 `Err` 전환이 기존 Rust 테스트를 깨지 않음(확인 완료)
- BYOK 레이스의 진짜 위험은 거부(`executors`)보다 **조용한 stub 폴백**(`registry`) — 사용자가 BYOK를 선택했는데 스텁 응답이 저장됨

## 목표 상태

- 모바일 BYOK: 하이드레이션이 부트스트랩 게이트에 편입되고 executors가 이를 await — 레이스 윈도우에서 거부/스텁 폴백 없음, 복원 실패는 로깅
- 데스크톱 다운로드: 취소 커맨드(플래그 기반), tmp 존재 시 Range 재개(206 아닌 경우 폴백 재시작), 완료 시 수신 바이트 vs 기대 크기 검증, primary dir 파일의 크기 기반 ready 판정, 종료 시 진행 중 다운로드 취소 플래그 설정
- 스텁 엔진: completion/embedding이 `Err` 반환(스텁 텍스트/영벡터가 데이터로 저장되는 경로 차단), 프리뷰 UTF-8 안전
- 실엔진: `n_ctx`를 레지스트리 context_length에서 전달, temperature(기본값 폴백)가 샘플러에 반영, `llm` feature 활성화 방침을 빌드 스크립트에 명시
- 레거시 localStorage 키 마이그레이션 후 삭제, ReviewCard 저장 중 disabled, 모델 관리 뮤테이션 에러 UI 노출, BYOK 요청 파라미터 전달 + 스트리밍 401/403/429 에러 매핑, `loaded_model_id` 오염 제거, dead code 삭제, 문서 5건 정정
- 게이트 전 통과: `bun run lint` && `bun run typecheck` && `bun test` && `cargo test --workspace` && `cargo clippy --workspace -- -D warnings`

## 범위 제한 (하지 않을 것)

- `git push`·eas.json 자격증명·GUI 수동 검증 (사용자 액션)
- 모바일 JSI 네이티브 이벤트 배선, rkyvV2, contractHash, 뮤텍스 오염(rustra 측)
- `llm` feature를 Cargo default로 전환 — 빌드 스크립트 명시만(전환은 빌드 검증 후 별도 결정)
- Sentry/CI/i18n/OCR/하이라이트 채널 등 제품 로드맵 항목
- 모바일 다운로드 파이프라인 재작업(라운드 1 완료)
- 토스트 인프라 도입 — 기존 인라인 에러/상태 패턴 재사용
- 원격 push 하지 않음(로컬 커밋만)

## 구현 접근 방식

Phase A(모바일 TS, 가장 작음) → B(데스크톱 Rust 다운로드+셋다운) → C(Rust 엔진/파라미터) → D(데스크톱 TS 잔여+dead code) → E(문서+최종 게이트). Rust 변경이 프론트 소비를 수반하는 B는 Rust 먼저(커맨드/이벤트) → 프론트(훅/UI) 순서. 각 Phase 끝에 게이트를 돌려 회귀를 즉시 포착한다.

---

## Phase A: 모바일 BYOK 하이드레이션 레이스

### 개요
SecureStore 키 복원을 기다리는 게이트를 만들어 콜드스타트 직후 거부/스텁 폴백을 제거하고, 복원 실패를 로깅한다.

### 필요한 변경사항:

#### 1. 하이드레이션 프로미스 메모이제이션 + 에러 로깅
**파일**: `apps/mobile/src/stores/settings/byok.store.ts`
**변경사항**:
```ts
let hydrationPromise: Promise<void> | null = null;

/** SecureStore 키 복원이 완료될 때까지 기다린다(실패해도 resolve — 스토어는 초기 상태 유지). */
export function ensureBYOKHydrated(): Promise<void> {
  hydrationPromise ??= hydrateBYOKSecureKey();
  return hydrationPromise;
}

// 기존 module import 시 트리거 유지:
void ensureBYOKHydrated();
```
catch 블록(`:69-71`)에 `logger.error('byok hydration failed', error)` 추가(스토어 파일에 logger import — `@/src/utils/logger` 기존 패턴).

#### 2. executors에서 하이드레이션 await
**파일**: `apps/mobile/src/features/ai/targets/executors.ts`
**변경사항**: `executeBYOKChatTarget`(`:311` 근방)과 `executeBYOKChatTargetEffect`(`:467` 근방) 진입부에 `await ensureBYOKHydrated();` 추가(import는 `@/src/stores/settings/byok.store`). BYOK 경로에만 필요 — 타깃이 이미 BYOK로 결정된 뒤이므로 지연 최소.

#### 3. 부트스트랩 게이트 편입 (스텁 폴백 차단)
**파일**: `apps/mobile/app/_layout.tsx` (코어 초기화 게이트가 있는 위치 — 구현 시 확인)
**변경사항**: 기존 앱 초기화 게이트(스플래시/준비 상태)에서 `ensureBYOKHydrated()`를 `Promise.all`에 병렬 편입. 게이트가 이미 코어 초기화 대기 중이므로 지연 추가 없음(SecureStore 읽기 수 ms).

#### 4. 회귀 테스트
**파일**: `apps/mobile/src/features/settings/byokSettings.test.ts` 또는 신규 `byok.store.test.ts`
**변경사항**:
- `ensureBYOKHydrated` 두 번 호출 시 hydrateBYOKSecureKey 1회만 실행(메모이제이션)
- hydration 완료 전 `getApiKey()` null → 완료 후 키 설정됨(기존 hydrate 로직 mock)
- executors 테스트(`executors.test.ts`): BYOK 실행 시 ensureBYOKHydrated가 resolve된 뒤 config 조회 발생(호출 순서 검증)

### 성공 기준:

#### 자동 검증:
- [ ] `bun test` 신규 케이스 통과
- [ ] `bun run typecheck` 통과

---

## Phase B: 데스크톱 다운로드 무결성 — 취소/재개/검증 + 셋다운

### 개요
취소 커맨드, Range 재개, 최종 크기 검증, primary dir ready 판정 강화, 종료 시 취소 플래그 설정.

### 필요한 변경사항:

#### 1. 취소 인프라 (Rust state)
**파일**: `apps/desktop/src-tauri/src/state.rs`
**변경사항**: `DesktopRuntimeStateInner`에 `download_cancellations: std::sync::Mutex<std::collections::HashSet<String>>` 추가. 메서드: `request_download_cancel(&self, model_id)` — 플래그 삽입; `is_download_cancelled(&self, model_id) -> bool`; `clear_download_cancel(&self, model_id)` — 다운로드 시작/종료 시 정리. `Clone` 파생 유지 위해 `Arc<Mutex<...>>` 또는 derive 구조 확인(기존 필드가 `Mutex`+`Clone`을 어떻게 처리하는지 `from_defaults`와 대조해 동일 패턴 적용).

#### 2. 취소 커맨드
**파일**: `apps/desktop/src-tauri/src/commands.rs`, `main.rs`(generate_handler 등록)
**변경사항**: `#[tauri::command] pub fn cancel_download(model_id: String, state: ...) -> Result<(), String>` — `request_download_cancel` 호출. 취소는 비동기적으로 다운로드 루프에서 감지된다(응답은 요청 접수만).

#### 3. 다운로드 루프: 취소 감지 + Range 재개 + 크기 검증
**파일**: `apps/desktop/src-tauri/src/download.rs`
**변경사항**:
- `download_model` 시그니처에 취소 확인 클로저/참조 전달(`state: &DesktopRuntimeStateInner` 직접 또는 `is_cancelled: &dyn Fn(&str) -> bool` — commands.rs에서 조립. 테스트 용이성 위해 클로저 권장)
- **재개**: tmp 존재 시 그 크기 `offset`을 읽고 `Range: bytes={offset}-` 헤더로 요청. 응답이 206이면 `OpenOptions::append(true)`로 이어쓰고 `bytes_received = offset`, `total_bytes = offset + content_length`. 200이면(서버 미지원) 기존처럼 truncate 재시작. tmp가 최종 크기와 같거나 크면(이미 완료) 바로 검증 단계로
- **취소 감지**: chunk 루프 매 반복(또는 N chunk마다) `is_cancelled(model_id)` 확인 시 `fail("Download cancelled")` — 단 취소는 사용자 요청이므로 상태를 `download_failed`가 아닌 `not_downloaded`로 복구할지 결정: `mark_model_download_failed` 재사용 시 에러 메시지에 "cancelled" 명시(프론트가 구분 가능). 구현 단순성 위해 `mark_model_download_failed(model_id, "Download cancelled by user")` 사용
- **크기 검증**: 스트림 종료 후 `total_bytes > 0 && bytes_received != total_bytes`면 `fail(format!("Size mismatch: received {bytes_received} of {total_bytes} bytes"))` — rename 전에 tmp 삭제됨(fail 클로저). 참고: 라운드 1 모바일 구현은 ±1KB 허용 — 데스크톱도 동일 허용(`(bytes_received as i64 - total_bytes as i64).abs() > 1024`)
- **시작 시 플래그 정리**: 다운로드 시작 시 `clear_download_cancel`

#### 4. primary dir ready 판정 크기 검증
**파일**: `apps/desktop/src-tauri/src/download.rs` `sync_download_status`
**변경사항**: 매칭된 경로가 `models_dir()` 하위(우리 다운로드 산출물)인 경우에만, `model.size > 0`이고 파일 실측 크기가 `model.size`와 1% 초과 편차면 ready 처리하지 않고 유지(`not_downloaded`). 외부 dir(LM Studio 등) 파일은 기대 크기를 알 수 없으므로 기존 동작 유지.

#### 5. 셋다운 핸들러
**파일**: `apps/desktop/src-tauri/src/main.rs`
**변경사항**: `.run(tauri::generate_context!())`를 `.build(...)` + `.run(|app, event| ...)` 패턴으로 전환(Tauri 2 `RunEvent`). `RunEvent::ExitRequested`에서: 진행 중 다운로드 전체에 취소 플래그 설정(`state.list_downloading_model_ids()` 같은 헬퍼 또는 models 락에서 status=="downloading" 스캔) + 엔진 언로드. SQLite는 프로세스 종료 시 OS 정리에 맡기되 해당 방침 주석 명시.

#### 6. 프론트: 취소 훅 + UI 배선
**파일**: `apps/desktop/src/features/local-llm/use-model-management.ts`, 모델 관리 UI(진행 표시 컴포넌트 — `ModelManagerSection.tsx` 등, 구현 시 확인)
**변경사항**: `useCancelDownload` 뮤테이션(`invoke('cancel_download', { modelId })` + onSuccess 쿼리 무효화). 진행 중 항목에 취소 버튼 추가(기존 진행 UI 패턴 재사용, DESIGN.md 토큰 준수). `download-failed` 이벤트의 "cancelled" 메시지는 기존 failures 맵으로 표시됨(추가 작업 불필요).

#### 7. Rust 테스트
**파일**: `apps/desktop/src-tauri/tests/download_integrity.rs`(확장)
**변경사항**:
- 취소: `is_cancelled`가 true 반환 시 download_model이 Err + tmp 정리(로컬 mock 서버 또는 클로저 주입 구조로 검증 — 실제 HTTP는 기존 테스트 패턴 확인 후 동일하게)
- 크기 검증: 스트림이 기대보다 짧게 종료되는 시나리오 → Err "Size mismatch"
- sync 크기 검증: primary dir에 model.size와 다른 크기의 파일 → ready 아님
- state 가드: request_download_cancel/clear 라운드트립

### 성공 기준:

#### 자동 검증:
- [ ] `cargo test --workspace` 통과(신규 케이스 포함)
- [ ] `cargo clippy --workspace -- -D warnings` 통과
- [ ] `bun test` + `bun run typecheck` 통프(훅/UI 배선)

#### 수동 검증:
- [ ] 데스크톱에서 대용량 모델 다운로드 중 취소 → 진행 멈춤 + 실패 상태 표시(네트워크 차단 시나리오는 기존 라운드 1 수동 항목과 동일 방식)

---

## Phase C: 스텁 엔진 Err 전환 + llm feature 방침 + 추론 파라미터

### 개요
스텁의 성공 반환을 차단하고, 실엔진에 n_ctx/temperature를 전달하며, 빌드 스크립트에 llm feature를 명시한다.

### 필요한 변경사항:

#### 1. 스텁 completion/embedding → Err
**파일**: `apps/desktop/src-tauri/src/llm/engine.rs:290-332`
**변경사항**: 스텁 `completion`/`completion_stream`/`embedding`의 본문을 `Err("LLM inference unavailable: this build was compiled without the `llm` feature. Rebuild with --features llm for real inference.".to_string())`로 교체. 프리뷰 포함 시 UTF-8 안전 슬라이싱(`prompt.chars().take(50).collect::<String>()`) 사용해 `:295,313` panic 경로 제거. `load_model`/`unload_model`/`is_loaded`는 유지(UI 상태 흐름 유지).
- 프론트 영향 확인: `local-llm-provider.ts` complete가 Err를 reject로 받아 기존 에러 경로(AI_PROVIDER_UNAVAILABLE 매핑)로 흐름 — 스텁 빌드에서 local-llm 선택 시 명확한 에러 표시. 이것이 의도(데이터 오염 차단).

#### 2. n_ctx 전달
**파일**: `apps/desktop/src-tauri/src/llm/engine.rs`(llm 블록), `state.rs`
**변경사항**: `LlmEngine`에 `context_length: u32` 필드(기본 2048). `load_model(&mut self, path: &str, context_length: u32)` 시그니처 확장 — `LlamaContextParams`에 `n_ctx` 설정(llama-cpp-2 API의 정확한 세터명은 구현 시 크레이트 문서 확인 — `n_ctx(u32)` 빌더 메서드 예상). `completion`/`completion_stream`의 `LlamaContextParams::default()`(`:55,140`)를 엔진 필드 기반 값으로 교체. `state.rs load_model`(`:163-217`)은 모델 레코드의 `context_length`를 전달.

#### 3. temperature 샘플러 반영
**파일**: `apps/desktop/src-tauri/src/llm/engine.rs`, `state.rs:278,334`
**변경사항**: `completion`/`completion_stream` 시그니처에 `temperature: Option<f32>` 추가. `LlamaSampler::chain_simple(vec![dist_default_seed()])`(`:87-90`)을 temperature 적용 샘플러로 교체(llama-cpp-2 샘플링 API의 temperature 체인 구성은 구현 시 확인 — `LlamaSampler::temp(...)` 계열 예상). TODO 주석(`:88`) 제거. `state.rs`의 `run_completion`/`run_completion_stream`이 `request.temperature`를 전달.
- 주의: 이 블록은 `llm` feature에서만 컴파일 — 기본 게이트가 컴파일하지 않으므로 아래 5의 선택 게이트로 검증.

#### 4. loaded_model_id 오염 제거
**파일**: `apps/desktop/src-tauri/src/state.rs:262-263,318-319`
**변경사항**: `run_completion`/`run_completion_stream`의 `health.loaded_model_id = Some(request.model_id.clone())` 라인 삭제 — loaded_model_id는 `load_model`에서 설정된 실제 로드 모델을 반영.

#### 5. llm feature 빌드 방침 명시
**파일**: `apps/desktop/package.json`, `README.md`(데스크톱 빌드 섹션)
**변경사항**: 스크립트에 `"tauri:build:llm": "tauri build --features llm"` 추가(또는 `-- --features` — tauri CLI 인자 전달 형식 확인 후). 기존 `tauri:build`는 유지(스텁 빌드 = 개발/CI 빠른 빌드). README에 두 빌드 경로와 차이(실추론 vs 스텁 에러) 한 단락 문서화.

#### 6. 테스트
**파일**: `apps/desktop/src-tauri/tests/` 또는 유닛
**변경사항**: 스텁 Err 반환은 `cargo test`(기본 feature)로 직접 검증 — `LlmEngine::new().completion(...)`이 Err임을 확인하는 유닛 테스트(engine 모듈 `#[cfg(test)]`, 스텁 블록 내). n_ctx/temperature는 feature 게이트 상 선택 검증으로.

### 성공 기준:

#### 자동 검증:
- [ ] `cargo test --workspace` 통과(스텁 Err 유닛 테스트 포함)
- [ ] `cargo clippy --workspace -- -D warnings` 통과
- [ ] 선택: `cargo check -p glimpse-desktop --features llm` 컴파일 확인(cmake/C++ 툴체인 필요 — 실패 시 결과 명시 보고)

---

## Phase D: 데스크톱 잔여 — 키 잔존/연타/에러 노출/BYOK 파라미터/dead code

### 개요
마이그레이션 후 평문 키 삭제, ReviewCard 비활성화, 뮤테이션 에러 UI, BYOK 파라미터 전달+스트리밍 에러 매핑, dead code 제거.

### 필요한 변경사항:

#### 1. 레거시 localStorage 키 삭제
**파일**: `apps/desktop/src/lib/settings-storage.ts:97-105`
**변경사항**: `migrateLegacyApiKey` 성공 경로에서 V1 sanitized 저장 후 `localStorage.removeItem(LEGACY_SETTINGS_KEY)` 추가. 웹 프리뷰(비 Tauri)는 종전대로 LEGACY 사용 가능하므로 Tauri 런타임 분기 내부에 배치(이미 `if (!isTauriRuntime()) return;` 가드 내부라 자동 충족).
**테스트**: `apps/desktop/src/lib/settings-storage.test.ts` 확장 — 마이그레이션 후 LEGACY 키 부재 검증(mock invoke 성공 케이스).

#### 2. ReviewCard 저장 중 비활성화
**파일**: `apps/desktop/src/components/review/ReviewCard.tsx`, `ReviewDeck.tsx`
**변경사항**: `ReviewCardProps`에 `saving?: boolean` 추가, 두 Button(`:92-109`)에 `disabled={saving}`. `ReviewDeck`(`:98-102`)이 `saving={saving}` 전달. 버튼 시각 피드백은 기존 Button variant/disabled 스타일 재사용.

#### 3. 모델 관리 뮤테이션 에러 노출
**파일**: 모델 관리 UI 컴포넌트(`useDownloadModel`/`useLoadModel`/`useUnloadModel`/`useDeleteModel` 소비 위치 — 구현 시 확인, `ModelManagerSection.tsx` 등)
**변경사항**: react-query 뮤테이션의 내장 `isError`/`error` 상태를 기존 인라인 에러 패턴(`ReviewDeck`의 에러 배너 스타일)으로 렌더. 훅 자체 변경 불필요 — UI 소비만 추가. 최소 범위: 로드/삭제/언로드 실패 시 항목 근처 1줄 에러 텍스트.

#### 4. BYOK 요청 파라미터 전달
**파일**: `apps/desktop/src/features/ai/providers/byok-provider.ts:34-160`
**변경사항**: `APIConfig.buildBody` 시그니처를 `(prompt, model, systemPrompt, opts?: { maxTokens?: number; temperature?: number })`로 확장 — 기본값 150/0.3 유지, `complete` 호출부에서 `request.maxTokens`/`request.temperature` 전달. `buildStreamBody`도 `(messages, model, opts?)`로 확장(기본 1024/0.7). 5개 provider 전부 동일 패턴 적용(anthropic/google 본문 키 차이는 기존 구조 유지).

#### 5. BYOK 스트리밍 에러 매핑
**파일**: `apps/desktop/src/features/ai/providers/byok-provider.ts:396-398`
**변경사항**: 스트리밍 `!response.ok`에서 401/403/429면 `throwProviderError`(complete와 동일 매핑) — 레이트 리밋 2배 소모 차단. 기타 상태는 기존 `return null`(비스트리밍 폴백) 유지 — 이는 설계된 폴백이므로.
**테스트**: 기존 byok-provider 테스트 파일 확인 후 429 스트리밍 케이스 추가(없으면 신규).

#### 6. dead code 제거
**파일**:
- `apps/desktop/src/components/settings/LLMSection.tsx` 삭제(참조 0건 확인됨)
- `apps/mobile/src/components/capture/ScreenshotStub.tsx`, `ShareStub.tsx` 삭제
- `apps/mobile/src/components/capture/index.ts:19-20` 재export 라인 제거
**변경사항**: 삭제 후 `bun run lint`/typecheck로 미참조 확인. (스펙의 "placeholder 유지" 결정은 참조 있는 UX 기준이었으나 실제 참조 0건 — 리서치 확정 기준으로 삭제)

### 성공 기준:

#### 자동 검증:
- [ ] `bun test` 통과(settings-storage 마이그레이션 케이스 포함)
- [ ] `bun run typecheck` + `bun run lint` 통과
- [ ] grep `LLMSection\|ScreenshotStub\|ShareStub` 소스 참조 0건

---

## Phase E: 문서 정리 + 최종 게이트

### 개요
설계문서 드리프트 정정, 상태 라벨 폐쇄, 계획 완료 기록.

### 필요한 변경사항:

#### 1. rustra 설계문서 정정
**파일**: `docs/plans/2026-08-16-rustra-integration-design.md`
**변경사항**:
- `:83` `desktop-core-client.ts` 참조를 현재 구조(`rustra_dispatch`/bridge)로 수정
- `:103` 리스크 표 뮤텍스 "3주차 재평가" → "미해결 후속 — 라운드 1에서 Tauri 커맨드 `.expect` 제거, 엔진 자체 오염 회복은 rustra 측 기능 필요"로 갱신
- `:209` "### 4주차 결과" → `##` 규격 통일

#### 2. 방치 계획문서 라벨 폐쇄
**파일**: `docs/plans/2026-02-17-ai-provider-sdk-integration.md`(Draft → Complete), `docs/plans/2026-03-26-effect-migration.md`(상태 라벨 추가 — Complete)
**변경사항**: 상태 라벨만 수정(내용 변경 없음).

#### 3. 브릿지 가이드 서술 정정
**파일**: `apps/mobile/docs/rustra-bridge-development.md:40-42`
**변경사항**: 네이티브 `subscribeEvent` 후속 후보 서술에 상류 준비 완료 상태 반영(rustra main에 JSI 이벤트 콜백 머지됨, Glimpse C++ 구현이 남은 단계).

#### 4. 완료 기록 + 최종 게이트
**파일**: `thoughts/shared/plans/2026-08-19_stabilization-round-2.md`(본 문서 상단 Status), `thoughts/shared/specs/2026-08-19_stabilization-round-2.md`(status)
**변경사항**: Phase 완료 커밋 해시 기록. 최종 게이트 전체 실행: `bun run lint` && `bun run typecheck` && `bun test` && `cargo test --workspace` && `cargo clippy --workspace -- -D warnings` — 결과를 계획 문서에 기록.

### 성공 기준:

#### 자동 검증:
- [ ] 최종 게이트 5종 전부 통과
- [ ] `git status` 클린, 커밋이 Phase별 단일 목적으로 분리됨

---

## 테스트 전략

### 단위 테스트:
- BYOK 하이드레이션 메모이제이션/순서(A), 스텁 Err(C), settings-storage 마이그레이션 키 삭제(D), BYOK 스트리밍 429 매핑(D)

### 통합 테스트:
- Rust download_integrity: 취소/크기 불일치/sync 크기 검증(B)
- executors: 하이드레이션 await 후 config 조회(A)

### 수동 테스트 단계:
1. 모바일 콜드스타트 직후 BYOK 채팅 전송 — 거부 없이 정상 실행(시뮬레이터에서 반복)
2. 데스크톱 모델 다운로드 중 취소 버튼 — 진행 정지 + 실패 상태
3. 데스크톱 스텁 빌드에서 local-llm 선택 시 명확한 에러 표시(스텁 문자열 아님)
4. 데스크톱 BYOK 키 저장 후 재시작 — DevTools localStorage에 LEGACY 키 부재

## 성능 고려사항

- Range 재개로 수 GB 재다운로드 회피 — 취소/네트워크 끊김 후 재시도 비용 대폭 감소
- 취소 플래그 확인은 chunk 루프에서 HashSet 조회(락 단기 점유) — 오버헤드 미미
- 하이드레이션 게이트는 기존 코어 초기화 대기에 병렬 병합 — 부팅 지연 추가 없음

## 마이그레이션 참고사항

- 레거시 localStorage 키 삭제는 이관 성공 후에만 수행 — 기존 "이관 실패 시 재시도" 보장 유지
- 스텁 Err 전환 후 스텁 빌드 사용자(개발 빌드)는 local-llm 경로에서 에러를 보게 됨 — 의도된 동작이며 README에 명시
- `download_model` 시그니처 변경(취소 클로저)은 내부 API — commands.rs 호출부만 영향

## 참고 자료

- SPEC: `thoughts/shared/specs/2026-08-19_stabilization-round-2.md`
- 리서치: `thoughts/shared/research/2026-08-19_00-37-04_remaining-work-stabilization-audit.md`
- 모바일 대응 패턴: `apps/mobile/src/features/ai/model-manager/model-downloader.ts`(.part+크기검증), `local-llm.download.ts`(취소)
- 라운드 1 계획(패턴 참조): `thoughts/shared/plans/2026-08-18_stabilization-program.md`
