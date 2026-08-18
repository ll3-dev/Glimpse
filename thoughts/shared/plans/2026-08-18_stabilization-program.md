# Glimpse 안정화 프로그램 구현 계획

## 개요

2026-08-18 전수 조사에서 확인된 P0~P3 결함(크래시 요인, 다운로드 무결성, 상태 오염, 보안, 문서 드리프트)을 6개 Phase(A~F)로 수정하고, 기존 106파일 WIP를 관심사별 커밋으로 정리한다. 각 Phase는 독립적으로 검증 가능하며 Phase 0에서 WIP를 먼저 확정 커밋해 베이스를 고정한다.

## 현재 상태 분석

- 게이트 통과(lint/typecheck/bun test 482 pass) — 단 런타임/에러 경로 결함은 게이트 밖
- `app/+error.tsx`가 expo-router 55에서 라우트 파싱 단계 크래시 유발(재현 완료, `getRoutesCore.js:509-513` throw)
- 모바일 다운로더: 취소가 싱글턴/신규 인스턴스 불일치로 무효(`local-llm.download.ts:51` vs `:96`), 부분 파일 완성본 취급(`model-downloader.ts:69-77`)
- 데스크톱 Rust: 다운로드 취소/실패 이벤트/동시성 가드 부재, `queue_depth` 잔존, `load_model` status 선행 설정
- 데스크톱 BYOK 키: webview localStorage 평문(`settings-storage.ts:48`)
- 3곳 모델 레지스트리 중복(Rust 17개 / TS `DEFAULT_MODELS` 4개 / shared 17개) — TS 4개 버전은 shared로 대체 가능

### 주요 발견사항:
- `initialize-core-client.native.ts:72-85` — `initializationPromise` 캐시가 실패 시 재셋 안 됨. 수정은 promise 캐시에 `.catch`에서 null 처리 추가로 최소화
- `useChat.abortAndSave`(useChat.ts:116-132)와 `generateAssistantReply`의 저장 경로(chatGeneration.ts:60-64)가 경쟁 — generation ref 가드로 단일 저장 보장
- AndroidManifest SEND intent-filter 3회 중복 확인(AndroidManifest.xml 37-56), 스킴 `ll3.kr`(manifest) vs `glimpse`(app.json:8) 불일치 — 네이티브 전체가 `ll3.kr` 사용 중이므로 app.json을 `ll3.kr`로 통일
- `eas.json`이 루트와 `apps/mobile/`에 동일 내용으로 2개 존재 — 루트 것은 미사용 중복이므로 삭제
- `failLocalLLMDownloadSnapshot`(local-llm.ts:229-239)이 `downloadingModelId` null이면 무시 → 배너 재시도는 `lastCompletedModelId`가 아닌 실패 모델 ID 보존 필요. `availableModels`에서 id로 ModelInfo 복원 가능
- desktop `stream_completion`(commands.rs:112-141)은 이미 rustra 경로 — 수정 시 이 구조 유지
- 루트 `Cargo.lock`에 llama-cpp-2 rev `bed81ad4...` 고정 — Cargo.toml에 `rev=` 명시로 재현성 이중 잠금
- 라벨링 `run-foreground-labeling.ts`는 이미 전체 try/catch 있음 → `Promise.all`→`allSettled` + per-item `labelError`만 추가
- `toast` 인프라가 모바일에 없음(스토어 grep 0건) → pending-share 실패 피드백은 기존 `logger.error` + 재시도 유지 + 최소한의 상태 노출 범위로 스코프 조정

## 목표 상태

- 모든 Phase 완료 후: 앱 부팅 크래시 요인 제거, 다운로드 상태 수렴 보장, 실패 경로 상태 오염 제거, API 키 키체인 저장, 문서-코드 정합, 게이트 전부 통과, 커밋 트리 클린
- 검증: `bun run lint` && `bun run typecheck` && `bun test` && `cargo test --workspace` && `cargo clippy --workspace -- -D warnings`

## 범위 제한 (하지 않을 것)

- eas.json submit 실자격증명 / Sentry 도입 / GUI 수동 검증 / rustra 외부 레포 조작 / 모바일 JSI 네이티브 이벤트 배선(후속 후보 유지) / rkyvV2·contractHash / i18n / 제품 로드맵 열린 질문 / `llm` feature 기본 활성화 / placeholder 화면 제거
- 원격 push는 하지 않음(로컬 커밋만)

## 구현 접근 방식

Phase 0에서 WIP를 관심사별로 분리 커밋해 "이미 완성된 작업"과 "이번 수정"을 구분한다. 이후 Phase A→F 순으로, 각 Phase 끝에 게이트를 돌려 회귀를 즉시 포착한다. Rust와 TS 수정이 섞인 Phase(B, C)는 Rust 먼저(이벤트 계약 추가 → 프론트 소비) 순서를 지킨다.

---

## Phase 0: WIP 커밋 정리 (베이스 고정)

### 개요
106파일 미커밋 변경을 관심사별 커밋으로 분리. 본 수정 작업의 베이스를 확정한다.

### 필요한 변경사항:

#### 1. 커밋 분할 계획에 따라 stage/commit
**파일**: 작업 트리 전체
**변경사항**: 다음 순서로 분리 커밋(각 커밋 후 게이트 스모크):
1. `feat(bridge): 모델 다운로드 이벤트 rustra 전환` — packages/bridge-rust, apps/desktop/src-tauri(download.rs/events 관련), apps/desktop 프론트 리스너(desktop-llm-service.ts, use-model-management.ts, local-llm-provider.ts), llm_stream_events.rs, docs/plans 설계문서
2. `feat(mobile): 스트리밍 이벤트 계약 정렬(stream-events)` — apps/mobile stream-events.ts(+test), llama-service.factory.ts, llama-service.ts/types/test, modules/rustra-jsi, rustra-bridge-development.md
3. `feat(ui): 디자인 시스템 토큰 정착` — DESIGN.md, AGENTS.md, packages/ui 전체, globals.css, 양 플랫폼 UI 컴포넌트 스타일 변경분
4. `feat(mobile): 에러 인프라 + SecureStore 마이그레이션` — ErrorBoundary, SuspenseFallback, secure-storage.ts, byok.store.ts, expo-clipboard/expo-secure-store 의존성, bun.lock, bunfig.toml, chat 다이얼로그 분리 파일들
5. `chore(mobile): 배포 준비` — app.json, eas.json(apps/mobile), assets/ 전체. **루트 eas.json은 중복이므로 삭제**
6. 잔여(shared getMobileModels, +error.tsx 등)는 Phase A에서 처리하므로 제외하고 나머지를 `chore: WIP 잔여 정리`로 커밋

### 성공 기준:

#### 자동 검증:
- [ ] `git status` 클린(Phase A에서 다룰 `+error.tsx` 포함 모든 파일)
- [ ] 각 커밋 후 `bun test` 통과
- [ ] 커밋 메시지가 단일 목적(커밋별 파일이 단일 관심사)

---

## Phase A: P0 크래시·재시도·취소 수정

### 개요
시작 크래시 요인 제거, 코어 재시도 무효 수정, 다운로드 취소 불능 수정.

### 필요한 변경사항:

#### 1. `+error.tsx` 규약 이관
**파일**: `apps/mobile/app/+error.tsx`(삭제), `apps/mobile/app/_layout.tsx`
**변경사항**: `+error.tsx` 삭제. expo-router 규약상 라우트 에러 UI는 이미 루트 `ErrorBoundary`(_layout.tsx:128)가 담당하므로 `GlobalRouteError`의 기능(재시도/홈 이동/DEV 스택 표시)이 이미 ErrorBoundary.tsx:74-83에 존재 → 중복 제거만으로 해결. 파일 삭제 후 라우트 파싱 정상 복귀.

#### 2. 라우트 컨벤션 회귀 테스트
**파일**: `apps/mobile/src/test/route-conventions.test.ts`(신규)
**변경사항**: app/ 트리를 재귀 순회해 파일명이 `+`로 시작하면서 허용 목록(`+not-found`, `+html`, `+api`, `+middleware`, `+native-intent`)에 없으면 fail.

#### 3. 코어 초기화 재시도 수정
**파일**: `apps/mobile/src/features/core/initialize-core-client.native.ts`
**변경사항**: promise 캐시 실패 시 재셋:
```ts
initializationPromise = (async () => { ... })();
initializationPromise.catch(() => { initializationPromise = null; });
return initializationPromise;
```
(단, `.catch` 체인은 원본 프로미스의 거부를 삼키지 않도록 분리 — 반환은 원본, 재셋만 부수효과)
동일 로직의 `.web.ts`/기본 변형이 있으면 함께 적용.

#### 4. 재시도 회귀 테스트
**파일**: `apps/mobile/src/features/core/initialize-core-client.test.ts`(확장)
**변경사항**: initialize 실패 → 재호출 시 새 초기화 시도가 발생함을 mock으로 검증(기존 initialize-core-client.test.ts가 존재하므로 케이스 추가).

#### 5. 다운로더 인스턴스 일치화
**파일**: `apps/mobile/src/features/settings/local-llm.download.ts`
**변경사항**: `const downloader = new ModelDownloader()`(51행) 제거 → 기존 export 싱글턴 `modelDownloader` 사용. 이렇게 하면 `cancelDownload`(96행)가 동일 인스턴스의 `activeTask`에 도달해 실제 fetch 취소가 일어남.

#### 6. 취소 회귀 테스트
**파일**: `apps/mobile/src/features/settings/local-llm.download.test.ts`(신규)
**변경사항**: downloadLocalModel 진행 중 cancelLocalModelDownload 호출 시 싱글턴의 cancel이 호출됨을 mock으로 검증.

### 성공 기준:

#### 자동 검증:
- [ ] `bun test` 신규 3개 테스트 파일/케이스 통과
- [ ] app/ 트리에 무효 `+` 라우트 없음(테스트가 보장)

#### 수동 검증:
- [ ] `bun run ios`(시뮬레이터) 부팅 시 라우트 크래시 없음

---

## Phase B: 다운로드 무결성 (모바일 + 데스크톱)

### 개요
부분 파일 완성본 취급 차단, 데스크톱 실패 이벤트·쓰로틀·동시성 가드, stale tmp 정리.

### 필요한 변경사항:

#### 1. 모바일 `.part` 패턴 + 크기 검증
**파일**: `apps/mobile/src/features/ai/model-manager/model-downloader.ts`
**변경사항**:
- 다운로드는 `{filename}.gguf.part`로 기록 → 성공 시 `expectedSize`와 실제 크기 일치(±1KB) 검증 후 rename. 불일치 시 `.part` 삭제하고 에러
- `isModelDownloaded`: 존재 검사에서 → 존재 && 레지스트리/쿼리 `expectedSize` 대비 크기 검증으로 강화. 크기 미일치 파일은 삭제 후 false
- `downloadModel` 시작 시 같은 모델의 고아 `.part` 정리
- `listDownloadedModels`가 `.part`를 `.gguf`로 오집계하지 않도록 필터 유지 확인

#### 2. 모바일 다운로더 테스트
**파일**: `apps/mobile/src/features/ai/model-manager/model-downloader.test.ts`(신규/확장)
**변경사항**: 부분 파일 → isModelDownloaded false, 완성 파일 → true, 취소 → `.part` 제거 케이스. RNBlobUtil mock은 기존 setup.ts 패턴 활용.

#### 3. 배너 재시도
**파일**: `apps/mobile/src/components/settings/GlobalModelDownloadBanner.tsx` + `local-llm.download.ts`
**변경사항**: `downloadStatus === 'error'` 브랜치(134-137행)에서 실패한 모델 재다운로드. 실패 모델 정보는 스토어 `availableModels`에서 `downloadError`가 설정된 모델(`applyToModel`이 `downloadingModelId`에 기록)로 복원. 재시도 버튼 UI는 기존 배너 액션 스타일 재사용.

#### 4. 데스크톱 download-failed 이벤트
**파일**: `packages/bridge-rust/src/events.rs`, `apps/desktop/src-tauri/src/download.rs`, `commands.rs`
**변경사항**:
- events.rs에 `DOWNLOAD_FAILED_EVENT = "model:download-failed"` + `emit_model_download_failed(model_id, error)` 추가(payload: `{modelId, error}`)
- download.rs의 모든 실패 return 경로(6곳)에서 emit 후 cleanup — 헬퍼 `fail(msg)` 클로저로 중복 제거
- 프론트 타입/리스너: `use-model-management.ts`에 `rustra://model:download-failed` 리스너 추가 → 해당 modelId 진행 항목 제거 + 오류 상태 기록

#### 5. 진행 이벤트 쓰로틀
**파일**: `apps/desktop/src-tauri/src/download.rs`
**변경사항**: 마지막 emit 시각 기록(Instant), 100ms 미만 경과 + percentage 변화 < 1pct면 skip. 완료 직전 마지막 emit은 보장.

#### 6. 동시성/삭제 가드
**파일**: `apps/desktop/src-tauri/src/state.rs`, `commands.rs`
**변경사항**:
- `mark_model_downloading`: 이미 `downloading` 상태면 Err("already downloading") 반환
- `delete_model`(state.rs): `downloading` 상태 모델 삭제 거부(Err) — commands.rs의 delete_model은 이 Err를 그대로 전달
- `mark_model_download_failed`(state.rs:114-124): `let _ = error` 제거 → `model.download_error = Some(error.to_string())` 저장. `ManagedModelRecord`에 `download_error: Option<String>` 필드 추가(serde camelCase `downloadError`, 기본 None 직렬화)

#### 7. 시작 시 stale tmp 정리
**파일**: `apps/desktop/src-tauri/src/download.rs`(fn `cleanup_stale_tmp`), `state.rs from_defaults`
**변경사항**: models_dir의 `*.gguf.tmp` 전부 제거(부팅 시 1회).

#### 8. Rust 테스트
**파일**: `apps/desktop/src-tauri/tests/download_events.rs`(신규) 또는 llm_stream_events.rs 확장
**변경사항**: download-failed 이벤트 채널명/payload 검증(기존 싱크 설치 패턴 재사용), stale tmp 정리 단위 테스트, mark_model_downloading 가드 테스트. 크레이트 내 `#[cfg(test)]`로 state 가드 테스트.

### 성공 기준:

#### 자동 검증:
- [ ] `cargo test --workspace` 통과(신규 Rust 테스트 포함)
- [ ] `bun test` 모바일 다운로더 테스트 통과
- [ ] `cargo clippy --workspace -- -D warnings` 통과

#### 수동 검증:
- [ ] 데스크톱에서 모델 다운로드 실패(오프라인) 시 진행바가 갇히지 않고 오류 표시

---

## Phase C: 상태 오염·레이스 수정

### 개요
queue_depth 잔존, load_model 롤백, 채팅 이중 저장, ReviewDeck 에러, 진행 맵 잔존, labeling 부분 완료, panic 패턴.

### 필요한 변경사항:

#### 1. queue_depth 복원 (Rust)
**파일**: `apps/desktop/src-tauri/src/state.rs`
**변경사항**: `run_completion`(235-275), `run_completion_stream`(277-324)에서 engine 작업을 `let result = ...;`로 받은 뒤 성공 시에만 응답 구성, 실패 path에서도 `health.queue_depth = 0` 복원 후 Err 반환. 구조: 초기 `queue_depth=1` 설정 → drop(health) → engine 호출을 inner fn/블록으로 → 결과 매칭에서 양쪽 path queue_depth=0.

#### 2. load_model 롤백 (Rust)
**파일**: `apps/desktop/src-tauri/src/state.rs:145-196`
**변경사항**: engine 로드를 먼저 시도하고 성공 후 status를 "active"로 전환하도록 순서 변경:
```rust
let model_path = ...; // models 락 내 읽기만
{
    let mut engine = self.llm_engine.lock()...;
    if let Err(e) = engine.load_model(&model_path) { return Err(e); } // status 미변경
}
// 성공 후 models 락 재획득해 status 전환
```
(락 순서 models→engine 유지: engine 로드 성공 후 models 락 재획득은 기존 순서 위반 없음 — models 락을 먼저 drop하고 engine, 다시 models)

#### 3. 채팅 이중 저장 가드 (모바일)
**파일**: `apps/mobile/src/hooks/chat/useChat.ts`, `chatGeneration.ts`
**변경사항**: `useChat`에 `generationSeqRef = useRef(0)`. sendMessage 진입 시 `++generationSeqRef.current`, 로컬 캡처. `generateAssistantReply`에 `isCurrent: () => seq === generationSeqRef.current` 전달 — assistant 저장 직전 `isCurrent()` false면 저장 스킵(abort가 이미 저장했음). `abortAndSave`에서도 `++generationSeqRef.current`로 동시 저장 차단. 에러 path 부분 저장: sendMessage catch에서 `streamingTextRef.current`가 있으면 부분 저장 시도(기존 abort와 동일 로직 재사용).

#### 4. 채팅 레이스 테스트
**파일**: `apps/mobile/src/hooks/chat/chatGeneration.test.ts`(신규/확장)
**변경사항**: abort 후 완료 resolve 시 assistant 저장 1회만 발생 검증.

#### 5. ReviewDeck 에러 처리 (데스크톱)
**파일**: `apps/desktop/src/app/_authenticated/review.tsx`, `apps/desktop/src/components/review/ReviewDeck.tsx`
**변경사항**:
- review.tsx: `useDueItemsQuery`의 `isError` 분기 추가(재시도 버튼), `markAsReviewed`/`postponeReview` 뮤테이션에 `onError` — 토스트/인라인 에러 표시 + `onSettled`에서 쿼리 무효화 확인
- ReviewDeck: `onRemembered`/`onPostponed`을 await 가능하게 개편 — 핸들러가 실패를 나타내면(뮤테이션 onError에서 설정한 플래그 또는 반환값) `advance()`하지 않음. 구현: 뮤테이션을 `mutateAsync`로 전환해 `await` 후 성공 시에만 advance, 실패 시 카드 유지 + 에러 배너

#### 6. 진행 맵 정리 + onError (데스크톱)
**파일**: `apps/desktop/src/features/local-llm/use-model-management.ts`
**변경사항**:
- `useDownloadProgress`에 `rustra://model:download-done`/`-failed` 리스너 추가 → done이면 해당 modelId progress 삭제, failed면 삭제+에러 맵 기록
- unlisten 레이스: `let disposed = false`, 클린업에서 `disposed=true`, listen resolve 시 `disposed`면 즉시 `fn()`
- `useDownloadModel`/`useDeleteModel`/`useLoadModel`/`useUnloadModel`에 `onError` 추가(에러 상태 노출용 콜백 prop 또는 내부 toast 상태)

#### 7. labeling 부분 완료 (데스크톱)
**파일**: `apps/desktop/src/features/labeling/run-foreground-labeling.ts`
**변경사항**: `Promise.all` → `Promise.allSettled`. fulfilled만 processedCount 계산. rejected 아이템은 id별 `updateKnowledgeItem(id, { labelStatus: 'failed', labelError: message })` 기록(별도 best-effort). 결과 `LabelingJobRunResult`에 `failedCount` 추가(타입 `types.ts` 동기). 기존 테스트 파일(runForegroundLabeling.test.ts가 mobile이 아닌 desktop에도 있는지 확인 — mobile에 있음 `apps/mobile/src/features/labeling/runForegroundLabeling.test.ts`… desktop 라벨링 파일의 테스트는 `apps/desktop`에 없으므로 신규 작성).

#### 8. commands.rs panic 제거 (Rust)
**파일**: `apps/desktop/src-tauri/src/commands.rs:14-20, 105-109`
**변경사항**: `list_managed_models`/`get_runtime_health`를 `Result<Vec<ManagedModelRecord>, String>` / `Result<RuntimeHealth, String>` 반환으로 변경. runtime_service가 Err를 반환하면 그대로 전달. 프론트 invoke 소비(use-model-management.ts:67, desktop-llm-service.ts TauriBridge)는 Result 여도 reject path로 동일 처리됨.

### 성공 기준:

#### 자동 검증:
- [ ] `cargo test --workspace` + `bun test` 통과(신규 테스트 포함)
- [ ] `bun run typecheck` 통과(Result 시그니처 변경 반영)

---

## Phase D: 보안·설정 정합

### 개요
데스크톱 API 키 키체인 저장, 스킴 통일, BYOK 에러 매핑, 설정 파싱 키 보존.

### 필요한 변경사항:

#### 1. 데스크톱 키 키체인 저장
**파일**: `apps/desktop/src/lib/settings-storage.ts`, `apps/desktop/src-tauri/Cargo.toml`, `apps/desktop/src-tauri/src/lib.rs`(또는 신규 `secrets.rs`), `apps/desktop/src-tauri/src/main.rs`
**변경사항**:
- Cargo.toml에 `keyring = "3"` 추가
- 신규 Tauri 커맨드 `get_secret(service="glimpse-byok", account=provider)` / `set_secret` / `delete_secret` — keyring Entry 생성/조회/설정/삭제
- settings-storage.ts: `apiKey`는 localStorage에 저장하지 않음(빈 문자열로 저장). `loadSettings`는 sync 시그니처 유지를 위해 키는 별도 비동기 `loadApiKey()`로 제공, 저장 시 `saveSettings`가 `set_secret` invoke(웹 프리뷰 환경 폴백: `__TAURI_INTERNALS__` 없으면 종전 localStorage 동작 유지)
- 마이그레이션: loadSettings에서 레거시 localStorage에 apiKey가 있으면 `set_secret`으로 이관 후 localStorage에서 제거(최초 1회)
- 소비자(router.ts, byok-provider.ts)의 `loadSettings().byok.apiKey` 참조를 `await loadApiKey()` 조합으로 전환 — `isAvailable`/`complete`는 이미 async이므로 호출점 수정 최소화
- bridge 재생성 필요: `bun run bridge:generate`

#### 2. 키 저장 테스트
**파일**: `apps/desktop/src/lib/settings-storage.test.ts`(환경 제약 시 로직 분리 후 단위 테스트)
**변경사항**: localStorage에 apiKey 미포함 저장, 마이그레이션 이관 로직(mock invoke) 검증.

#### 3. 스킴 통일 + 매니페스트 중복 제거
**파일**: `apps/mobile/app.json:8`, `apps/mobile/android/app/src/main/AndroidManifest.xml`
**변경사항**: app.json `"scheme": "glimpse"` → `"ll3.kr"`. AndroidManifest의 SEND intent-filter 3개 중 2개 제거(1개 유지). 루트 `eas.json` 삭제(중복).

#### 4. BYOK 에러 매핑 + provider 정합
**파일**: `apps/desktop/src/features/ai/providers/byok-provider.ts`, `apps/desktop/src/lib/settings-storage.ts`, `apps/desktop/src/components/settings/BYOKSection.tsx`
**변경사항**:
- `complete`의 `!response.ok`(249-255행): 상태별 코드 매핑 — 401/403 → `AI_PROVIDER_UNAUTHORIZED`(신규 코드, 타입에 추가), 429 → `AI_PROVIDER_RATE_LIMITED`, 기타 → `AI_PROVIDER_INVALID_RESPONSE`. `response.json()` 파싱 try/catch로 에러 메시지에 body 포함 시도
- `settings-storage.ts`의 provider 타입을 `byok-provider.ts`의 `BYOKProviderType`('openai'|'deepseek'|'anthropic'|'google'|'custom')로 확장 — 단일 소스는 byok-provider의 type을 import해 재사용
- BYOKSection PROVIDER_OPTIONS에 anthropic/google 항목 추가(baseUrl 빈 값 → 각 resolveEndpoint 기본값 사용)
- 스트리밍 `catch { return null }`(394-396행): catch에서 에러를 logger.warn 기록 후 null 반환(원인 유실 방지 최소 조치)

#### 5. Test Connection 구현
**파일**: `apps/desktop/src/components/settings/BYOKSection.tsx`
**변경사항**: `handleTestConnection`이 `createBYOKProvider({ provider, apiKey, baseUrl, model })`의 `complete({ prompt: 'ping', maxTokens: 1 })`를 호출해 성공/실패 토스트. (P3에서 P2로 격상 — 구현 비용 낮고 "Not implemented" 사용자 노출 제거)

### 성공 기준:

#### 자동 검증:
- [ ] `cargo test --workspace` + clippy 통과(keyring 커맨드 컴파일)
- [ ] `bun run bridge:generate` 후 `bun run typecheck` + `bun test` 통과
- [ ] grep으로 localStorage 저장 분기에 apiKey 미포함 확인

#### 수동 검증:
- [ ] 데스크톱 설정에서 키 입력 → 앱 재시작 후 키 유지(keychain), localStorage에 키 부재

---

## Phase E: 완성도 정리

### 개요
버전 정렬, 네이밍, 레지스트리 단일화, 잔여 소스 이슈.

### 필요한 변경사항:

#### 1. npm `@rustra/*` 0.1.2 범프
**파일**: `apps/mobile/package.json:49-50`, `apps/desktop/package.json:13-14`
**변경사항**: `0.1.1` → `0.1.2`(세 패키지). `bun install`로 lock 갱신. 0.1.2의 `.d.ts`에 `subscribeEvent` 존재(조사 확인) — 모바일은 여전히 로컬 허브 사용이지만 타입 계약이 Rust =0.1.2와 정렬됨.

#### 2. `nitroModuleError` 리네임
**파일**: `apps/mobile/src/lib/effect-result.ts:73`, `effect-result.test.ts`
**변경사항**: `nitroModuleError` → `nativeModuleError`(Nitro는 삭제된 아키텍처). 내부 코드 스트링이 있으면 `NITRO_*` → `NATIVE_*` 동시 변경. 사용처는 정의+테스트뿐(조사 확인).

#### 3. TS 모델 레지스트리 단일화
**파일**: `apps/desktop/src/features/local-llm/desktop-llm-service.ts:142-203`
**변경사항**: `DEFAULT_MODELS` 하드코딩 4개 제거 → shared `getDesktopModels()`를 `ManagedModelRecord` 모양으로 매핑하는 `toManagedRecord(def: LocalModelDefinition)` 헬퍼로 생성(status 'not_downloaded' 초기화, path null). 필드명 대응: sizeBytes→size, capabilities 포함 supportsEmbedding 파생(capabilities에 'embedding' 포함 여부). `createStaticDesktopLLMService`와 overview(304행)의 DEFAULT_MODELS 참조를 생성 함수로 교체. Rust `default_models()`와의 17개 정합은 유지 기존대로 수동 동기(코멘트 유지) — 이번엔 TS 측 중복 제거가 목적.

#### 4. 잔여 소스 이슈
**파일**: 각각
**변경사항**:
- `apps/mobile/src/components/capture/ScreenshotForm.tsx:67-82`: OCR 스텁 텍스트가 저장되지 않도록 — `onChangeExtractedText(stubText)` 대신 안내 텍스트를 별도 상태로 표시하고 `extractedText`는 빈 값 유지(사용자가 수동 입력한 텍스트만 저장). "OCR 미지원" 배지 UI 추가
- `apps/desktop/src/features/ai/providers/byok-provider.ts:7`: 낡은 TODO 주석 삭제(구현 존재)
- `apps/desktop/src/components/capture/CaptureModal.tsx`: 저장 진행 중 백드롭/X 닫힘 차단 — `saveMutation.isPending || metadataMutation.isPending`일 때 `handleClose`/`handleBackdropClick` no-op
- `apps/mobile/src/hooks/chat/useChatAISetup.ts:95-109`: `initialize`에 catch 추가(오류 시 `setShowDialog(true)` + 로깅)해 unhandled rejection 제거
- `apps/desktop/src-tauri/Cargo.toml:15`: `llama-cpp-2`에 `rev = "bed81ad4ab1a6c904b11d425608e50f976d8ea62"` 추가(Cargo.lock 현재 rev 고정 — branch 지정 제거)
- `apps/mobile/docs/rustra-bridge-development.md:40`: "connected via stream-events.ts and subscribeEvent" → "stream-events.ts 로컬 허브로 계약 정렬(네이티브 subscribeEvent는 후속)"으로 정정

### 성공 기준:

#### 자동 검증:
- [ ] `bun install` 후 `bun test` + typecheck 통과
- [ ] grep `nitroModuleError` 0건
- [ ] `cargo clippy` 통과

---

## Phase F: 문서 정리

### 개요
README/가이드/설계문서를 현재 아키텍처와 정합.

### 필요한 변경사항:

#### 1. README Nitro 잔존 제거
**파일**: `README.md`
**변경사항**: L3 "typed Nitro bridge" → rustra bridge 서술, L56 mermaid `FFI (Nitro)` → `rustra bridge`, L70 스택 라인 갱신, L119-120 `cpp/`·`nitrogen/generated/` 항목 삭제(디렉토리 부재), L260 English Summary 갱신, 워크스페이스 목록(L31-37)/mermaid에 `packages/bridge-rust` 추가.

#### 2. ui-style-guide 정합
**파일**: `docs/ui-style-guide.md`
**변경사항**: 문서 상단에 "상세 규격은 DESIGN.md가 우선" 고지 + typography 규격 충돌(Section Header) DESIGN.md 기준으로 수정 + `global.css` → `packages/ui/styles/globals.css` 경로 정정. 중복 색상 테이블은 DESIGN.md 링크로 대체 축소.

#### 3. rustra 설계문서 갱신
**파일**: `docs/plans/2026-08-16-rustra-integration-design.md:221-223`
**변경사항**: "남겨둔 것"에서 이미 완료된 path 원복/0.1.2 게시 제거(Phase 0의 WIP 커밋에 이미 반영된 상태면 skip). 뮤텍스 오염 재평가 노트 추가: 현재 rustra dispatch가 모델 상태 락 밖에서 실행되는 구조 확인 결과를 명시(또는 "미해결, 후속"으로 명시적 잔존). npm 0.1.2 범프 완료 항목 추가.

#### 4. 기타 문서
**파일**: `docs/plans/2026-02-16-mvp0-10min-worklog.md`
**변경사항**: "Status: In Progress" → "Complete" 라벨 수정.
**파일**: `thoughts/shared/plans/`, `thoughts/shared/research/` 2026-03산 문서들
**변경사항**: 각 파일 상단에 "⚠️ 역사 문서 — Nitro 아키텍처 기반, 2026-08 rustra 전환으로 무효" 배너 1줄 추가(내용 수정 없음).

### 성공 기준:

#### 자동 검증:
- [ ] grep -i nitro README.md 결과에서 현재 아키텍처 오기술 없음(역사 언급 제외)
- [ ] `bun run lint` 통과

---

## 테스트 전략

### 단위 테스트:
- 라우트 컨벤션 스캔(A), 코어 재시도(A), 다운로더 취소/`.part`(A/B), 채팅 이중 저장(C), labeling allSettled(C), 설정 마이그레이션(D), events.rs download-failed 채널(B)

### 통합 테스트:
- Rust: download-failed 이벤트 emit(싱크 설치 패턴), state 가드(다운로드 중 delete 거부), queue_depth 복원
- TS: downloadLocalModel→cancel→재시도 흐름(mock RNBlobUtil)

### 수동 테스트 단계:
1. iOS 시뮬레이터 부팅(`bun run ios`) — 라우트 크래시 없음, 코어 실패 시 재시도 동작(의도적 실패는 어려우므로 코드 경로 리뷰로 대체 가능)
2. 데스크톱 모델 다운로드 중 네트워크 차단 — 진행바 갇힘 없이 오류 표시
3. 데스크톱 BYOK 키 저장 후 재시작 — 키 유지, localStorage에 키 부재(DevTools 확인)
4. 리뷰 화면에서 DB 실패 시뮬레이션(오프라인) — 카드가 넘어가지 않고 오류 표시

## 성능 고려사항

- 진행 이벤트 쓰로틀(100ms/1%)로 웹뷰 이벤트 폭주 완화 — 수 GB GGUF에서 청크당 emit 대비 ~1000배 감소
- keyring 조회는 async 1회 캐시로 라우터 호출마다 OS 호출하지 않도록 함

## 마이그레이션 참고사항

- localStorage apiKey → keychain: 최초 loadSettings 감지 시 자동 이관, 실패해도 기존 localStorage 값 유지(다음 기회 재시도) — 키 손실 경로 없음
- `.part` 패턴 도입 시 기존 잘못 다운로드된 부분 .gguf 파일: 크기 검증에서 실패 처리되어 재다운로드 유도(자동 삭제)
- `@rustra/*` 0.1.2 범프: 사용 중인 API(0.1.1 호환)는 변경 없음을 조사에서 확인

## 참고 자료

- SPEC: `thoughts/shared/specs/2026-08-18_stabilization-program.md`
- 리서치: `thoughts/shared/research/2026-08-18_23-15-53_stabilization-backlog.md`
- rustra 브릿지 개발 가이드: `apps/mobile/docs/rustra-bridge-development.md`
- 이벤트 계약: `packages/bridge-rust/src/events.rs`
