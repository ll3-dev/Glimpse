---
date: 2026-08-19T00:37:04+09:00
researcher: Claude Code (research_codebase)
git_commit: 28d0fd337ee25b8ddc5b5a5eff14ff1bca37bec1
branch: main
repository: Glimpse
topic: "안정화 프로그램 완료 후 남은 작업·안정화 항목 전수 조사"
tags: [research, codebase, stabilization, rustra, desktop, mobile, release, roadmap]
status: complete
last_updated: 2026-08-19
last_updated_by: Claude Code
---

# 리서치: 안정화 프로그램 완료 후 남은 작업·안정화 항목 전수 조사

**날짜**: 2026-08-19T00:37:04+09:00
**연구자**: Claude Code (research_codebase)
**Git Commit**: 28d0fd337ee25b8ddc5b5a5eff14ff1bca37bec1 (main)
**Branch**: main — `origin/main`(c58254c) 대비 **15커밋 미푸시**
**Repository**: Glimpse

## 연구 질문

2026-08-18~19 안정화 프로그램(Phase 0~F, 16커밋) 완료 후 현재 프로젝트에서 무엇을 더 해야 하고, 무엇을 안정화해야 하는지 전수 조사.

## 요약

안정화 프로그램이 기록대로 완료되어 있었다(15개 수정 항목 전부 커밋 확인). 남은 작업은 **①즉시 사용자 액션(push·자격증명·GUI 검증), ②차기 안정화 라운드 후보(신규 발견 9건), ③아키텍처 후속(JSI 이벤트 배선·rkyvV2·contractHash), ④제품 로드맵 열린 질문**의 4계층으로 정리된다. 가장 중요한 새 발견: (a) rustra 상류에서 `feat/event-sink`가 main에 머지되어 모바일 JSI 네이티브 배선의 상류 준비가 완료됨 + `feat(rn): JSI 이벤트 콜백(onEvent/offEvent + FFI 싱크 등록)`이 이미 rustra main에 존재 — 배움: Glimpse 측 C++ 구현만 하면 됨. (b) 데스크톱 `llm` feature가 기본 off여서 배포 빌드가 항상 스텁 엔진으로 동작. (c) 데스크톱 다운로드에 취소/재개/체크섬이 전무(모바일과 비대칭). (d) 모바일 BYOK 키 하이드레이션 레이스가 여전히 열려 있음.

## 상세 분석

### 1. 저장소 상태 (기준선)

- 게이트는 최종 통과 상태: lint/typecheck/bun test 501 pass/cargo test/clippy ✅ (계획 문서 기록)
- `git status` 클린, 단 **15커밋 미푸시** (`322b3e6..28d0fd3`)
- `.github/workflows` 부재 — **CI 없음** (게이트는 로컬 수동 실행)
- i18n 프레임워크 없음, Sentry/크래시 리포트 없음
- 테스트 스킵(it.skip/test.todo/#[ignore]/.only) 전 코드베이스 0건

### 2. 즉시 사용자 액션 (외부 의존)

| # | 항목 | 근거 |
|---|---|---|
| 1 | `git push` — 15커밋 로컬 대기 | `git log origin/main..HEAD` = 15 |
| 2 | eas.json submit 실자격증명 | `apps/mobile/eas.json:35-37` `YOUR_APPLE_ID@example.com`/`YOUR_APP_STORE_CONNECT_ID`/`YOUR_TEAM_ID`, `:40` `google-service-account.json` 파일 부재 — submit 파이프라인 불능 |
| 3 | GUI 수동 검증 체크리스트 3종 16항목 전부 미실행 | 데스크톱 7(`docs/plans/2026-08-16-rustra-integration-design.md:133-139`), 모바일 6(`:171-176`), 스트리밍 3(`:205-207`) — "사용자 GUI 검증이 진행되지 않았다" 명시. integration-plan.md L403-409에 중복 체크박스(진실 소스 불명확) |
| 4 | Android `expo prebuild` 재실행 시 SEND intent-filter 중복 재발 여부 확인 | `app.json:59-62` androidIntentFilters + 현재 매니페스트 1개(`AndroidManifest.xml:30-35`) — 빌드 실행 전 확인 불가 |
| 5 | iOS ShareExtension 실기기 동작 확인 | app-group `group.kr.ll3.glimpse`, 실기기 빌드 필요 |

### 3. 신규 발견 안정화 이슈 — 차기 라운드 후보

#### 높음

1. **모바일 BYOK 키 하이드레이션 레이스** — `apps/mobile/src/stores/settings/byok.store.ts:74-75` `void hydrateBYOKSecureKey()` fire-and-forget. SecureStore 마이그레이션 후 초기 스냅샷은 `apiKey: null`(`:32`)이라 콜드스타트 직후 채팅 전송 시 `executors.ts:162-172`에서 "설정 미완성" 거부. `:69-71` catch가 silent. 게이트 없음(`init.ts` 대기 없음, 유일 호출자가 자기 자신).
2. **데스크톱 다운로드 취소/재개/체크섬 전무** — `apps/desktop/src-tauri/src/download.rs:91-176`에 cancel/abort/Range/hash 0건. `File::create` truncate 재시작, 서버 조기 종료 시 부분 파일이 `status="ready"`로 rename(수신 바이트 vs total_bytes 비교 부재). 모바일 Phase B `.part`+크기검증과 비대칭.
3. **데스크톱 `llm` feature 기본 off → 배포 빌드 항상 스텁 엔진** — `apps/desktop/src-tauri/Cargo.toml:29-31` `default = []`. 활성화 지점이 스크립트/CI/문서 어디에도 없음. 스텁 `completion()`이 `[stub] LLM response...`를 **성공 응답**으로 반환(`engine.rs:271-299`)하는데 UI는 "기기에서 직접 추론" 안내(`ModelManagerSection.tsx:193`) — 스텁 텍스트가 메타데이터로 저장될 수 있음.
4. **스텁 임베딩 영벡터** — `engine.rs:325-332` `Ok(vec![0.0; 768])`. 에러 아닌 성공으로 흘러 유사도/추천 조용한 오염 경로. 현재 프로덕션 호출자 없어 미발현이나 하이브리드 검색 연결 시 위험.

#### 중간

5. **모바일 메모리 경고/백그라운드 모델 언로드 리스너 없음** — AppState 리스너 3곳 모두 라벨링/공유 목적. `unloadModel()`(`llama-service.factory.ts:267`)은 모델 전환 시에만 호출. 백그라운드에서 수 GB GGUF 상주 → iOS jetsam 크래시 리스크. `increased-memory-limit` 엔타이틀먼트만 존재.
6. **스텁 엔진 UTF-8 바이트 슬라이싱 panic** — `engine.rs:295,313` `&prompt[..min(50)]` — 한국어 프롬프트 문자 경계 잘림 시 panic.
7. **temperature/top_p 하드코딩 + 폐기** — `engine.rs:87-90,170-172` `dist_default_seed()` 고정(TODO 주석). `CompletionRequest.temperature`(Rust `models.rs:58`)이 `state.rs:278,334`에서 폐기되고 `max_tokens`만 추출 — 프론트가 보내도 무시됨.
8. **n_ctx 미설정** — `engine.rs:55,140` `LlamaContextParams::default()`(llama.cpp 기본 512) — 262k 컨텍스트 광고 모델도 수백 토큰에서 "Prompt exceeds context length" 실패. `model.context_length` 미전달.
9. **BYOK 요청 파라미터 무시 + 스트리밍 에러 매핑 부재** — `byok-provider.ts:51-52,84-134` `max_tokens:150, temperature:0.3` 하드코딩. 스트리밍 `!response.ok` 시 `return null`(`:397`) → 429여도 조용히 재요청(레이트 리밋 2배 소모).
10. **레거시 localStorage API 키 미삭제** — `apps/desktop/src/lib/settings-storage.ts:104,41` 마이그레이션이 `LEGACY_SETTINGS_KEY`를 removeItem하지 않음 — 평문 키가 마이그레이션 후에도 잔존.
11. **ReviewCard 저장 중 버튼 미비활성화** — `ReviewCard.tsx:91-110` `saving` 미전달, 연타 시 DB 이중 write + 카드 1장 스킵.
12. **모델 관리 뮤테션 onError 부재(데스크톱)** — `use-model-management.ts:147-201` load/unload/delete 실패가 UI에 무음.

#### 낮음

13. **셋다운 핸들러 부재(데스크톱)** — `main.rs:13-76` ExitRequested 처리 없음 — 진행 중 다운로드 절단, SQLite graceful close 없음.
14. **`health.loaded_model_id` 오염** — `state.rs:262-263,318-319` 요청 model_id로 무조건 덮어씀.
15. **dead code** — `LLMSection.tsx`(미렌더링), `ScreenshotStub.tsx`/`ShareStub.tsx`(미참조 재export만) — 스펙은 "의도된 MVP 안내 UX 유지"로 결정했으나 실제로는 참조 없는 dead code.
16. **레지스트리 이중 소스** — Rust `models.rs:121-388`(16개) vs shared `LOCAL_MODEL_REGISTRY` — 현재 정합하나 수동 동기("Synced" 주석) 유지.
17. **`sync_download_status` 크기검증 없는 ready 판정** — `download.rs:258-285` 외부 .gguf 존재만으로 ready.
18. **서비스 인터페이스에 `onDownloadFailed` 부재** — `desktop-llm-service.ts:101-113` 실패가 use-model-management에만 연결.

### 4. rustra 통합 잔여 (아키텍처 후속)

**상류 상태(신규 확인, 외부 레포 API 조회):**
- `feat/event-sink`는 rustra main에 **머지 완료**(브랜치는 삭제됨)
- rustra main에 `feat(rn): JSI 이벤트 콜백 — onEvent/offEvent + FFI 싱크 등록, jsCallInvoker 마셜링` 커밋 존재
- 0.1.2 이후 `feat/production-hardening`+`feat/followup-hardening`도 머지: rkyv V2 크기 게이트, payload 한도 set/get, OTA schemaVersion 협상, `onContractMismatch` 폴백, `invokeTypedAsync` id 노출 + invokeBatch 항목별 취소
- npm `@rustra/*` latest = 0.1.2 (Glimpse 세 패키지 모두 0.1.2로 정렬 완료)
- Cargo `rustra = "=0.1.2"` 핀, rustra 0.1.2 크레이트에 `rustra_ffi_event_sink_register`/`unregister`(`ffi.rs:607,645`) 존재 — **네이티브 배선의 Rust 측 API는 이미 사용 가능**

**Glimpse 모바일 배선 현황(에이전트 검증):**
- 이벤트는 Rust→네이티브→JS로 흐르지 않고 **JS 내부 자체 발행/소비**: llama.rn JS 콜백 → `llama-service.factory.ts:173-181` handleToken → 로컬 `stream-events.ts:24-63` 허브 → 구독자. 데스크톱과 *계약*(채널/페이로드)만 정렬.
- `modules/rustra-jsi`: iOS `RustraJSIBridge.cpp:96-105` 5개 함수 등록(invoke/invokeJson/invokePostcardFFI/getSchema/getContractHash), **onEvent/offEvent 네이티브 구현 없음**. `hpp:10-27` FFI 선언에 이벤트 심볼 부재. Android JNI도 install 전달만. `src/index.ts:16-17` 타입 선언만.
- 설치된 `@rustra/react-native` 0.1.2의 `subscribeEvent` 존재(`index.d.ts:150`) — 네이티브 onEvent 부재 시 no-op 폴백.

**남은 단계(C++ 구현은 iOS/Android 공유 코드 1회):**
1. `RustraJSIBridge.hpp`에 event sink FFI 심볼 선언 추가
2. `RustraJSIBridge.cpp`에 `onEvent`/`offEvent` HostObject 함수 — `rustra_ffi_event_sink_register`로 C 콜백 등록, 큐+CallInvoker drain(Rust emit은 임의 스레드)
3. `stream-events.ts` `subscribeStreamEvent` 내부를 공식 `subscribeEvent(getRustraNative(), ...)`로 교체(시그니처 이미 호환)
4. Rust emit 경로 결정: 모바일 LLM은 llama.rn(JS 직접)이라 `model:download-*` 등 Rust 커맨드 경로가 1차 수혜자
5. 네이티브 미노출 폴백 정책(현행 로컬 허브를 폴백으로 남길지)
6. `rustra-bridge-development.md:40-42` 갱신

**기타 rustra 이월:**
- rkyvV2 fast path — 이월 사슬(2주차→3주차→안정화 "하지 않는 것") 끊겨 무기한 보류. 모바일은 JSON slow path만 사용
- contractHash 드리프트 검증 — `getContractHash?` 타입 선언만, 호출/구현 없음
- 뮤텍스 오염 재평가 — rustra 엔진 자체 오염 회복은 rustra 측 기능 필요해 미해결. 디자인 문서 리스크 표(L103)가 "3주차 재평가"로 미갱신
- TextDecoder Hermes 이슈 rustra 업스트림 제보 여부 미확인

### 5. 제품 기능 갭 (로드맵 관점)

- **OCR 미구현** — `ScreenshotForm.tsx:67-85` 스텁(1초 딜레이 후 빈 텍스트). 저장 차단은 완료. 로드맵 열린 질문 "스크린샷 OCR 로컬 처리를 어디까지"(vision L86)
- **하이라이트 채널** — vision L53 5채널 중 하이라이트 입력 채널 부재(캡처 폼 유형에 없음 확인)
- **주간 다이제스트** — `app/(tabs)/digest.tsx` 라우트와 recommendation 피처 존재(생성/피드백/cadence 조정 전부 구현됨)
- **추천 UX 형태/빈도, 멀티 디바이스 싱크** — vision L81-86 열린 질문으로 남음
- **모바일 BYOK Test Connection 없음** — 데스크톱은 구현(`BYOKSection.tsx:54-73`), 모바일은 저장/편집만

### 6. 문서 드리프트 (잔여)

- `docs/plans/2026-08-16-rustra-integration-design.md:83` `desktop-core-client.ts` 참조 — 1주차에 삭제된 파일
- 동 문서 `:103` 뮤텍스 "3주차 재평가" 미갱신, `:209` 4주차 헤딩 규격 불일치(`###` vs `##`)
- `2026-02-17-ai-provider-sdk-integration.md` "Status: Draft (Chunked v2)" 6개월 방치, `2026-03-26-effect-migration.md` 상태 라벨 부재
- GUI 검증 체크리스트가 디자인 문서와 integration-plan에 이중 기록 — 진실 소스 불명확

## 코드 참조

- `apps/mobile/src/stores/settings/byok.store.ts:32,69-71,74-75` — 하이드레이션 레이스, silent catch
- `apps/desktop/src-tauri/src/download.rs:91-176,258-285` — 취소/재개/체크섬 부재, ready 판정
- `apps/desktop/src-tauri/Cargo.toml:29-31` — `default = []` (llm feature off)
- `apps/desktop/src-tauri/src/llm/engine.rs:55,87-90,140,271-299,295,313,325-332` — 스텁 엔진 일체
- `apps/desktop/src-tauri/src/state.rs:262-263,278,318-319,334` — loaded_model_id 오염, temperature 폐기
- `apps/desktop/src-tauri/src/main.rs:13-76` — 셋다운 핸들러 부재
- `apps/desktop/src/features/ai/providers/byok-provider.ts:51-52,84-134,397` — 파라미터 하드코딩, 스트리밍 에러 폴백
- `apps/desktop/src/lib/settings-storage.ts:41,104` — 레거시 키 미삭제
- `apps/mobile/modules/rustra-jsi/ios/RustraJSIBridge.cpp:96-105` / `hpp:10-27` — 이벤트 FFI 부재
- `apps/mobile/src/features/ai/stream-events.ts:24-63` — 로컬 허브
- `apps/mobile/eas.json:35-40` — 자격증명 플레이스홀더
- `packages/bridge-rust/src/events.rs:41-58,93` — 이벤트 계약(완료 상태)

## 아키텍처 인사이트

- **"완성"의 사각지대가 이동했다**: 1차 조사(08-18)의 결함은 에러 경로·수명주기에 집중됐고, 안정화 후에도 같은 패턴의 잔여가 남는다(셋다운, 백그라운드 메모리, 하이드레이션 레이스). happy-path 중심 개발의 구조적 경향.
- **플랫폼 비대칭**: 같은 기능의 안정화 수준이 플랫폼마다 다름 — 다운로드 무결성(모바일 `.part`+크기검증 vs 데스크톱 전무), Test Connection(데스크톱만), 키 저장(양쪽 완료). 비대칭 자체가 백로그의 신뢰할 수 있는 소스.
- **스텁이 에러가 아니라 성공을 반환하는 구조가 근본 위험**: `[stub]` completion과 영벡터 임베딩 모두 `Ok` 반환 — 소비자가 구분 불가. feature 기본값과 결합해 "조용한 오염" 경로 형성.
- **상류(rustra)가 하류(Glimpse)를 기다리는 국면**: 네이티브 이벤트 배선에 필요한 상류 API(FFI 싱크, subscribeEvent, npm 0.1.2)는 전부 준비 완료 — 이제 Glimpse 측 C++ 구현만이 병목.
- **CI 부재가 릴리스 무결성의 구멍**: 게이트가 로컬 수동이라 `llm` feature off 배포, `--features llm` 누락 같은 실수를 잡는 장치가 없음.

## 우선순위 등급표 (종합)

**P0 — 즉시 (사용자 액션/차단 해제):**
1. `git push` (15커밋)
2. GUI 수동 검증 체크리스트 3종 실행 (16항목) — 특히 `llm` feature 빌드에서 스텁 응답 노출 여부 확인 포함
3. eas.json 자격증명 (출시 시점에)

**P1 — 차기 안정화 라운드 (데이터 무결성):**
4. 모바일 BYOK 하이드레이션 레이스 (게이트 도입)
5. 데스크톱 다운로드 취소/재개/체크섬 (모바일 패리티)
6. 스텁 엔진을 `Err` 반환으로 전환하거나 `llm` feature 활성화 방침 확정 (+UTF-8 panic, n_ctx, temperature 전달)
7. 레거시 localStorage 키 삭제, ReviewCard 디바운스, 뮤테션 onError

**P2 — 아키텍처 후속:**
8. 모바일 JSI 네이티브 이벤트 배선 (상류 준비 완료, Glimpse C++ 구현만 남음)
9. rustra 0.1.2→차기 버전 (production hardening: payload 한도, OTA 협상) 흡수 검토
10. 뮤텍스 오염 재평가(rustra 측), rkyvV2 fast path, contractHash
11. CI 도입 (게이트 자동화 — `llm` feature 매트릭스 포함)

**P3 — 완성도/제품:**
12. dead code 정리(LLMSection, ScreenshotStub/ShareStub — 스펙 결정 재검토)
13. 문서 드리프트 정리(디자인 문서 L83/L103/L209, 2026-02-17 상태 라벨)
14. 백그라운드 메모리 관리(AppState 언로드), pending-share 피드백(토스트 인프라)
15. OCR/하이라이트 채널/추천 UX 등 제품 로드맵 열린 질문
16. Sentry류 크래시 리포트 도입 결정

## 히스토리 컨텍스트 (thoughts/ 디렉토리)

- `thoughts/shared/research/2026-08-18_23-15-53_stabilization-backlog.md` — 1차 전수 조사(106파일 WIP 시점). 본 문서의 직전 상태
- `thoughts/shared/plans/2026-08-18_stabilization-program.md` — 안정화 프로그램 계획(완료 상태 기록, Phase 0~F)
- `thoughts/shared/specs/2026-08-18_stabilization-program.md` — 스펙. "하지 않는 것" 목록이 본 문서 P2/P3의 원천
- `thoughts/shared/inputs/glimpse-vision-mvp-roadmap.md:81-86` — 제품 열린 질문(모델 선정, 추천 UX, OCR 한계, 싱크)
- `thoughts/shared/plans/2026-03-25_packages-core-rust-integration.md` 외 — 2026-03산 Nitro 아키텍처 역사 문서(배너 추가됨)

## 관련 리서치

- `thoughts/shared/research/2026-08-18_23-15-53_stabilization-backlog.md` (전신)
- `docs/plans/2026-08-16-rustra-integration-design.md:221-226` — "남겨둔 것" (1차 소스)
- `docs/plans/2026-08-16-rustra-mobile-jsi-plan.md` — JSI 계획(Task 1-5 완료, fast path 이월)

## 미해결 질문

- 데스크톱 `llm` feature를 default로 올릴지, 스텁을 `Err`로 바꿀지, 빌드 스크립트에 `--features llm`을 넣을지 — 방침 결정 필요
- 출시(EAS 제출) 목표 시점 — 자격증명/크래시 리포트 우선순위 결정
- 모바일 폴백(in-memory storage) 데이터 유실 경로의 안내 UX — Expo Go 개발 폴백인지 사용자 도달 가능 경로인지
- rustra 차기 버전(production hardening 포함) 흡수 시점
- TextDecoder/Hermes 이슈의 rustra 업스트림 제보 여부
- GUI 체크리스트 이중 기록(디자인 문서 vs integration-plan)의 진실 소스 통합
